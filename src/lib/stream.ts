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

// Retry mechanism with exponential backoff for Stream.io calls
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limiting error
      if (error.message?.includes('Too many requests') || error.message?.includes('429')) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
          console.warn(`⚠️ Rate limited, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For non-rate-limiting errors or final attempt, throw immediately
      throw error;
    }
  }
  
  throw lastError!;
};

// Create a video call between coach and student
export const createVideoCallId = (coachId: string, studentId: string): string => {
  // Create a unique but short call ID for the coach-student pair
  const shortCoachId = coachId.substring(0, 8);
  const shortStudentId = studentId.substring(0, 8);
  return `call-${[shortCoachId, shortStudentId].sort().join('-')}`;
};

// Create video call with retry mechanism
export const createVideoCall = async (videoClient: StreamVideoClient, coachId: string, studentId: string) => {
  const callId = createVideoCallId(coachId, studentId);
  const call = videoClient.call('default', callId);
  
  // Use retry mechanism for getOrCreate to handle rate limiting
  await retryWithBackoff(async () => {
    await call.getOrCreate({
      data: {
        members: [
          { user_id: coachId },
          { user_id: studentId },
        ],
      },
    });
  });
  
  return call;
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

// Ensure partner user exists in Stream.io before video calls
export const ensurePartnerUserExists = async (chatClient: StreamChat, partnerId: string) => {
  try {
    console.log('👤 [MOBILE] Ensuring partner user exists in Stream.io:', partnerId);
    
    // Import supabase client
    const { supabase } = await import('./supabase');
    
    // Get partner info from Supabase
    const { data: partnerProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', partnerId)
      .single();
    
    if (partnerProfile) {
      // Create/update partner user in Stream.io
      const partnerStreamUser = formatStreamUser({
        id: partnerProfile.id,
        full_name: partnerProfile.full_name,
        email: partnerProfile.email || ''
      });
      
      console.log('👤 [MOBILE] Partner user formatted:', partnerStreamUser);
      
      // Upsert partner user in Stream.io
      await chatClient.upsertUser(partnerStreamUser);
      console.log('✅ [MOBILE] Partner user created/updated in Stream.io');
    } else {
      console.warn('⚠️ [MOBILE] Partner profile not found in Supabase:', partnerId);
    }
  } catch (error) {
    console.warn('⚠️ [MOBILE] Could not create partner user, continuing anyway:', error);
  }
};

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