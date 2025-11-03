import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ChatScreen } from './ChatScreen';
import { VideoCallTabScreen } from './VideoCallTabScreen';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { useAuth } from '../contexts/AuthContext';

const Tab = createMaterialTopTabNavigator();

// Wrapper components to force remount when partner changes (only for coaches)
const ChatScreenWrapper: React.FC = () => {
  const { selectedStudent } = useCoachStudent();
  const { userProfile } = useAuth();
  
  // Only use remounting key for coaches when they switch students
  // Students always have the same assigned coach, so no remounting needed
  const key = userProfile?.role === 'coach' 
    ? `chat-${selectedStudent?.id || 'none'}` 
    : 'chat-student';
    
  return <ChatScreen key={key} />;
};

const VideoCallTabScreenWrapper: React.FC = () => {
  const { selectedStudent } = useCoachStudent();
  const { userProfile } = useAuth();
  
  // Only use remounting key for coaches when they switch students
  const key = userProfile?.role === 'coach' 
    ? `video-${selectedStudent?.id || 'none'}` 
    : 'video-student';
    
  return <VideoCallTabScreen key={key} />;
};

export const ChatTabScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>İletişim</Text>
      </View>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#249096',
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: {
            backgroundColor: '#249096',
          },
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
        }}
      >
        <Tab.Screen name="Messages" component={ChatScreenWrapper} options={{ title: 'Mesajlar' }} />
        <Tab.Screen name="VideoCall" component={VideoCallTabScreenWrapper} options={{ title: 'Video Görüşme' }} />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
}); 