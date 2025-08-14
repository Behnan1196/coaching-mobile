import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

interface SettingsScreenProps {}

export const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const { userProfile, user, signOut, refreshUserProfile } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar_url: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Populate form with current user data
    setSettingsForm({
      full_name: userProfile?.full_name || '',
      email: user?.email || '',
      phone: userProfile?.phone || '',
      avatar_url: userProfile?.avatar_url || '',
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setAvatarPreview(userProfile?.avatar_url || null);
  }, [userProfile, user]);

  const handleAvatarUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (5MB limit)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Hata', 'Dosya boyutu 5MB\'dan küçük olmalıdır.');
          return;
        }

        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        setAvatarPreview(base64Image);
        setSettingsForm(prev => ({ ...prev, avatar_url: base64Image }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken hata oluştu.');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setSettingsForm(prev => ({ ...prev, avatar_url: '' }));
  };

  const updateProfile = async () => {
    if (!user || !supabase) return;
    
    setLoading(true);
    try {
      // Basic profile updates that should always work
      const basicUpdates = {
        full_name: settingsForm.full_name,
        phone: settingsForm.phone,
        updated_at: new Date().toISOString()
      };

      // Try to include settings columns if they exist
      const settingsUpdates = {
        avatar_url: settingsForm.avatar_url,
      };

      // Combine all updates
      const updates = { ...basicUpdates, ...settingsUpdates };

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Hata', 'Profil güncellenirken hata oluştu: ' + error.message);
        return;
      }

      Alert.alert('Başarılı', 'Profil başarıyla güncellendi!');
      
      // Refresh the user profile in the context
      await refreshUserProfile();
      
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Hata', 'Profil güncellenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    if (settingsForm.new_password !== settingsForm.confirm_password) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor!');
      return;
    }

    if (settingsForm.new_password.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır!');
      return;
    }

    if (!supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: settingsForm.new_password
      });

      if (error) {
        console.error('Error updating password:', error);
        Alert.alert('Hata', 'Şifre güncellenirken hata oluştu: ' + error.message);
        return;
      }

      // Clear form fields
      setSettingsForm(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));
      
      // Stop loading state
      setLoading(false);
      
      // Show success message and logout immediately
      Alert.alert(
        'Başarılı', 
        'Şifre başarıyla güncellendi! Güvenlik nedeniyle yeniden giriş yapmanız gerekiyor.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              // Simple direct logout
              signOut();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error updating password:', error);
      Alert.alert('Hata', 'Şifre güncellenirken hata oluştu.');
      setLoading(false);
    }
  };

  const getUserInitial = () => {
    return userProfile?.full_name?.charAt(0)?.toUpperCase() || 'U';
  };

  const renderTabButton = (tabId: string, title: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tabId && styles.activeTabButton
      ]}
      onPress={() => setActiveTab(tabId)}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={activeTab === tabId ? '#3B82F6' : '#6B7280'} 
      />
      <Text style={[
        styles.tabButtonText,
        activeTab === tabId && styles.activeTabButtonText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderProfileSettings = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
      
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <Text style={styles.label}>Profil Fotoğrafı</Text>
        <View style={styles.avatarContainer}>
          <TouchableOpacity style={styles.avatarButton} onPress={handleAvatarUpload}>
            {avatarPreview ? (
              <Image source={{ uri: avatarPreview }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>{getUserInitial()}</Text>
              </View>
            )}
            <View style={styles.avatarEditOverlay}>
              <Ionicons name="camera" size={20} color="white" />
            </View>
          </TouchableOpacity>
          {avatarPreview && (
            <TouchableOpacity style={styles.removeAvatarButton} onPress={handleRemoveAvatar}>
              <Text style={styles.removeAvatarText}>Kaldır</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Profile Form */}
      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ad Soyad</Text>
          <TextInput
            style={styles.input}
            value={settingsForm.full_name}
            onChangeText={(text) => setSettingsForm(prev => ({ ...prev, full_name: text }))}
            placeholder="Ad Soyad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={settingsForm.email}
            editable={false}
            placeholder="E-posta"
          />
          <Text style={styles.helperText}>E-posta adresi değiştirilemez</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={styles.input}
            value={settingsForm.phone}
            onChangeText={(text) => setSettingsForm(prev => ({ ...prev, phone: text }))}
            placeholder="Telefon"
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={updateProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Profili Güncelle</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSecuritySettings = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Güvenlik Ayarları</Text>
      
      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mevcut Şifre</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={settingsForm.current_password}
              onChangeText={(text) => setSettingsForm(prev => ({ ...prev, current_password: text }))}
              placeholder="Mevcut şifre"
              secureTextEntry={!showCurrentPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <Ionicons 
                name={showCurrentPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Yeni Şifre</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={settingsForm.new_password}
              onChangeText={(text) => setSettingsForm(prev => ({ ...prev, new_password: text }))}
              placeholder="Yeni şifre"
              secureTextEntry={!showNewPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Ionicons 
                name={showNewPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Yeni Şifre (Tekrar)</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={settingsForm.confirm_password}
              onChangeText={(text) => setSettingsForm(prev => ({ ...prev, confirm_password: text }))}
              placeholder="Yeni şifre tekrar"
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={updatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Şifreyi Güncelle</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSettings();
      case 'security':
        return renderSecuritySettings();
      default:
        return renderProfileSettings();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.headerSpacer} />
      </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {renderTabButton('profile', 'Profil', 'person-outline')}
            {renderTabButton('security', 'Güvenlik', 'shield-outline')}
          </ScrollView>
        </View>

      {/* Tab Content */}
      {renderTabContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  tabNavigation: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  activeTabButton: {
    backgroundColor: '#EBF4FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabButtonText: {
    color: '#3B82F6',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  avatarSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarButton: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  removeAvatarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  removeAvatarText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  passwordToggle: {
    padding: 10,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },

});
