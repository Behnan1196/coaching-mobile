import { supabase } from './supabase';
import { UserProfile } from '../types/database';

export interface PresenceUser {
  user_id: string;
  user_name: string;
  online_at: string;
}

export interface PresenceState {
  [key: string]: PresenceUser[];
}

export class PresenceService {
  private static presenceChannels: Map<string, any> = new Map();
  private static onlineStatusCallbacks: Map<string, (isOnline: boolean) => void> = new Map();

  /**
   * Initialize presence tracking for a user with their partner
   */
  static async initializePresence(
    userId: string,
    partnerId: string,
    userProfile: UserProfile,
    onPartnerStatusChange: (isOnline: boolean) => void
  ): Promise<void> {
    try {
      console.log('🟢 [PRESENCE] Initializing presence tracking...', { userId, partnerId });

      if (!supabase) {
        console.error('❌ [PRESENCE] Supabase client not available');
        return;
      }

      // Create a shared channel name for both users (sorted for consistency)
      const sharedChannelName = `presence-${[userId, partnerId].sort().join('-')}`;
      
      // Clean up any existing channel for this partner
      this.cleanup(partnerId);
      
      // Store the callback
      this.onlineStatusCallbacks.set(partnerId, onPartnerStatusChange);

      // Create the presence channel
      const presenceChannel = supabase
        .channel(sharedChannelName, {
          config: {
            presence: {
              key: userId,
            },
          },
        })
        .on('presence', { event: 'sync' }, () => {
          console.log('🔄 [PRESENCE] Presence sync event');
          const presenceState = presenceChannel.presenceState();
          const isPartnerOnline = Object.keys(presenceState).includes(partnerId);
          console.log('🟢 [PRESENCE] Partner online status:', { partnerId, isPartnerOnline, presenceState });
          onPartnerStatusChange(isPartnerOnline);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('👋 [PRESENCE] User joined:', { key, newPresences });
          if (key === partnerId) {
            console.log('🟢 [PRESENCE] Partner came online:', partnerId);
            onPartnerStatusChange(true);
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('👋 [PRESENCE] User left:', { key, leftPresences });
          if (key === partnerId) {
            console.log('🔴 [PRESENCE] Partner went offline:', partnerId);
            onPartnerStatusChange(false);
          }
        })
        .subscribe(async (status) => {
          console.log('📡 [PRESENCE] Channel subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            // Track current user's presence
            const presenceData = {
              user_id: userId,
              user_name: userProfile.full_name || userProfile.email || 'Unknown',
              online_at: new Date().toISOString(),
            };
            
            console.log('📍 [PRESENCE] Tracking user presence:', presenceData);
            await presenceChannel.track(presenceData);
          }
        });

      // Store the channel for cleanup
      this.presenceChannels.set(partnerId, presenceChannel);
      
      console.log('✅ [PRESENCE] Presence tracking initialized successfully');
    } catch (error) {
      console.error('❌ [PRESENCE] Error initializing presence:', error);
    }
  }

  /**
   * Update presence data for the current user
   */
  static async updatePresence(
    partnerId: string,
    userProfile: UserProfile
  ): Promise<void> {
    try {
      const presenceChannel = this.presenceChannels.get(partnerId);
      
      if (!presenceChannel) {
        console.warn('⚠️ [PRESENCE] No presence channel found for partner:', partnerId);
        return;
      }

      const presenceData = {
        user_id: userProfile.id,
        user_name: userProfile.full_name || userProfile.email || 'Unknown',
        online_at: new Date().toISOString(),
      };

      console.log('📍 [PRESENCE] Updating presence data:', presenceData);
      await presenceChannel.track(presenceData);
    } catch (error) {
      console.error('❌ [PRESENCE] Error updating presence:', error);
    }
  }

  /**
   * Check if a partner is currently online
   */
  static isPartnerOnline(partnerId: string): boolean {
    try {
      const presenceChannel = this.presenceChannels.get(partnerId);
      
      if (!presenceChannel) {
        return false;
      }

      const presenceState = presenceChannel.presenceState();
      return Object.keys(presenceState).includes(partnerId);
    } catch (error) {
      console.error('❌ [PRESENCE] Error checking partner online status:', error);
      return false;
    }
  }

  /**
   * Get all present users in the channel
   */
  static getPresentUsers(partnerId: string): PresenceUser[] {
    try {
      const presenceChannel = this.presenceChannels.get(partnerId);
      
      if (!presenceChannel) {
        return [];
      }

      const presenceState = presenceChannel.presenceState();
      const users: PresenceUser[] = [];

      Object.values(presenceState).forEach((userArray: any) => {
        if (Array.isArray(userArray)) {
          users.push(...userArray);
        }
      });

      return users;
    } catch (error) {
      console.error('❌ [PRESENCE] Error getting present users:', error);
      return [];
    }
  }

  /**
   * Clean up presence tracking for a specific partner
   */
  static cleanup(partnerId: string): void {
    try {
      const presenceChannel = this.presenceChannels.get(partnerId);
      
      if (presenceChannel && supabase) {
        console.log('🧹 [PRESENCE] Cleaning up presence channel for partner:', partnerId);
        supabase.removeChannel(presenceChannel);
        this.presenceChannels.delete(partnerId);
      }

      // Remove callback
      this.onlineStatusCallbacks.delete(partnerId);
    } catch (error) {
      console.error('❌ [PRESENCE] Error during cleanup:', error);
    }
  }

  /**
   * Clean up all presence channels
   */
  static cleanupAll(): void {
    try {
      console.log('🧹 [PRESENCE] Cleaning up all presence channels');
      
      for (const [partnerId, presenceChannel] of this.presenceChannels) {
        if (supabase) {
          supabase.removeChannel(presenceChannel);
        }
      }
      
      this.presenceChannels.clear();
      this.onlineStatusCallbacks.clear();
    } catch (error) {
      console.error('❌ [PRESENCE] Error during cleanup all:', error);
    }
  }

  /**
   * Handle app state changes (foreground/background)
   */
  static handleAppStateChange(nextAppState: string, userProfile: UserProfile): void {
    try {
      console.log('📱 [PRESENCE] App state changed:', nextAppState);
      
      if (nextAppState === 'active') {
        // App came to foreground - update presence for all channels
        for (const [partnerId] of this.presenceChannels) {
          this.updatePresence(partnerId, userProfile);
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background - could implement different behavior here
        // For now, we'll keep the connection active
        console.log('📱 [PRESENCE] App backgrounded, keeping presence active');
      }
    } catch (error) {
      console.error('❌ [PRESENCE] Error handling app state change:', error);
    }
  }
}

export default PresenceService; 