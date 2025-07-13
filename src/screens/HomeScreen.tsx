import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Platform,
  AppState,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { useStream } from '../contexts/StreamContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { supabase } from '../lib/supabase';
import { Task, UserProfile } from '../types/database';
import NotificationService, { 
  registerForPushNotifications, 
  sendPushNotificationToUser,
  sendSessionNotificationToStudent,
  setupNotificationChannels
} from '../lib/notifications';
import PresenceService from '../lib/presence';

export const HomeScreen: React.FC = () => {
  const { userProfile, signOut } = useAuth();
  const { 
    isDemoMode,
    initializeVideoCall,
    videoCall,
    startVideoCall,
  } = useStream();
  const { selectedStudent } = useCoachStudent();
  
  const [assignedCoach, setAssignedCoach] = useState<UserProfile | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [notificationChannel, setNotificationChannel] = useState<any>(null);


  useEffect(() => {
    if (userProfile) {
      loadData();
      setupNotifications();
      setupRealtimeNotifications();
    }
  }, [userProfile, selectedStudent]);

  // Separate effect for presence setup that depends on partner data being loaded
  useEffect(() => {
    if (userProfile && 
        ((userProfile.role === 'student' && assignedCoach) || 
         (userProfile.role === 'coach' && selectedStudent))) {
      setupPresence();
    }
  }, [userProfile, assignedCoach, selectedStudent]);

  // Handle app state changes for presence
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (userProfile) {
        PresenceService.handleAppStateChange(nextAppState, userProfile);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [userProfile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up presence tracking
      PresenceService.cleanupAll();
      
      // Clean up notification channel
      if (notificationChannel && supabase) {
        supabase.removeChannel(notificationChannel);
      }
    };
  }, []);

  const setupNotifications = async () => {
    try {
      console.log('📱 [HOME] Setting up notifications for user:', userProfile?.id);
      
      // Register for push notifications
      if (userProfile) {
        const pushToken = await registerForPushNotifications();
        
        console.log('📱 [HOME] Push token result:', pushToken ? 'received' : 'not received');
        
        // Save token to database if we got one
        if (pushToken && supabase) {
          try {
            console.log('📱 [HOME] Saving token to database...');
            console.log('📱 [HOME] User ID:', userProfile.id);
            console.log('📱 [HOME] Platform:', Platform.OS);
            console.log('📱 [HOME] Token preview:', `${pushToken.substring(0, 20)}...`);
            
            const { data, error } = await supabase
              .from('device_tokens')
              .upsert({
                user_id: userProfile.id,
                token: pushToken,
                platform: Platform.OS === 'android' ? 'android' : 'ios',
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,platform'
              });
            
            if (error) {
              console.error('❌ [HOME] Database error saving token:', error);
            } else {
              console.log('✅ [HOME] Push token saved to database successfully');
              console.log('✅ [HOME] Database response:', data);
            }
          } catch (dbError) {
            console.error('❌ [HOME] Exception saving token to database:', dbError);
          }
        } else {
          console.warn('⚠️ [HOME] No push token to save or no supabase client');
        }
      }
      
      // Set up notification listeners
      const cleanup = NotificationService.setupNotificationListeners();
      
      // Return cleanup function
      return cleanup;
    } catch (error) {
      console.error('❌ [HOME] Error setting up notifications:', error);
    }
  };

  const setupPresence = async () => {
    try {
      if (!userProfile) return;
      
      // Get partner ID based on user role
      const partnerId = userProfile.role === 'student' 
        ? assignedCoach?.id 
        : selectedStudent?.id;
      
      const partnerName = userProfile.role === 'student' 
        ? assignedCoach?.full_name 
        : selectedStudent?.full_name;
      
      if (!partnerId) {
        console.log('🟢 [PRESENCE] No partner found, skipping presence setup');
        return;
      }
      
      console.log('🟢 [PRESENCE] Setting up presence tracking with partner:', { partnerId, partnerName });
      
      // Clean up any existing presence tracking first
      PresenceService.cleanupAll();
      
      // Initialize presence tracking
      await PresenceService.initializePresence(
        userProfile.id,
        partnerId,
        userProfile,
        (isOnline: boolean) => {
          console.log('🟢 [PRESENCE] Partner online status changed:', { partnerId, partnerName, isOnline });
          setPartnerOnline(isOnline);
        }
      );
      
    } catch (error) {
      console.error('❌ [PRESENCE] Error setting up presence:', error);
    }
  };

  const setupRealtimeNotifications = async () => {
    try {
      if (!userProfile || !supabase) return;
      
      console.log('📡 [NOTIFICATIONS] Setting up real-time notification listening');
      
      // Clean up existing channel
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
      }
      
      // Create notification channel
      const channel = supabase
        .channel(`user-${userProfile.id}`)
        .on('broadcast', { event: 'new_notification' }, async (payload) => {
          try {
            console.log('📨 [NOTIFICATIONS] Real-time notification received:', payload);
            
            const { title, body, data } = payload.payload;
            
            console.log('📨 [NOTIFICATIONS] Processing notification:', {
              title,
              body,
              data,
              platform: Platform.OS,
              timestamp: new Date().toISOString()
            });
            
            // Debug: Check notification permissions on iOS
            if (Platform.OS === 'ios') {
              const { status } = await Notifications.getPermissionsAsync();
              console.log('📱 [iOS-DEBUG] Current notification permissions:', status);
            }
            
            // Use scheduleNotificationAsync with immediate trigger instead of deprecated presentNotificationAsync
            const notificationContent = {
              title: title || 'Bildirim',
              body: body || 'Yeni bildirim aldınız',
              data: data || {},
              // Set channel ID for Android
              ...(Platform.OS === 'android' && {
                channelId: data?.type === 'video_call_invite' ? 'calls' : 'default',
                priority: data?.type === 'video_call_invite' ? 'high' : 'default',
                color: data?.type === 'video_call_invite' ? '#10B981' : '#3B82F6',
              }),
              // iOS-specific settings
              ...(Platform.OS === 'ios' && {
                badge: 1,
                categoryIdentifier: data?.type === 'video_call_invite' ? 'video_call' : 'general',
              }),
            };
            
            console.log('📨 [NOTIFICATIONS] Scheduling notification with content:', notificationContent);
            
            Notifications.scheduleNotificationAsync({
              content: notificationContent,
              trigger: null, // Show immediately
            }).then(() => {
              console.log('✅ [NOTIFICATIONS] Real-time notification scheduled successfully');
            }).catch((error) => {
              console.error('❌ [NOTIFICATIONS] Error scheduling notification:', error);
            });
            
          } catch (error) {
            console.error('❌ [NOTIFICATIONS] Error handling real-time notification:', error);
          }
        })
        .subscribe((status) => {
          console.log('📡 [NOTIFICATIONS] Real-time channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ [NOTIFICATIONS] Successfully subscribed to real-time notifications');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [NOTIFICATIONS] Error subscribing to real-time notifications');
          }
        });
      
      setNotificationChannel(channel);
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error setting up real-time notifications:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }
      
      if (userProfile?.role === 'student') {
        await Promise.all([
          fetchAssignedCoach(),
          fetchUpcomingSessions()
        ]);
      } else if (userProfile?.role === 'coach' && selectedStudent) {
        await fetchUpcomingSessions();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const fetchAssignedCoach = async () => {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }

      // Get coach assignment
      const { data: assignment } = await supabase
        .from('coach_student_assignments')
        .select(`
          coach_id,
          coach:user_profiles!coach_student_assignments_coach_id_fkey(*)
        `)
        .eq('student_id', userProfile?.id)
        .eq('is_active', true)
        .single();

      if (assignment && assignment.coach) {
        setAssignedCoach(assignment.coach as unknown as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching assigned coach:', error);
    }
  };

  const fetchUpcomingSessions = async () => {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('task_type', 'coaching_session')
        .gte('scheduled_date', today)
        .lte('scheduled_date', oneWeekFromNow)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true });

      if (userProfile?.role === 'student') {
        query = query.eq('assigned_to', userProfile.id);
      } else if (userProfile?.role === 'coach' && selectedStudent) {
        query = query.eq('assigned_to', selectedStudent.id);
      }

      const { data: sessions } = await query;
      
      if (sessions) {
        setUpcomingSessions(sessions);
        
        // Schedule notifications for new sessions
        for (const session of sessions) {
          await NotificationService.scheduleSessionReminders(session);
        }
      }
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
    }
  };

  const handleJoinSession = async (session: Task) => {
    try {
      if (isDemoMode) {
        Alert.alert('Demo Mode', 'Video calling is disabled in demo mode. Please configure Stream.io API keys.');
        return;
      }

      // Check if session is ready to join (within 10 minutes of start time)
      const now = new Date();
      const sessionDate = new Date(session.scheduled_date!);
      const sessionTime = session.scheduled_start_time!;
      const [hours, minutes] = sessionTime.split(':').map(Number);
      sessionDate.setHours(hours, minutes, 0, 0);
      
      const timeDiff = sessionDate.getTime() - now.getTime();
      const minutesUntilSession = Math.floor(timeDiff / (1000 * 60));

      if (minutesUntilSession > 10) {
        Alert.alert(
          'Sesyon Henüz Başlamadı', 
          `Bu sesyon ${minutesUntilSession} dakika sonra başlayacak. 10 dakika öncesinden katılabilirsiniz.`
        );
        return;
      }

      if (minutesUntilSession < -60) {
        Alert.alert(
          'Sesyon Sona Erdi', 
          'Bu sesyon 1 saatten fazla süre önce sona ermiştir.'
        );
        return;
      }

      // Get the partner ID (coach or student)
      const partnerId = userProfile?.role === 'student' 
        ? session.assigned_by 
        : session.assigned_to;

      // Initialize video call
      const call = await initializeVideoCall(partnerId);
      if (call) {
        await startVideoCall(call);
        Alert.alert('Başarılı', 'Video görüşmeye katıldınız!');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      Alert.alert('Hata', 'Video görüşmeye katılırken bir hata oluştu.');
    }
  };

  const formatSessionTime = (session: Task) => {
    const date = new Date(session.scheduled_date!);
    const dateStr = date.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      weekday: 'long' 
    });
    
    if (session.scheduled_start_time) {
      const timeStr = session.scheduled_start_time.slice(0, 5);
      return `${dateStr} - ${timeStr}`;
    }
    
    return dateStr;
  };

  const getSessionStatus = (session: Task) => {
    const now = new Date();
    const sessionDate = new Date(session.scheduled_date!);
    const sessionTime = session.scheduled_start_time!;
    const [hours, minutes] = sessionTime.split(':').map(Number);
    sessionDate.setHours(hours, minutes, 0, 0);
    
    const timeDiff = sessionDate.getTime() - now.getTime();
    const minutesUntilSession = Math.floor(timeDiff / (1000 * 60));

    if (minutesUntilSession > 10) {
      return { text: `${minutesUntilSession} dk sonra`, color: '#6B7280', canJoin: false };
    } else if (minutesUntilSession >= -60) {
      return { text: 'Katılabilirsiniz', color: '#10B981', canJoin: true };
    } else {
      return { text: 'Sona erdi', color: '#EF4444', canJoin: false };
    }
  };

  const handleTestNotification = async () => {
    try {
      console.log('🔔 [TEST] Starting notification test...');
      
      // Check device token first
      const deviceToken = await registerForPushNotifications();
      console.log('📱 [DEBUG] Current device token:', deviceToken);
      
      if (deviceToken && supabase) {
        // Check if token is saved in database
        try {
          const { data: tokenData, error } = await supabase
            .from('device_tokens')
            .select('*')
            .eq('user_id', userProfile?.id)
            .eq('platform', Platform.OS === 'android' ? 'android' : 'ios');
          
          console.log('💾 [DEBUG] Saved tokens in database:', tokenData);
          if (error) console.error('❌ [DEBUG] Token query error:', error);
        } catch (dbError) {
          console.error('❌ [DEBUG] Database error:', dbError);
        }
      }
      
      // Show immediate local notification first using new method
      console.log('📨 [TEST] Scheduling local test notification...');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Test Bildirimi (Yerel)',
          body: 'Local notification sistemi çalışıyor! ✅',
          sound: 'default',
          data: {
            type: 'test_notification',
            timestamp: new Date().toISOString()
          },
          // Android-specific settings
          ...(Platform.OS === 'android' && {
            channelId: 'default',
            priority: 'default',
            vibrate: [0, 250, 250, 250],
            color: '#3B82F6',
          }),
        },
        trigger: null, // Show immediately
      });
      
      console.log('✅ [TEST] Local notification scheduled successfully');

      // Test cross-user notification if we have a partner
      const partnerId = userProfile?.role === 'student' 
        ? assignedCoach?.id 
        : selectedStudent?.id;
      
      const partnerName = userProfile?.role === 'student' 
        ? assignedCoach?.full_name 
        : selectedStudent?.full_name;

      if (partnerId && partnerName) {
        console.log(`📤 [TEST] Attempting to send cross-user notification to ${partnerName}`);
        
        const success = await sendPushNotificationToUser(
          partnerId,
          '🔔 Test Cross-User Bildirimi',
          `${userProfile?.full_name} size test bildirimi gönderdi`,
          {
            type: 'test_cross_user',
            senderId: userProfile?.id,
            senderName: userProfile?.full_name,
            timestamp: new Date().toISOString()
          }
        );

        if (success) {
          Alert.alert(
            'Test Bildirimleri Gönderildi',
            `✅ Local bildirim: Yukarıda görünmeli\n✅ Cross-user bildirim: ${partnerName} kullanıcısına gönderildi\n\nHer iki bildirim de çalışıyorsa sistem tamamen hazır!`
          );
        } else {
          Alert.alert(
            'Kısmi Başarı',
            `✅ Local bildirim: Çalışıyor\n❌ Cross-user bildirim: Backend API henüz kurulmamış\n\nBackend /api/notifications/send endpoint'ini kurmanız gerekiyor.`
          );
        }
      } else {
        Alert.alert(
          'Test Bildirimi Gönderildi',
          `✅ Local bildirim: Yukarıda görünmeli\n⚠️ Cross-user test: ${userProfile?.role === 'student' ? 'Koç atanmamış' : 'Öğrenci seçilmemiş'}\n\nLocal notification sistemi çalışıyor!`
        );
      }
    } catch (error) {
      console.error('❌ [TEST] Error sending test notification:', error);
      Alert.alert(
        'Test Bildirimi Hatası',
        'Test bildirimi gönderilemedi. Push notification izinlerini kontrol edin.'
      );
    }
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Merhaba,</Text>
            <Text style={styles.nameText}>{userProfile?.full_name}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>

        {/* Coach Info (for students) */}
        {userProfile?.role === 'student' && assignedCoach && (
          <View style={styles.coachCard}>
            <Text style={styles.cardTitle}>Koçunuz</Text>
            <Text style={styles.coachName}>{assignedCoach.full_name}</Text>
            <Text style={styles.coachEmail}>{assignedCoach.email}</Text>
          </View>
        )}

        {/* Selected Student Info (for coaches) */}
        {userProfile?.role === 'coach' && selectedStudent && (
          <View style={styles.studentCard}>
            <Text style={styles.cardTitle}>Seçili Öğrenci</Text>
            <Text style={styles.studentName}>{selectedStudent.full_name}</Text>
            <Text style={styles.studentEmail}>{selectedStudent.email}</Text>
          </View>
        )}

        {/* Partner Online Status */}
        {(assignedCoach || selectedStudent) && (
          <View style={styles.onlineStatusCard}>
            <Text style={styles.cardTitle}>
              {userProfile?.role === 'student' ? 'Koç Durumu' : 'Öğrenci Durumu'}
            </Text>
            <View style={styles.onlineStatusContainer}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: partnerOnline ? '#10B981' : '#EF4444' }
              ]} />
              <Text style={styles.statusText}>
                {partnerOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
              </Text>
            </View>
            <Text style={styles.partnerName}>
              {assignedCoach?.full_name || selectedStudent?.full_name || 'Bilinmiyor'}
            </Text>
          </View>
        )}



        {/* Upcoming Coaching Sessions */}
        <View style={styles.sessionsCard}>
          <Text style={styles.cardTitle}>Yaklaşan Koçluk Seansları</Text>
          
          {upcomingSessions.length === 0 ? (
            <Text style={styles.noSessionsText}>
              Yaklaşan koçluk seansınız bulunmuyor.
            </Text>
          ) : (
            upcomingSessions.map((session) => {
              const status = getSessionStatus(session);
              return (
                <View key={session.id} style={styles.sessionItem}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionTime}>
                      {formatSessionTime(session)}
                    </Text>
                    <Text style={[styles.sessionStatus, { color: status.color }]}>
                      {status.text}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      { 
                        backgroundColor: status.canJoin ? '#10B981' : '#6B7280',
                        opacity: status.canJoin ? 1 : 0.6 
                      }
                    ]}
                    onPress={() => handleJoinSession(session)}
                    disabled={!status.canJoin}
                  >
                    <Text style={styles.joinButtonText}>
                      {status.canJoin ? '📹 Katıl' : '⏰'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Demo Mode Warning */}
        {isDemoMode && (
          <View style={styles.demoCard}>
            <Text style={styles.demoTitle}>⚠️ Demo Modu</Text>
            <Text style={styles.demoText}>
              Video görüşme özelliği demo modunda devre dışıdır. 
              Stream.io API anahtarlarını yapılandırın.
            </Text>
          </View>
        )}

        {/* Notification Test */}
        <View style={styles.testCard}>
          <Text style={styles.testTitle}>🔔 Bildirim Testi</Text>
          <Text style={styles.testText}>
            Push notification sisteminin çalışıp çalışmadığını test edin.
          </Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNotification}
          >
            <Text style={styles.testButtonText}>📬 Test Bildirimi Gönder</Text>
          </TouchableOpacity>
        </View>

        {/* Active Call Indicator */}
        {videoCall && (
          <View style={styles.activeCallCard}>
            <Text style={styles.activeCallTitle}>🎥 Aktif Görüşme</Text>
            <Text style={styles.activeCallText}>
              Şu anda bir video görüşmesi içindesiniz.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 2,
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  signOutText: {
    color: '#FFF',
    fontWeight: '600',
  },
  coachCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  studentCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sessionsCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  coachEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  studentEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  noSessionsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sessionTime: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  sessionStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  joinButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  demoCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: '#92400E',
  },
  testCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  testText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  testButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  activeCallCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  activeCallTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 8,
  },
  activeCallText: {
    fontSize: 14,
    color: '#065F46',
  },
  onlineStatusCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  partnerName: {
    fontSize: 14,
    color: '#6B7280',
  },
}); 