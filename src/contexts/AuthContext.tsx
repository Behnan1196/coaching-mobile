import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';
import { initializePushNotifications, cleanupNotificationTokens, cleanupLeftoverTokens } from '../lib/notifications';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Video invite handler
  const handleVideoInviteReceived = (inviteData: any) => {
    console.log('📹 Video invite received in AuthContext:', inviteData);
    // You can add navigation logic here if needed
    // For now, the notification will show and user can tap to open video call screen
  };

  useEffect(() => {
    // Only proceed if supabase client is available
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Clean up any leftover tokens from other users first
        await cleanupLeftoverTokens();
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.id);
      
      // Clean up tokens for previous user before setting new user
      if (user?.id && session?.user?.id && user.id !== session.user.id) {
        console.log('🔄 User switching detected, cleaning up old user tokens');
        await cleanupNotificationTokens(user.id);
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Clean up any leftover tokens from other users before initializing new ones
        try {
          await cleanupLeftoverTokens();
        } catch (error) {
          console.error('Error cleaning up leftover tokens:', error);
        }
        
        await fetchUserProfile(session.user.id);
        
        // Initialize push notifications asynchronously (non-blocking)
        setTimeout(() => {
          try {
            initializePushNotifications(session.user.id, handleVideoInviteReceived);
          } catch (error) {
            console.error('Error initializing push notifications:', error);
          }
        }, 100);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: { message: 'Supabase client not available' } };
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    
    // Clean up notification tokens only when actually signing out
    try {
      if (user?.id) {
        console.log('🧹 Cleaning up notification tokens during sign out');
        await cleanupNotificationTokens(user.id);
      }
    } catch (error) {
      console.error('Error cleaning up notification tokens:', error);
    }
    
    // Immediately clear state to force logout
    setUser(null);
    setUserProfile(null);
    setSession(null);
    
    // Complete sign out
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const refreshUserProfile = async () => {
    if (!user?.id || !supabase) return;
    await fetchUserProfile(user.id);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    signIn,
    signOut,
    refreshUserProfile,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 