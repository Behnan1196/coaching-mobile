import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {
  StreamVideo,
  StreamCall,
  CallContent,
  useCallStateHooks,
  CallingState,
} from '@stream-io/video-react-native-sdk';
import { useStream } from '../contexts/StreamContext';

interface VideoCallScreenProps {
  onCallEnd: () => void;
}

export const VideoCallScreen: React.FC<VideoCallScreenProps> = ({ onCallEnd }) => {
  const { videoClient, videoCall, startVideoCall, endVideoCall } = useStream();

  useEffect(() => {
    // Auto-join the call when the screen loads
    if (videoCall) {
      console.log('🎥 [VIDEO SCREEN] Auto-joining video call...');
      startVideoCall();
    }
  }, [videoCall, startVideoCall]);

  if (!videoClient || !videoCall) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StreamVideo client={videoClient}>
        <StreamCall call={videoCall}>
          <VideoCallContent onCallEnd={onCallEnd} />
        </StreamCall>
      </StreamVideo>
    </SafeAreaView>
  );
};

const VideoCallContent: React.FC<{ onCallEnd: () => void }> = ({ onCallEnd }) => {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const { endVideoCall } = useStream();
  const callingState = useCallCallingState();
  const participants = useParticipants();

  // Handle call state changes
  useEffect(() => {
    console.log('🔄 [CALL STATE] Current calling state:', callingState);
    console.log('🔄 [CALL STATE] Participants count:', participants.length);
    
    if (callingState === CallingState.LEFT) {
      console.log('🔄 [CALL STATE] Call left, triggering onCallEnd');
      onCallEnd();
    }
  }, [callingState, participants.length, onCallEnd]);

  return (
    <View style={styles.callContainer}>
      {/* Main video content - Stream.io handles all controls internally */}
      <CallContent />
      
      {/* Optional: Status indicator */}
      <View style={styles.statusContainer}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {callingState === CallingState.JOINING && "Katılıyor..."}
            {callingState === CallingState.JOINED && `📹 Canlı (${participants.length} kişi)`}
            {callingState === CallingState.IDLE && "Bağlantı bekleniyor..."}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  callContainer: {
    flex: 1,
  },
  statusContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1000,
  },
  statusBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 