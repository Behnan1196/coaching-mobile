import { StreamVideoClient } from '@stream-io/video-react-native-sdk';
import { StreamChat } from 'stream-chat';

// Stream.io configuration
const STREAM_CONFIG = {
  API_KEY: process.env.EXPO_PUBLIC_STREAM_API_KEY || 'mmhfdzb5evj2', // fallback to demo key
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
};

export const isDemoMode = () => {
  return STREAM_CONFIG.API_KEY === 'mmhfdzb5evj2';
};

// Generate user token from your backend
export const generateUserToken = async (userId: string): Promise<string> => {
  if (isDemoMode()) {
    console.warn('⚠️ Using demo Stream.io setup. Configure API keys for production.');
    return `demo_token_${userId}`;
  }
  
  try {
    const response = await fetch(`${STREAM_CONFIG.API_URL}/api/stream/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    if (!response.ok) {
      throw new Error(`Token generation failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.token) {
      throw new Error('Invalid token response');
    }
    
    return data.token;
  } catch (error) {
    console.error('❌ Failed to generate Stream token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

// Create Stream Video client
export const createStreamVideoClient = (user: { id: string; name: string }, token: string): StreamVideoClient => {
  return new StreamVideoClient({
    apiKey: STREAM_CONFIG.API_KEY,
    user,
    token,
  });
};

// Create Stream Chat client
export const createStreamChatClient = async (user: { id: string; name: string }, token: string): Promise<StreamChat> => {
  console.log('🔍 Creating Stream Chat client for user:', user.id);
  
  try {
    const client = StreamChat.getInstance(STREAM_CONFIG.API_KEY);
    await client.connectUser(user, token);
    console.log('✅ Stream Chat client created successfully');
    
    return client;
  } catch (error) {
    console.error('❌ Error creating Stream Chat client:', error);
    throw error;
  }
};

// Create a video call between coach and student
export const createVideoCallId = (coachId: string, studentId: string): string => {
  // Create a unique but short call ID for the coach-student pair
  const shortCoachId = coachId.substring(0, 8);
  const shortStudentId = studentId.substring(0, 8);
  return `call-${[shortCoachId, shortStudentId].sort().join('-')}`;
};

// Create a chat channel between coach and student
export const createChatChannelId = (coachId: string, studentId: string): string => {
  // Create a consistent channel ID regardless of who creates it
  // Use first 8 characters of each UUID to stay under 64 char limit
  // Use same format as web version: cs- prefix
  const shortCoachId = coachId.substring(0, 8);
  const shortStudentId = studentId.substring(0, 8);
  return `cs-${[shortCoachId, shortStudentId].sort().join('-')}`;
};

// Create or get a chat channel
export const createChatChannel = async (chatClient: StreamChat, coachId: string, studentId: string, coachName: string, studentName: string) => {
  const channelId = createChatChannelId(coachId, studentId);
  console.log('🔍 Creating chat channel:', channelId);
  
  try {
    const channel = chatClient.channel('messaging', channelId, {
      members: [coachId, studentId],
    });
    
    // Create the channel first (this actually creates it in Stream's system)
    await channel.create();
    console.log('✅ Channel created in Stream system');
    
    // Then watch the channel and load message history
    await channel.watch({ 
      messages: { limit: 50 }, // Load last 50 messages
      members: { limit: 100 },
      watchers: { limit: 100 }
    });
    
    console.log('✅ Chat channel created successfully');
    console.log('📝 Channel message count:', channel.state.messages.length);
    
    return channel;
  } catch (error) {
    console.error('❌ Error creating chat channel:', error);
    throw error;
  }
};

// Format user for Stream.io
export const formatStreamUser = (user: { id: string; full_name: string; email: string }) => ({
  id: user.id,
  name: user.full_name,
  email: user.email,
  // Removed role field since Stream.io doesn't have custom roles defined
});

// Utility function to create unique channel names for real-time subscriptions
export const createUniqueChannelName = (baseName: string, userId: string, additionalId?: string | number) => {
  const timestamp = additionalId || Date.now();
  return `${baseName}-${userId}-${timestamp}`;
};

// Utility function to safely remove Supabase channels
export const safelyRemoveChannel = (supabase: any, subscription: any, context: string) => {
  if (!subscription || !supabase) return;
  
  try {
    supabase.removeChannel(subscription);
    console.log(`✅ [${context}] Subscription cleaned up successfully`);
  } catch (error) {
    console.error(`❌ [${context}] Error cleaning up subscription:`, error);
  }
};

// Utility function to check subscription status
export const logSubscriptionStatus = (status: string, context: string) => {
  switch (status) {
    case 'SUBSCRIBED':
      console.log(`✅ [${context}] Real-time subscription active`);
      break;
    case 'CHANNEL_ERROR':
      console.error(`❌ [${context}] Real-time subscription error`);
      break;
    case 'TIMED_OUT':
      console.warn(`⏰ [${context}] Real-time subscription timed out`);
      break;
    case 'CLOSED':
      console.warn(`🔒 [${context}] Real-time subscription closed`);
      break;
    default:
      console.log(`📊 [${context}] Subscription status: ${status}`);
  }
};

export { STREAM_CONFIG }; 