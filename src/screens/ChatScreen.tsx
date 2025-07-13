import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Chat, Channel, MessageList, MessageInput, OverlayProvider } from 'stream-chat-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useStream } from '../contexts/StreamContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';

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

  useEffect(() => {
    if (userProfile) {
      if (userProfile.role === 'student') {
        fetchAssignedCoach();
      } else if (userProfile.role === 'coach') {
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
        console.log('Supabase not available');
        return;
      }
      
      const { data, error } = await supabase
        .from('coach_student_assignments')
        .select(`
          coach:user_profiles!coach_student_assignments_coach_id_fkey(*)
        `)
        .eq('student_id', userProfile?.id)
        .single();

      if (error) {
        console.error('Error fetching assigned coach:', error);
      } else if (data?.coach) {
        const coach = data.coach as unknown as UserProfile;
        setAssignedCoach(coach);
        setChatPartner(coach);
      }
    } catch (error) {
      console.error('Error fetching assigned coach:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || chatLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
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
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            {userProfile?.role === 'student' 
              ? '👨‍🏫 Henüz size atanmış bir koç bulunmuyor' 
              : '👨‍🎓 Lütfen bir öğrenci seçin'}
          </Text>
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

  // Show chat interface if everything is ready
  if (chatPartner && chatClient && chatChannel) {
    // Debug: Log channel information
    console.log('📱 Chat interface rendering with channel:', chatChannel.id);
    console.log('📱 Channel message count:', chatChannel.state.messages.length);
    console.log('📱 Channel members:', chatChannel.state.members);
    
    try {
      return (
        <View style={styles.container}>
          <OverlayProvider>
            <Chat client={chatClient}>
              <Channel channel={chatChannel}>
                <View style={styles.header}>
                  <Text style={styles.title}>💬 {chatPartner.full_name}</Text>
                </View>
                <View style={styles.chatContainer}>
                  <MessageList />
                  <MessageInput />
                </View>
              </Channel>
            </Chat>
          </OverlayProvider>
        </View>
      );
    } catch (error) {
      console.error('Error rendering chat interface:', error);
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>💬 {chatPartner.full_name}</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              ⚠️ Chat arayüzü yüklenirken hata oluştu
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
        <ActivityIndicator size="large" color="#3B82F6" />
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
}); 