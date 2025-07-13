import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface UserProfileMenuProps {
  onSettingsPress?: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ 
  onSettingsPress 
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { userProfile, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Oturumunuzu kapatmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            setMenuVisible(false);
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  const handleSettings = () => {
    setMenuVisible(false);
    onSettingsPress?.();
  };

  const getUserInitial = () => {
    return userProfile?.full_name?.charAt(0)?.toUpperCase() || 'U';
  };

  const getUserRole = () => {
    switch (userProfile?.role) {
      case 'coach':
        return 'Koç';
      case 'student':
        return 'Öğrenci';
      case 'coordinator':
        return 'Koordinatör';
      case 'admin':
        return 'Admin';
      default:
        return 'Kullanıcı';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.avatarButton}
        onPress={() => setMenuVisible(true)}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getUserInitial()}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.userInfo}>
              <View style={styles.userInfoHeader}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{getUserInitial()}</Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>
                    {userProfile?.full_name || 'Kullanıcı'}
                  </Text>
                  <Text style={styles.userRole}>{getUserRole()}</Text>
                  {userProfile?.email && (
                    <Text style={styles.userEmail}>{userProfile.email}</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.menuItems}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleSettings}
              >
                <Ionicons name="settings-outline" size={20} color="#374151" />
                <Text style={styles.menuItemText}>Ayarlar</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.separator} />

              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={[styles.menuItemText, styles.logoutText]}>
                  Çıkış Yap
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 50,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  userInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  logoutItem: {
    paddingTop: 16,
  },
  logoutText: {
    color: '#EF4444',
  },
}); 