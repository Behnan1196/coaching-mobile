import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { 
  Chat, 
  Channel, 
  MessageList, 
  MessageInput, 
  OverlayProvider 
} from 'stream-chat-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useStream } from '../contexts/StreamContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';
import { useActivityTracking } from '../hooks/useActivityTracking';

export const ChatScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  const { 
    chatClient,
    chatChannel,
    chatLoading,
    chatError, 
    isDemoMode,
    initializeChatChannel
  } = useStream();
  const [assignedCoach, setAssignedCoach] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatPartner, setChatPartner] = useState<UserProfile | null>(null);
  const [currentPartnerId, setCurrentPartnerId] = useState<string | null>(null);

  // Safety check to prevent crashes
  useEffect(() => {
    if (!userProfile) {
      console.log('⚠️ ChatScreen: User profile not available');
      return;
    }

    // Check if Stream Chat is properly initialized
    if (!isDemoMode && (!chatClient || !chatChannel)) {
      console.log('⚠️ ChatScreen: Stream Chat not properly initialized', {
        hasChatClient: !!chatClient,
        hasChatChannel: !!chatChannel,
        isDemoMode
      });
    }
  }, [userProfile, chatClient, chatChannel, isDemoMode]);

  // Check if this screen is focused
  const isFocused = useIsFocused();
  
  // Track user activity in chat screen - prevents notifications while user is viewing chat
  // Only track when screen is focused (active tab)
  useActivityTracking({
    userId: userProfile?.id || null,
    currentScreen: 'chat',
    isEnabled: !!userProfile && !isDemoMode && isFocused
  });

  // Clear activity when component unmounts or loses focus
  useEffect(() => {
    return () => {
      // Cleanup when leaving chat screen
      if (userProfile?.id && supabase && !isDemoMode) {
        console.log('🧹 ChatScreen unmounting, clearing activity');
        supabase
          .from('user_activity')
          .update({
            current_screen: null,
            last_activity_at: new Date().toISOString(),
          })
          .eq('user_id', userProfile.id)
          .then(() => console.log('✅ Activity cleared on ChatScreen unmount'))
          .catch((error) => console.warn('❌ Error clearing activity:', error));
      }
    };
  }, [userProfile?.id, isDemoMode]);

  // Track partner changes for debugging
  useEffect(() => {
    const newPartnerId = userProfile?.role === 'coach' ? selectedStudent?.id : assignedCoach?.id;
    if (currentPartnerId !== newPartnerId) {
      console.log('🔄 ChatScreen: Partner changed from', currentPartnerId, 'to', newPartnerId);
      setCurrentPartnerId(newPartnerId || null);
    }
  }, [selectedStudent?.id, assignedCoach?.id, currentPartnerId, userProfile?.role]);

  useEffect(() => {
    console.log('📱 ChatScreen: useEffect triggered', {
      userProfile: userProfile?.role,
      selectedStudent: selectedStudent?.full_name,
      assignedCoach: assignedCoach?.full_name
    });
    
    if (userProfile) {
      if (userProfile.role === 'student') {
        console.log('📱 ChatScreen: User is student, fetching assigned coach');
        fetchAssignedCoach();
      } else if (userProfile.role === 'coach') {
        console.log('📱 ChatScreen: User is coach, setting selected student as chat partner');
        setChatPartner(selectedStudent);
        setLoading(false);
      }
    }
  }, [userProfile, selectedStudent]);

  useEffect(() => {
    if (chatPartner && chatClient && !chatChannel && !chatLoading && !chatError && !isDemoMode) {
      initializeChatChannel(chatPartner.id, chatPartner.full_name).catch((error) => {
        console.error('Failed to initialize chat channel:', error);
      });
    }
  }, [chatPartner, chatClient, chatChannel, chatLoading, chatError, isDemoMode]);

  const fetchAssignedCoach = async () => {
    try {
      if (!supabase) {
        console.log('📱 ChatScreen: Supabase not available');
        return;
      }
      
      console.log('📱 ChatScreen: Fetching assigned coach for student:', userProfile?.id);
      
      // Use the same pattern as VideoCallTabScreen (which works)
      const { data: assignment, error } = await supabase
        .from('coach_student_assignments')
        .select(`
          coach_id,
          coach:user_profiles!coach_student_assignments_coach_id_fkey(*)
        `)
        .eq('student_id', userProfile?.id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('📱 ChatScreen: Error fetching assigned coach:', error);
        console.error('📱 ChatScreen: Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('📱 ChatScreen: Query result:', JSON.stringify(assignment, null, 2));
        if (assignment && assignment.coach) {
          const coach = assignment.coach as unknown as UserProfile;
          console.log('📱 ChatScreen: Found assigned coach:', coach.full_name);
          setAssignedCoach(coach);
          setChatPartner(coach);
        } else {
          console.log('📱 ChatScreen: No assigned coach found for student - assignment structure:', assignment);
        }
      }
    } catch (error) {
      console.error('📱 ChatScreen: Error fetching assigned coach:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || chatLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#249096" />
          <Text style={styles.loadingText}>
            {loading ? 'Yükleniyor...' : 'Sohbet hazırlanıyor...'}
          </Text>
        </View>
      </View>
    );
  }

  // Show error states
  if (chatError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ Sohbet bağlantısı hatası</Text>
          <Text style={styles.errorSubtext}>{chatError}</Text>
        </View>
      </View>
    );
  }

  // Show no partner state
  if (!chatPartner) {
    console.log('📱 ChatScreen: No chat partner found', {
      userRole: userProfile?.role,
      assignedCoach: assignedCoach?.full_name,
      selectedStudent: selectedStudent?.full_name,
      loading
    });
    
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            {userProfile?.role === 'student' 
              ? '👨‍🏫 Henüz size atanmış bir koç bulunmuyor' 
              : '👨‍🎓 Lütfen bir öğrenci seçin'}
          </Text>
          {/* Debug info in development */}
          {__DEV__ && (
            <Text style={styles.debugText}>
              Debug: Role={userProfile?.role}, AssignedCoach={assignedCoach?.full_name || 'null'}, Loading={loading.toString()}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Show demo mode state
  if (isDemoMode) {
    return (
      <View style={styles.container}>
        <View style={styles.demoContainer}>
          <Text style={styles.demoTitle}>🎭 Demo Modu</Text>
          <Text style={styles.demoText}>
            Sohbet özelliği demo modunda. Gerçek sohbet için lütfen Stream yapılandırmasını tamamlayın.
          </Text>
        </View>
      </View>
    );
  }

  // Show fallback when Stream Chat is not available
  if (!chatClient || !chatChannel) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💬 {chatPartner?.full_name || 'Chat'}</Text>
        </View>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>
            ⚠️ Chat sistemi henüz hazır değil
          </Text>
          <Text style={styles.fallbackSubtext}>
            Lütfen biraz bekleyin veya uygulamayı yeniden başlatın
          </Text>
        </View>
      </View>
    );
  }

  // Show chat interface if everything is ready
  if (chatPartner && chatClient && chatChannel) {
    // Debug: Log channel information
    console.log('📱 Chat interface rendering with channel:', chatChannel.id);
    console.log('📱 Channel message count:', chatChannel.state.messages.length);
    console.log('📱 Channel members:', chatChannel.state.members);
    
    // Additional safety check for Stream Chat readiness
    if (!chatClient.userID || !chatChannel.state.isUpToDate) {
      console.log('⚠️ Stream Chat not fully ready yet');
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>💬 {chatPartner.full_name}</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#249096" />
            <Text style={styles.loadingText}>
              Chat bağlantısı kuruluyor...
            </Text>
          </View>
        </View>
      );
    }
    
    try {
      // Validate Stream Chat components before rendering
      if (!chatClient || !chatChannel) {
        throw new Error('Stream Chat components not properly initialized');
      }

      return (
        <View style={styles.container}>
          <OverlayProvider>
            <Chat client={chatClient}>
              <Channel 
                channel={chatChannel}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 250 : 0}
                disableKeyboardCompatibleView={false}
              >
                <View style={styles.header}>
                  <Text style={styles.title}>💬 {chatPartner.full_name}</Text>
                </View>
                <MessageList />
                <MessageInput />
              </Channel>
            </Chat>
          </OverlayProvider>
        </View>
      );
    } catch (error) {
      console.error('Error rendering chat interface:', error);
      
      // Show user-friendly error instead of crashing
      Alert.alert(
        'Chat Error',
        'Chat interface could not be loaded. Please try again.',
        [{ text: 'OK' }]
      );
      
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>💬 {chatPartner.full_name}</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              ⚠️ Chat arayüzü yüklenirken hata oluştu
            </Text>
            <Text style={styles.errorSubtext}>
              Lütfen uygulamayı yeniden başlatın
            </Text>
          </View>
        </View>
      );
    }
  }

  // Show loading state for chat initialization
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 {chatPartner.full_name}</Text>
      </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#249096" />
        <Text style={styles.loadingText}>
          Chat hazırlanıyor...
        </Text>
      </View>
    </View>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  demoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FEF3C7',
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
  chatContainer: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FEE2E2', // A light red background for fallback
  },
  fallbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991B1B', // Darker red for text
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackSubtext: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    fontFamily: 'monospace',
  },
}); 