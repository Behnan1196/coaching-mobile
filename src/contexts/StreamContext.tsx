import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Call, StreamVideoClient } from '@stream-io/video-react-native-sdk';
import { StreamChat, Channel } from 'stream-chat';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { 
  generateUserToken, 
  createStreamVideoClient, 
  createStreamChatClient,
  createVideoCallId,
  createVideoCall, 
  createChatChannel,
  formatStreamUser,
  ensurePartnerUserExists,
  isDemoMode 
} from '../lib/stream';

interface StreamContextType {
  videoClient: StreamVideoClient | null;
  videoCall: Call | null;
  videoLoading: boolean;
  videoError: string | null;
  chatClient: StreamChat | null;
  chatChannel: Channel | null;
  chatLoading: boolean;
  chatError: string | null;
  isStreamReady: boolean;
  isDemoMode: boolean;
  initializeVideoCall: (partnerId: string) => Promise<Call | null>;
  startVideoCall: (callToStart?: Call) => Promise<void>;
  endVideoCall: () => Promise<void>;
  joinVideoCall: (callId: string) => Promise<void>;
  initializeChatChannel: (partnerId: string, partnerName: string) => Promise<void>;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

export const useStream = () => {
  const context = useContext(StreamContext);
  if (!context) {
    throw new Error('useStream must be used within a StreamProvider');
  }
  return context;
};

interface StreamProviderProps {
  children: React.ReactNode;
}

export const StreamProvider: React.FC<StreamProviderProps> = ({ children }) => {
  const { user, userProfile, isAuthenticated } = useAuth();
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [videoCall, setVideoCall] = useState<Call | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [initializingVideoPartners, setInitializingVideoPartners] = useState<Set<string>>(new Set());
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [chatChannel, setChatChannel] = useState<Channel | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isStreamReady, setIsStreamReady] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && userProfile) {
      initializeStreamClient();
    } else {
      cleanupStream();
    }
  }, [isAuthenticated, user, userProfile]);

  const initializeStreamClient = async () => {
    try {
      setVideoLoading(true);
      setChatLoading(true);
      setVideoError(null);
      setChatError(null);

      if (isDemoMode()) {
        console.log('⚠️ [STREAM] Running in demo mode - video calling and chat disabled');
        setIsStreamReady(true);
        setVideoLoading(false);
        setChatLoading(false);
        return;
      }

      if (!user || !userProfile) {
        throw new Error('User not authenticated');
      }

      // Create Stream user object
      const streamUser = formatStreamUser({
        id: user.id,
        full_name: userProfile.full_name,
        email: user.email || userProfile.email || ''
      });
      
      // Generate Stream token
      const token = await generateUserToken(streamUser.id);
      
      // Initialize both video and chat clients
      const videoClientInstance = createStreamVideoClient(streamUser, token);
      const chatClientInstance = await createStreamChatClient(streamUser, token);
      
      setVideoClient(videoClientInstance);
      setChatClient(chatClientInstance);
      setIsStreamReady(true);
      
      console.log('✅ [STREAM] Video and chat clients initialized successfully');
    } catch (error) {
      console.error('❌ [STREAM] Failed to initialize stream clients:', error);
      setVideoError('Failed to initialize video client');
      setChatError('Failed to initialize chat client');
    } finally {
      setVideoLoading(false);
      setChatLoading(false);
    }
  };

  const setupChatMessageListener = (channel: Channel, currentUserId: string) => {
    console.log('🔔 [CHAT] Setting up message listener for notifications');
    
    channel.on('message.new', async (event) => {
      const message = event.message;
      const messageUserId = message.user?.id;
      
      // Don't show notifications for our own messages
      if (messageUserId === currentUserId) {
        return;
      }
      
      console.log('📨 [CHAT] New message received from:', message.user?.name);
      
      // Send local push notification
      // The notification handler will decide whether to show it based on current tab
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💬 ${message.user?.name || 'Yeni mesaj'}`,
          body: message.text || 'Yeni bir mesaj aldınız',
          data: {
            type: 'chat_message',
            channelId: channel.id,
            userId: messageUserId,
            userName: message.user?.name,
          },
        },
        trigger: null, // Show immediately
      });
    });
  };

  const cleanupStream = () => {
    console.log('🧹 [STREAM] Cleaning up Stream resources');
    
    if (videoClient) {
      videoClient.disconnectUser();
      setVideoClient(null);
    }
    
    if (chatClient) {
      chatClient.disconnectUser();
      setChatClient(null);
    }
    
    setVideoCall(null);
    setChatChannel(null);
    setIsStreamReady(false);
  };

  const initializeChatChannel = async (partnerId: string, partnerName: string) => {
    try {
      setChatLoading(true);
      setChatError(null);

      if (isDemoMode()) {
        console.log('⚠️ [CHAT] Running in demo mode - chat disabled');
        return;
      }

      if (!chatClient || !user || !userProfile) {
        throw new Error('Chat client not ready or user not authenticated');
      }

      // Clean up existing channel if switching partners
      if (chatChannel) {
        console.log('🧹 [CHAT] Cleaning up existing chat channel before switching partners');
        try {
          await chatChannel.stopWatching();
        } catch (cleanupError) {
          console.warn('⚠️ [CHAT] Error stopping previous channel watch:', cleanupError);
        }
        setChatChannel(null);
      }

      // Create Stream user object
      const streamUser = formatStreamUser({
        id: user.id,
        full_name: userProfile.full_name,
        email: user.email || userProfile.email || ''
      });
      
      // Ensure partner user exists in Stream.io before creating chat channel
      await ensurePartnerUserExists(chatClient, partnerId);
      
      // Create or get chat channel using existing chat client
      const channel = await createChatChannel(chatClient, streamUser.id, partnerId, streamUser.name, partnerName);
      
      // Set up message listener for push notifications
      setupChatMessageListener(channel, streamUser.id);
      
      setChatChannel(channel);
      
      console.log('✅ [CHAT] Chat channel initialized successfully');
    } catch (error) {
      console.error('❌ [CHAT] Failed to initialize chat channel:', error);
      setChatError('Failed to initialize chat channel');
    } finally {
      setChatLoading(false);
    }
  };

  const initializeVideoCall = async (partnerId: string) => {
    try {
      if (!videoClient || !user) {
        throw new Error('Video client not initialized');
      }

      // Prevent multiple simultaneous initializations for the same partner
      if (initializingVideoPartners.has(partnerId)) {
        console.log('📹 [VIDEO CALL] Initialization already in progress for partner:', partnerId);
        return;
      }

      setInitializingVideoPartners(prev => new Set(prev).add(partnerId));

      if (isDemoMode()) {
        console.log('⚠️ [VIDEO CALL] Demo mode - creating mock call');
        // Create a mock call object for demo purposes
        const mockCall = {
          id: 'demo-call',
          join: async () => console.log('Demo call joined'),
          leave: async () => console.log('Demo call left'),
        } as any;
        setVideoCall(mockCall);
        return mockCall;
      }

      console.log(`📹 [VIDEO CALL] Creating call with partner: ${partnerId}`);
      
      // Ensure partner user exists in Stream.io before creating video call
      if (chatClient) {
        await ensurePartnerUserExists(chatClient, partnerId);
      }
      
      // Use the new createVideoCall function with retry mechanism
      const call = await createVideoCall(videoClient, user.id, partnerId);
      
      setVideoCall(call);
      console.log('✅ [VIDEO CALL] Call initialized successfully');
      
      return call;
    } catch (error) {
      console.error('❌ [VIDEO CALL] Failed to initialize call:', error);
      
      // Provide user-friendly error messages for rate limiting
      if (error instanceof Error && error.message.includes('Too many requests')) {
        throw new Error('Video call service is temporarily busy. Please wait a moment and try again.');
      }
      
      throw error;
    } finally {
      setInitializingVideoPartners(prev => {
        const newSet = new Set(prev);
        newSet.delete(partnerId);
        return newSet;
      });
    }
  };

  const joinVideoCall = async (callId: string) => {
    try {
      if (!videoClient) {
        throw new Error('Video client not initialized');
      }

      console.log(`📹 [JOIN CALL] Joining call: ${callId}`);
      
      // Get the call and join it
      const call = videoClient.call('default', callId);
      await call.join();
      
      setVideoCall(call);
      console.log('✅ [JOIN CALL] Successfully joined call');
    } catch (error) {
      console.error('❌ [JOIN CALL] Failed to join call:', error);
      throw error;
    }
  };

  const startVideoCall = async (callToStart?: Call) => {
    try {
      const call = callToStart || videoCall;
      if (!call) {
        throw new Error('No video call to start');
      }

      if (isDemoMode()) {
        console.log('⚠️ [START CALL] Demo mode - call start simulated');
        return;
      }

      console.log('🎬 [START CALL] Starting video call...');
      await call.join();
      console.log('✅ [START CALL] Successfully started call');
    } catch (error) {
      console.error('❌ [START CALL] Failed to start call:', error);
      throw error;
    }
  };

  const endVideoCall = async () => {
    try {
      if (!videoCall) {
        return;
      }

      console.log('🔚 [END CALL] Ending video call...');
      
      // Check if call is already left to avoid "Cannot leave call that has already been left" error
      try {
        await videoCall.leave();
        console.log('✅ [END CALL] Successfully ended call');
      } catch (leaveError: any) {
        if (leaveError?.message?.includes('already been left')) {
          console.log('ℹ️ [END CALL] Call was already left, cleaning up state');
        } else {
          // Re-throw other errors
          throw leaveError;
        }
      }
      
      setVideoCall(null);
    } catch (error) {
      console.error('❌ [END CALL] Failed to end call:', error);
      throw error;
    }
  };

  return (
    <StreamContext.Provider
      value={{
        videoClient,
        videoCall,
        videoLoading,
        videoError,
        chatClient,
        chatChannel,
        chatLoading,
        chatError,
        isStreamReady,
        isDemoMode: isDemoMode(),
        initializeVideoCall,
        startVideoCall,
        endVideoCall,
        joinVideoCall,
        initializeChatChannel,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
}; 