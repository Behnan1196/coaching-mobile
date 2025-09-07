import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useStream } from '../contexts/StreamContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';
import { VideoCallScreen } from './VideoCallScreen';
import { sendVideoInvite } from '../lib/notifications';


export const VideoCallTabScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  const { 
    initializeVideoCall, 
    videoCall, 
    videoLoading, 
    videoError, 
    isStreamReady,
    isDemoMode,
    endVideoCall,
    initializeChatChannel,
    chatChannel
  } = useStream();
  
  const [assignedCoach, setAssignedCoach] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callPartner, setCallPartner] = useState<UserProfile | null>(null);
  
  // Video invite state (inline form)
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.role === 'student') {
        fetchAssignedCoach();
      } else if (userProfile.role === 'coach') {
        setCallPartner(selectedStudent);
        setLoading(false);
      }
    }
  }, [userProfile, selectedStudent]);

  useEffect(() => {
    if (videoCall) {
      setShowVideoCall(true);
    }
  }, [videoCall]);

  const fetchAssignedCoach = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        console.log('Supabase not available');
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
        const coach = assignment.coach as unknown as UserProfile;
        setAssignedCoach(coach);
        setCallPartner(coach);
      }
    } catch (error) {
      console.error('Error fetching assigned coach:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVideoCall = async () => {
    if (!callPartner) {
      Alert.alert('Hata', 
        userProfile?.role === 'student' 
          ? 'Atanmış koçunuz bulunamadı'
          : 'Seçili öğrenciniz bulunamadı'
      );
      return;
    }

    try {
      await initializeVideoCall(callPartner.id);
    } catch (error) {
      Alert.alert('Hata', 'Video görüşme başlatılamadı');
    }
  };

  const handleToggleInviteForm = () => {
    setShowInviteForm(!showInviteForm);
    if (!showInviteForm) {
      setInviteMessage(''); // Clear message when opening
    }
  };

  const handleSendInvite = async () => {
    if (!callPartner) return;

    setSendingInvite(true);
    try {
      const result = await sendVideoInvite(callPartner.id, inviteMessage.trim() || undefined);
      if (result.success) {
        // Success - just clear form and close, no alert needed
        setInviteMessage('');
        setShowInviteForm(false);
      } else {
        Alert.alert('Hata', result.error || 'Davet gönderilirken hata oluştu');
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu');
    } finally {
      setSendingInvite(false);
    }
  };

  if (showVideoCall && videoCall) {
    return (
      <VideoCallScreen 
        onCallEnd={async () => {
          try {
            await endVideoCall();
          } catch (error) {
            console.error('Error ending video call:', error);
          }
          setShowVideoCall(false);
        }} 
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#249096" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Video Görüşme</Text>
      </View>

      <View style={styles.content}>
        {isDemoMode && (
          <View style={styles.demoAlert}>
            <Text style={styles.demoTitle}>Demo Modu</Text>
            <Text style={styles.demoText}>
              Stream.io API anahtarları yapılandırılmamış. 
              Gerçek video görüşme için API anahtarlarını .env dosyasına ekleyin.
            </Text>
          </View>
        )}

        {callPartner ? (
          <View style={styles.videoSection}>
            <Text style={styles.sectionTitle}>
              {userProfile?.role === 'student' ? 'Koçunuzla Video Görüşme' : 'Öğrencinizle Video Görüşme'}
            </Text>
            <View style={styles.coachCard}>
              <Text style={styles.coachName}>{callPartner.full_name}</Text>
              <Text style={styles.coachEmail}>{callPartner.email}</Text>
              
              <TouchableOpacity
                style={[
                  styles.callButton,
                  (!isStreamReady || videoLoading) && styles.callButtonDisabled
                ]}
                onPress={handleStartVideoCall}
                disabled={!isStreamReady || videoLoading}
              >
                {videoLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.callButtonText}>
                    📹 Video Görüşme Başlat
                  </Text>
                )}
              </TouchableOpacity>

              {videoError && (
                <Text style={styles.errorText}>{videoError}</Text>
              )}

              {/* Video Call Invite Section */}
              <View style={styles.inviteSection}>
                <TouchableOpacity
                  style={styles.inviteCard}
                  onPress={handleToggleInviteForm}
                >
                  <Text style={styles.inviteCardTitle}>📹 Video Görüşme Daveti Gönder</Text>
                  <Text style={styles.inviteCardSubtitle}>
                    {callPartner.full_name} adlı kişiye push bildirim ile video görüşme daveti gönderin
                  </Text>
                </TouchableOpacity>

                {/* Inline Invite Form - Simple like web */}
                {showInviteForm && (
                  <View style={styles.inviteForm}>
                    <TextInput
                      style={styles.inviteMessageInput}
                      placeholder={`${callPartner.full_name} adlı kişiye özel mesaj (isteğe bağlı)...`}
                      value={inviteMessage}
                      onChangeText={setInviteMessage}
                      multiline={true}
                      numberOfLines={2}
                      maxLength={200}
                    />
                    <View style={styles.inviteFormButtons}>
                      <TouchableOpacity
                        style={styles.inviteCancelButton}
                        onPress={() => setShowInviteForm(false)}
                      >
                        <Text style={styles.inviteCancelButtonText}>✕</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.inviteSendButton, sendingInvite && styles.inviteSendButtonDisabled]}
                        onPress={handleSendInvite}
                        disabled={sendingInvite}
                      >
                        {sendingInvite ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <Text style={styles.inviteSendButtonText}>Daveti Gönder</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noCoachSection}>
            <Text style={styles.noCoachTitle}>
              {userProfile?.role === 'student' ? 'Koç Atanmamış' : 'Öğrenci Seçilmedi'}
            </Text>
            <Text style={styles.noCoachText}>
              {userProfile?.role === 'student' 
                ? 'Henüz size bir koç atanmamış. Lütfen admin ile iletişime geçin.'
                : 'Video görüşme yapmak için bir öğrenci seçmeniz gerekiyor.'
              }
            </Text>
          </View>
        )}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flex: 1,
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
  content: {
    flex: 1,
    padding: 20,
  },
  demoAlert: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
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
  videoSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  coachCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coachName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  coachEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  callButton: {
    backgroundColor: '#249096',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  callButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  callButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  noCoachSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCoachTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  noCoachText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Video Invite Styles
  inviteSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inviteCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  inviteCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  inviteCardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Inline invite form styles - Simple like web
  inviteForm: {
    marginTop: 12,
    gap: 8,
  },
  inviteMessageInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    backgroundColor: 'white',
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  inviteFormButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  inviteCancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  inviteSendButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    alignItems: 'center',
  },
  inviteSendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  inviteSendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
}); 