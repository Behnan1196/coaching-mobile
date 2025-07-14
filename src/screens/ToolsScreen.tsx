import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { supabase } from '../lib/supabase';
import { UserProfile, Goal, ProfileForm, GoalForm } from '../types/database';

const Tab = createMaterialTopTabNavigator();

const BilgilerimScreen = () => {
  const { user, userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  
  // Early return if supabase is not available
  if (!supabase) {
    return (
      <View style={styles.centered}>
        <Text>Veritabanı bağlantısı yapılandırılmamış</Text>
      </View>
    );
  }

  // Determine which student profile to work with
  const targetStudent = userProfile?.role === 'coach' ? selectedStudent : userProfile;

  // Show message if coach hasn't selected a student
  if (userProfile?.role === 'coach' && !selectedStudent) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noStudentText}>
          Lütfen önce bir öğrenci seçin
        </Text>
      </View>
    );
  }
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState<GoalForm>({
    goal_type: 'custom',
    title: '',
    description: '',
    target_value: '',
    current_value: '',
    target_date: '',
    priority: 'medium',
    status: 'active'
  });
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    school: '',
    tutoring_center: '',
    target_university: '',
    target_department: '',
    yks_score: '',
    start_date: '',
    parent_name: '',
    parent_phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (targetStudent) {
      loadProfile();
      loadGoals();
    }
  }, [targetStudent]);

  const loadProfile = async () => {
    if (!targetStudent?.id || !supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', targetStudent.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      setProfile(data);
      setProfileForm({
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        department: data.department || '',
        school: data.school || '',
        tutoring_center: data.tutoring_center || '',
        target_university: data.target_university || '',
        target_department: data.target_department || '',
        yks_score: data.yks_score?.toString() || '',
        start_date: data.start_date || '',
        parent_name: data.parent_name || '',
        parent_phone: data.parent_phone || '',
        address: data.address || '',
        notes: data.notes || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = async () => {
    if (!targetStudent?.id || !supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('student_goals')
        .select('*')
        .eq('student_id', targetStudent.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading goals:', error);
        return;
      }

      setGoals(data || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadGoals()]);
    setRefreshing(false);
  };

  const saveProfile = async () => {
    if (!profile || !targetStudent?.id || !supabase) return;

    setSaving(true);
    try {
      const updateData = {
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        department: profileForm.department,
        school: profileForm.school,
        tutoring_center: profileForm.tutoring_center,
        target_university: profileForm.target_university,
        target_department: profileForm.target_department,
        yks_score: profileForm.yks_score ? parseInt(profileForm.yks_score) : null,
        start_date: profileForm.start_date,
        parent_name: profileForm.parent_name,
        parent_phone: profileForm.parent_phone,
        address: profileForm.address,
        notes: profileForm.notes
      };

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', targetStudent.id);

      if (error) {
        Alert.alert('Hata', 'Profil güncellenirken hata oluştu');
        console.error('Error updating profile:', error);
        return;
      }

      Alert.alert('Başarılı', 'Profil başarıyla güncellendi');
      loadProfile();
    } catch (error) {
      Alert.alert('Hata', 'Profil güncellenirken hata oluştu');
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const openGoalModal = () => {
    setGoalForm({
      goal_type: 'custom',
      title: '',
      description: '',
      target_value: '',
      current_value: '',
      target_date: '',
      priority: 'medium',
      status: 'active'
    });
    setEditingGoal(null);
    setShowGoalModal(true);
  };

  const openEditGoalModal = (goal: Goal) => {
    setGoalForm({
      goal_type: goal.goal_type,
      title: goal.title,
      description: goal.description || '',
      target_value: goal.target_value || '',
      current_value: goal.current_value || '',
      target_date: goal.target_date || '',
      priority: goal.priority,
      status: goal.status
    });
    setEditingGoal(goal);
    setShowGoalModal(true);
  };

  const closeGoalModal = () => {
    setShowGoalModal(false);
    setEditingGoal(null);
  };

  const saveGoal = async () => {
    if (!goalForm.title.trim()) {
      Alert.alert('Hata', 'Hedef başlığı gereklidir');
      return;
    }

    if (!supabase) {
      Alert.alert('Hata', 'Veritabanı bağlantısı mevcut değil');
      return;
    }

    if (!targetStudent) {
      Alert.alert('Hata', 'Öğrenci bilgisi mevcut değil');
      return;
    }

    try {
      if (editingGoal) {
        const { error } = await supabase
          .from('student_goals')
          .update({
            goal_type: goalForm.goal_type,
            title: goalForm.title,
            description: goalForm.description,
            target_value: goalForm.target_value,
            current_value: goalForm.current_value,
            target_date: goalForm.target_date,
            priority: goalForm.priority,
            status: goalForm.status
          })
          .eq('id', editingGoal.id);

        if (error) {
          Alert.alert('Hata', 'Hedef güncellenirken hata oluştu');
          return;
        }

        Alert.alert('Başarılı', 'Hedef başarıyla güncellendi');
      } else {
        const { error } = await supabase
          .from('student_goals')
          .insert({
            student_id: targetStudent.id,
            coach_id: user?.id, // Coach or student who created the goal
            goal_type: goalForm.goal_type,
            title: goalForm.title,
            description: goalForm.description,
            target_value: goalForm.target_value,
            current_value: goalForm.current_value,
            target_date: goalForm.target_date,
            priority: goalForm.priority,
            status: goalForm.status,
            is_active: true,
            created_by: user?.id
          });

        if (error) {
          Alert.alert('Hata', 'Hedef eklenirken hata oluştu');
          return;
        }

        Alert.alert('Başarılı', 'Hedef başarıyla eklendi');
      }

      closeGoalModal();
      loadGoals();
    } catch (error) {
      Alert.alert('Hata', 'Hedef kaydedilirken hata oluştu');
      console.error('Error saving goal:', error);
    }
  };

  const deleteGoal = async (goal: Goal) => {
    Alert.alert(
      'Hedefi Sil',
      'Bu hedefi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!supabase) {
              Alert.alert('Hata', 'Veritabanı bağlantısı mevcut değil');
              return;
            }
            
            try {
              const { error } = await supabase
                .from('student_goals')
                .update({ is_active: false })
                .eq('id', goal.id);

              if (error) {
                Alert.alert('Hata', 'Hedef silinirken hata oluştu');
                return;
              }

              Alert.alert('Başarılı', 'Hedef başarıyla silindi');
              loadGoals();
            } catch (error) {
              Alert.alert('Hata', 'Hedef silinirken hata oluştu');
              console.error('Error deleting goal:', error);
            }
          }
        }
      ]
    );
  };

  const renderGoalItem = ({ item }: { item: Goal }) => (
    <View style={styles.goalItem}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalTitle}>{item.title}</Text>
        <View style={styles.goalActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditGoalModal(item)}
          >
            <Text style={styles.editButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteGoal(item)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      {item.description && (
        <Text style={styles.goalDescription}>{item.description}</Text>
      )}
             <View style={styles.goalMeta}>
         <Text style={[styles.goalBadge, 
           item.priority === 'high' ? styles.priorityHigh :
           item.priority === 'medium' ? styles.priorityMedium : styles.priorityLow
         ]}>
           {item.priority === 'high' ? 'Yüksek' : item.priority === 'medium' ? 'Orta' : 'Düşük'}
         </Text>
         <Text style={[styles.goalBadge,
           item.status === 'completed' ? styles.statusCompleted :
           item.status === 'active' ? styles.statusActive :
           item.status === 'paused' ? styles.statusPaused : styles.statusCancelled
         ]}>
           {item.status === 'completed' ? 'Tamamlandı' : 
            item.status === 'active' ? 'Aktif' : 
            item.status === 'paused' ? 'Duraklatıldı' : 'İptal'}
         </Text>
       </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👤 Bilgilerim</Text>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveProfile}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Kullanıcı Adı (Salt okunur)</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={profile?.email.split('@')[0] || ''}
                  editable={false}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Tam Adı *</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.full_name}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, full_name: text }))}
                  placeholder="Ad Soyad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={profileForm.email}
                  editable={false}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Telefon</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.phone}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, phone: text }))}
                  placeholder="5551234567"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bölüm</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.department}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, department: text }))}
                  placeholder="Sayısal/Eşit Ağırlık/Sözel/Dil"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Okul</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.school}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, school: text }))}
                  placeholder="Okul adı"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Dershane</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.tutoring_center}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, tutoring_center: text }))}
                  placeholder="Dershane adı"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Hedef Üniversite</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.target_university}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, target_university: text }))}
                  placeholder="Hedef üniversite"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Hedef Bölüm</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.target_department}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, target_department: text }))}
                  placeholder="Hedef bölüm"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>YKS Puanı</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.yks_score}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, yks_score: text }))}
                  placeholder="YKS puanı"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Başlama Tarihi</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.start_date}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, start_date: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Veli Adı</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.parent_name}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, parent_name: text }))}
                  placeholder="Veli adı"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Veli Telefonu</Text>
              <TextInput
                style={styles.input}
                value={profileForm.parent_phone}
                onChangeText={(text) => setProfileForm(prev => ({ ...prev, parent_phone: text }))}
                placeholder="Veli telefonu"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Adres</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={profileForm.address}
                onChangeText={(text) => setProfileForm(prev => ({ ...prev, address: text }))}
                placeholder="Adres bilgileri"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Notlar</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={profileForm.notes}
                onChangeText={(text) => setProfileForm(prev => ({ ...prev, notes: text }))}
                placeholder="Öğrenci hakkında notlar"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Hedefler</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={openGoalModal}
            >
              <Text style={styles.addButtonText}>+ Hedef Ekle</Text>
            </TouchableOpacity>
          </View>

          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Henüz hedef eklenmemiş</Text>
            </View>
          ) : (
            <FlatList
              data={goals}
              renderItem={renderGoalItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Goal Modal */}
      <Modal visible={showGoalModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingGoal ? 'Hedefi Düzenle' : 'Yeni Hedef'}
              </Text>
              <TouchableOpacity onPress={closeGoalModal}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Hedef Başlığı *</Text>
                <TextInput
                  style={styles.input}
                  value={goalForm.title}
                  onChangeText={(text) => setGoalForm(prev => ({ ...prev, title: text }))}
                  placeholder="Hedef başlığı"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Açıklama</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={goalForm.description}
                  onChangeText={(text) => setGoalForm(prev => ({ ...prev, description: text }))}
                  placeholder="Hedef açıklaması"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Hedef Değer</Text>
                  <TextInput
                    style={styles.input}
                    value={goalForm.target_value}
                    onChangeText={(text) => setGoalForm(prev => ({ ...prev, target_value: text }))}
                    placeholder="Hedef değer"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Mevcut Değer</Text>
                  <TextInput
                    style={styles.input}
                    value={goalForm.current_value}
                    onChangeText={(text) => setGoalForm(prev => ({ ...prev, current_value: text }))}
                    placeholder="Mevcut değer"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Hedef Tarihi</Text>
                <TextInput
                  style={styles.input}
                  value={goalForm.target_date}
                  onChangeText={(text) => setGoalForm(prev => ({ ...prev, target_date: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={closeGoalModal}>
                <Text style={styles.modalCancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={saveGoal}>
                <Text style={styles.modalSaveButtonText}>
                  {editingGoal ? 'Güncelle' : 'Kaydet'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const MockExamsScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>Mock Exams</Text>
    <Text style={styles.placeholder}>Mock exam content will go here</Text>
  </View>
);

const UsefulLinksScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>Useful Links</Text>
    <Text style={styles.placeholder}>Useful links and resources will go here</Text>
  </View>
);

const PomodoroTimerScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>Pomodoro Timer</Text>
    <Text style={styles.placeholder}>Pomodoro timer will go here</Text>
  </View>
);

export const ToolsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tools</Text>
      </View>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: {
            backgroundColor: '#3B82F6',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
          tabBarScrollEnabled: true,
        }}
      >
        <Tab.Screen name="Profile" component={BilgilerimScreen} options={{ title: 'Bilgilerim' }} />
        <Tab.Screen name="MockExams" component={MockExamsScreen} options={{ title: 'Mock Exams' }} />
        <Tab.Screen name="Links" component={UsefulLinksScreen} options={{ title: 'Useful Links' }} />
        <Tab.Screen name="Pomodoro" component={PomodoroTimerScreen} options={{ title: 'Pomodoro' }} />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  placeholder: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  // New styles for BilgilerimScreen
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.7,
  },
  form: {
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  label: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  goalItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 0.5,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    marginLeft: 10,
    padding: 5,
  },
  editButtonText: {
    fontSize: 18,
    color: '#3B82F6',
  },
  deleteButton: {
    marginLeft: 10,
    padding: 5,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#EF4444',
  },
  goalDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 5,
  },
  goalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  goalBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  priorityHigh: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  priorityMedium: {
    backgroundColor: '#E0F2FE',
    color: '#155E75',
  },
  priorityLow: {
    backgroundColor: '#F3E8FF',
    color: '#6B21A8',
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusCompleted: {
    backgroundColor: '#E0F2FE',
    color: '#155E75',
  },
  statusPaused: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalContent: {
    padding: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    marginRight: 10,
  },
  modalCancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    marginLeft: 10,
  },
  modalSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noStudentText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 20,
  },
}); 