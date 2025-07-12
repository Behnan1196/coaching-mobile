import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>
            {loading ? 'Yükleniyor...' : 'Sohbet hazırlanıyor...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error states
  if (chatError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mesajlar</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            ⚠️ Mesajlaşma hatası: {chatError}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show no chat partner state
  if (!chatPartner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mesajlar</Text>
        </View>
        <View style={styles.noCoachSection}>
          <Text style={styles.noCoachTitle}>
            {userProfile?.role === 'student' ? 'Koç Atanmamış' : 'Öğrenci Seçilmedi'}
          </Text>
          <Text style={styles.noCoachText}>
            {userProfile?.role === 'student' 
              ? 'Henüz size bir koç atanmamış. Lütfen admin ile iletişime geçin.'
              : 'Mesajlaşmak için bir öğrenci seçmeniz gerekiyor.'
            }
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show demo mode warning
  if (isDemoMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mesajlar</Text>
        </View>
        <View style={styles.demoAlert}>
          <Text style={styles.demoTitle}>Demo Modu</Text>
          <Text style={styles.demoText}>
            Stream.io API anahtarları yapılandırılmamış. 
            Gerçek mesajlaşma için API anahtarlarını .env dosyasına ekleyin.
          </Text>
        </View>
      </SafeAreaView>
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
        <SafeAreaView style={styles.container}>
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
        </SafeAreaView>
      );
    } catch (error) {
      console.error('Error rendering chat interface:', error);
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>💬 {chatPartner.full_name}</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              ⚠️ Chat arayüzü yüklenirken hata oluştu
            </Text>
          </View>
        </SafeAreaView>
      );
    }
  }

  // Show placeholder if chat not ready but partner is assigned
  if (chatPartner && !chatChannel && !chatError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💬 {chatPartner.full_name}</Text>
        </View>
        <View style={styles.chatContainer}>
          <View style={styles.placeholderContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.placeholderTitle}>
              Sohbet hazırlanıyor...
            </Text>
            <Text style={styles.placeholderText}>
              {userProfile?.role === 'student' 
                ? 'Koçunuzla sohbet kanalı oluşturuluyor.'
                : 'Öğrencinizle sohbet kanalı oluşturuluyor.'
              }
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if there's a chat error
  if (assignedCoach && chatError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💬 {assignedCoach.full_name}</Text>
        </View>
        <View style={styles.chatContainer}>
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderTitle}>
              ⚠️ Mesajlaşma Hatası
            </Text>
            <Text style={styles.placeholderText}>
              {chatError}
            </Text>
            <Text style={styles.placeholderSubtext}>
              Video görüşme özelliğini "Video Call" sekmesinden kullanabilirsiniz.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback loading state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesajlar</Text>
      </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Sohbet hazırlanıyor...</Text>
      </View>
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
  demoAlert: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    margin: 20,
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
  chatContainer: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  noCoachSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
}); 