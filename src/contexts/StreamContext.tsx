import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Call, StreamVideoClient } from '@stream-io/video-react-native-sdk';
import { StreamChat, Channel } from 'stream-chat';
import { useAuth } from './AuthContext';
import { 
  generateUserToken, 
  createStreamVideoClient, 
  createStreamChatClient,
  createVideoCallId, 
  createChatChannel,
  formatStreamUser,
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
    } catch (error) {
      console.error('❌ [STREAM] Failed to initialize stream clients:', error);
      setVideoError('Failed to initialize video client');
      setChatError('Failed to initialize chat client');
    } finally {
      setVideoLoading(false);
      setChatLoading(false);
    }
  };

  const cleanupStream = () => {
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
      setChatError(null);
      
      if (isDemoMode()) {
        return;
      }

      if (!chatClient || !user) {
        throw new Error('Chat client not initialized');
      }

      // Create channel ID (sorted for consistency)
      const channelId = `coaching-${[user.id, partnerId].sort().join('-')}`;
      
      // Create or get existing channel
      const channel = chatClient.channel('messaging', channelId, {
        members: [user.id, partnerId],
      });

      // Create the channel if it doesn't exist
      await channel.create();
      
      setChatChannel(channel);
    } catch (error) {
      console.error('❌ [STREAM] Failed to initialize chat channel:', error);
      setChatError('Failed to initialize chat channel');
    }
  };

  const initializeVideoCall = async (partnerId: string) => {
    try {
      setVideoError(null);
      
      if (isDemoMode()) {
        return null;
      }

      if (!videoClient || !user) {
        throw new Error('Video client not initialized');
      }

      // Create call ID (sorted for consistency)
      const callId = `coaching-${[user.id, partnerId].sort().join('-')}`;
      
      const call = videoClient.call('default', callId);
      
      // Get or create the call
      await call.getOrCreate({
        ring: false,
        data: {
          custom: {
            coaching_session: true,
            coach_id: user.role === 'coach' ? user.id : partnerId,
            student_id: user.role === 'student' ? user.id : partnerId,
          },
        },
      });

      setVideoCall(call);
      return call;
    } catch (error) {
      console.error('❌ [STREAM] Failed to initialize video call:', error);
      setVideoError('Failed to initialize video call');
      return null;
    }
  };

  const joinVideoCall = async (callId: string) => {
    try {
      setVideoError(null);
      
      if (isDemoMode()) {
        return;
      }

      if (!videoClient) {
        throw new Error('Video client not initialized');
      }

      const call = videoClient.call('default', callId);
      await call.join();
      setVideoCall(call);
    } catch (error) {
      console.error('❌ [STREAM] Failed to join video call:', error);
      setVideoError('Failed to join video call');
    }
  };

  const startVideoCall = async (callToStart?: Call) => {
    try {
      setVideoError(null);
      
      if (isDemoMode()) {
        return;
      }

      const call = callToStart || videoCall;
      if (!call) {
        throw new Error('No call to start');
      }

      await call.join();
      setVideoCall(call);
    } catch (error) {
      console.error('❌ [STREAM] Failed to start video call:', error);
      setVideoError('Failed to start video call');
    }
  };

  const endVideoCall = async () => {
    try {
      if (videoCall) {
        await videoCall.leave();
        setVideoCall(null);
      }
    } catch (error) {
      console.error('❌ [STREAM] Failed to end video call:', error);
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