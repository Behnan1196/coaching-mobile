import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { getPendingVideoInvites, sendVideoInvite } from '../lib/notifications';
import { useAuth } from '../contexts/AuthContext';

interface VideoInvite {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user_name: string;
  to_user_name: string;
  message?: string;
  created_at: string;
  expires_at: string;
  status: string;
}

interface VideoInviteHandlerProps {
  visible: boolean;
  onClose: () => void;
  targetUserId?: string;
  targetUserName?: string;
}

export default function VideoInviteHandler({ 
  visible, 
  onClose, 
  targetUserId, 
  targetUserName 
}: VideoInviteHandlerProps) {
  const { user } = useAuth();
  const [receivedInvites, setReceivedInvites] = useState<VideoInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<VideoInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

  // Fetch pending invites
  const fetchInvites = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await getPendingVideoInvites();
      if (result.success) {
        setReceivedInvites(result.receivedInvites);
        setSentInvites(result.sentInvites);
      } else {
        Alert.alert('Hata', result.error || 'Davetler yüklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Send video invite
  const handleSendInvite = async () => {
    if (!targetUserId || !targetUserName) {
      Alert.alert('Hata', 'Hedef kullanıcı bilgileri eksik');
      return;
    }

    setSendingInvite(true);
    try {
      const result = await sendVideoInvite(targetUserId, inviteMessage.trim() || undefined);
      if (result.success) {
        // Success - just clear form and close, no alert needed
        setInviteMessage('');
        onClose();
      } else {
        Alert.alert('Hata', result.error || 'Davet gönderilirken hata oluştu');
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu');
    } finally {
      setSendingInvite(false);
    }
  };

  // Refresh invites when modal becomes visible
  useEffect(() => {
    if (visible) {
      fetchInvites();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📹 Video Görüşme Davetleri</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Send Invite Section */}
        {targetUserId && targetUserName && (
          <View style={styles.sendSection}>
            <Text style={styles.sectionTitle}>
              {targetUserName} adlı kişiye davet gönder
            </Text>
            
            <TouchableOpacity
              style={[styles.sendButton, sendingInvite && styles.disabledButton]}
              onPress={handleSendInvite}
              disabled={sendingInvite}
            >
              <Text style={styles.sendButtonText}>
                {sendingInvite ? 'Gönderiliyor...' : '📹 Video Daveti Gönder'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Received Invites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Gelen Davetler ({receivedInvites.length})
          </Text>
          
          {receivedInvites.length === 0 ? (
            <Text style={styles.emptyText}>Henüz davet yok</Text>
          ) : (
            receivedInvites.map((invite) => (
              <View key={invite.id} style={styles.inviteCard}>
                <Text style={styles.inviteFrom}>
                  📹 {invite.from_user_name}
                </Text>
                {invite.message && (
                  <Text style={styles.inviteMessage}>"{invite.message}"</Text>
                )}
                <Text style={styles.inviteTime}>
                  {new Date(invite.created_at).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                
                <View style={styles.inviteActions}>
                  <TouchableOpacity style={styles.acceptButton}>
                    <Text style={styles.acceptButtonText}>Katıl</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineButton}>
                    <Text style={styles.declineButtonText}>Reddet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Sent Invites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Gönderilen Davetler ({sentInvites.length})
          </Text>
          
          {sentInvites.length === 0 ? (
            <Text style={styles.emptyText}>Henüz davet göndermediniz</Text>
          ) : (
            sentInvites.map((invite) => (
              <View key={invite.id} style={styles.inviteCard}>
                <Text style={styles.inviteTo}>
                  📹 {invite.to_user_name} adlı kişiye
                </Text>
                {invite.message && (
                  <Text style={styles.inviteMessage}>"{invite.message}"</Text>
                )}
                <Text style={styles.inviteTime}>
                  {new Date(invite.created_at).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <Text style={styles.inviteStatus}>Bekleniyor...</Text>
              </View>
            ))
          )}
        </View>

        {/* Info */}
        <Text style={styles.infoText}>
          💡 Video görüşme davetleri 5 dakika sonra otomatik olarak sona erer
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d',
  },
  sendSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 15,
  },
  sendButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#6c757d',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  inviteCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  inviteFrom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 5,
  },
  inviteTo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 5,
  },
  inviteMessage: {
    fontSize: 14,
    color: '#495057',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  inviteTime: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 10,
  },
  inviteStatus: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '500',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  declineButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    padding: 20,
  },
});
