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
  RefreshControl,
  Linking,
  Dimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { supabase } from '../lib/supabase';
import { UserProfile, Goal, ProfileForm, GoalForm, MockExamResult, EducationalLink } from '../types/database';

const Tab = createMaterialTopTabNavigator();

const BilgilerimScreen = () => {
  const { user, userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  
  // All hooks must be called before any conditional logic
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
            style={styles.goalEditButton}
            onPress={() => openEditGoalModal(item)}
          >
            <Ionicons name="create-outline" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.goalDeleteButton}
            onPress={() => deleteGoal(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
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

// Mock Exams Screen Implementation
const MockExamsScreen = () => {
  const { user, userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  
  // All hooks must be called before any conditional logic
  const [mockExamResults, setMockExamResults] = useState<MockExamResult[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState<MockExamResult | null>(null);
  const [examModalTab, setExamModalTab] = useState<'TYT' | 'AYT' | 'Tarama'>('TYT');
  const [selectedTaramaSubject, setSelectedTaramaSubject] = useState('');
  const [selectedTaramaQuestionCount, setSelectedTaramaQuestionCount] = useState(10);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTaramaSubjectPicker, setShowTaramaSubjectPicker] = useState(false);
  const [examForm, setExamForm] = useState({
    exam_type: 'TYT' as 'TYT' | 'AYT' | 'Tarama',
    exam_date: '',
    exam_name: '',
    exam_duration: 180,
    tyt_turkce_correct: 0,
    tyt_turkce_wrong: 0,
    tyt_matematik_correct: 0,
    tyt_matematik_wrong: 0,
    tyt_geometri_correct: 0,
    tyt_geometri_wrong: 0,
    tyt_tarih_correct: 0,
    tyt_tarih_wrong: 0,
    tyt_cografya_correct: 0,
    tyt_cografya_wrong: 0,
    tyt_felsefe_correct: 0,
    tyt_felsefe_wrong: 0,
    tyt_din_correct: 0,
    tyt_din_wrong: 0,
    tyt_fizik_correct: 0,
    tyt_fizik_wrong: 0,
    tyt_kimya_correct: 0,
    tyt_kimya_wrong: 0,
    tyt_biyoloji_correct: 0,
    tyt_biyoloji_wrong: 0,
    ayt_matematik_correct: 0,
    ayt_matematik_wrong: 0,
    ayt_geometri_correct: 0,
    ayt_geometri_wrong: 0,
    tarama_lessons: [] as Array<{ subject: string; question_count: number; correct: number; wrong: number }>,
    notes: ''
  });

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExamForm(prev => ({
        ...prev,
        exam_date: selectedDate.toISOString().split('T')[0]
      }));
    }
  };

  // useEffect hook must be before conditional logic
  React.useEffect(() => {
    const targetStudent = userProfile?.role === 'coach' ? selectedStudent : userProfile;
    if (targetStudent) {
      loadMockExamResults();
      loadSubjects();
    }
  }, [userProfile, selectedStudent]);

  // Define targetStudent after all hooks
  const targetStudent = userProfile?.role === 'coach' ? selectedStudent : userProfile;

  // Define functions after hooks
  const loadSubjects = async () => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading subjects:', error);
        return;
      }

      setSubjects(data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadMockExamResults = async () => {
    if (!targetStudent?.id || !supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('mock_exam_results')
        .select('*')
        .eq('student_id', targetStudent.id)
        .eq('is_active', true)
        .order('exam_date', { ascending: false });

      if (error) {
        console.error('Error loading mock exam results:', error);
        return;
      }

      setMockExamResults(data || []);
    } catch (error) {
      console.error('Error loading mock exam results:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefreshExams = async () => {
    setRefreshing(true);
    await loadMockExamResults();
    setRefreshing(false);
  };

  // Conditional rendering after hooks
  if (userProfile?.role === 'coach' && !selectedStudent) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noStudentText}>Lütfen önce bir öğrenci seçin</Text>
      </View>
    );
  }

  const openExamModal = () => {
    setEditingExam(null);
    const today = new Date().toISOString().split('T')[0];
    setExamForm({
      exam_type: 'TYT',
      exam_date: today,
      exam_name: '',
      exam_duration: 180,
      tyt_turkce_correct: 0,
      tyt_turkce_wrong: 0,
      tyt_matematik_correct: 0,
      tyt_matematik_wrong: 0,
      tyt_geometri_correct: 0,
      tyt_geometri_wrong: 0,
      tyt_tarih_correct: 0,
      tyt_tarih_wrong: 0,
      tyt_cografya_correct: 0,
      tyt_cografya_wrong: 0,
      tyt_felsefe_correct: 0,
      tyt_felsefe_wrong: 0,
      tyt_din_correct: 0,
      tyt_din_wrong: 0,
      tyt_fizik_correct: 0,
      tyt_fizik_wrong: 0,
      tyt_kimya_correct: 0,
      tyt_kimya_wrong: 0,
      tyt_biyoloji_correct: 0,
      tyt_biyoloji_wrong: 0,
      ayt_matematik_correct: 0,
      ayt_matematik_wrong: 0,
      ayt_geometri_correct: 0,
      ayt_geometri_wrong: 0,
      tarama_lessons: [],
      notes: ''
    });
    setExamModalTab('TYT');
    setSelectedTaramaSubject('');
    setSelectedTaramaQuestionCount(10);
    setShowExamModal(true);
  };

  const openEditExamModal = (examResult: MockExamResult) => {
    setEditingExam(examResult);
    setExamForm({
      exam_type: examResult.exam_type,
      exam_date: examResult.exam_date,
      exam_name: examResult.exam_name,
      exam_duration: examResult.exam_duration || 180,
      
      // TYT Scores - Türkçe
      tyt_turkce_correct: examResult.tyt_turkce_correct || 0,
      tyt_turkce_wrong: examResult.tyt_turkce_wrong || 0,
      
      // TYT Scores - Matematik
      tyt_matematik_correct: examResult.tyt_matematik_correct || 0,
      tyt_matematik_wrong: examResult.tyt_matematik_wrong || 0,
      tyt_geometri_correct: examResult.tyt_geometri_correct || 0,
      tyt_geometri_wrong: examResult.tyt_geometri_wrong || 0,
      
      // TYT Scores - Sosyal Bilimler
      tyt_tarih_correct: examResult.tyt_tarih_correct || 0,
      tyt_tarih_wrong: examResult.tyt_tarih_wrong || 0,
      tyt_cografya_correct: examResult.tyt_cografya_correct || 0,
      tyt_cografya_wrong: examResult.tyt_cografya_wrong || 0,
      tyt_felsefe_correct: examResult.tyt_felsefe_correct || 0,
      tyt_felsefe_wrong: examResult.tyt_felsefe_wrong || 0,
      tyt_din_correct: examResult.tyt_din_correct || 0,
      tyt_din_wrong: examResult.tyt_din_wrong || 0,
      
      // TYT Scores - Fen Bilimleri
      tyt_fizik_correct: examResult.tyt_fizik_correct || 0,
      tyt_fizik_wrong: examResult.tyt_fizik_wrong || 0,
      tyt_kimya_correct: examResult.tyt_kimya_correct || 0,
      tyt_kimya_wrong: examResult.tyt_kimya_wrong || 0,
      tyt_biyoloji_correct: examResult.tyt_biyoloji_correct || 0,
      tyt_biyoloji_wrong: examResult.tyt_biyoloji_wrong || 0,
      
      // AYT Scores
      ayt_matematik_correct: examResult.ayt_matematik_correct || 0,
      ayt_matematik_wrong: examResult.ayt_matematik_wrong || 0,
      ayt_geometri_correct: examResult.ayt_geometri_correct || 0,
      ayt_geometri_wrong: examResult.ayt_geometri_wrong || 0,
      
      // Tarama Scores
      tarama_lessons: examResult.tarama_lessons || [],
      
      notes: examResult.notes || ''
    });
    setExamModalTab(examResult.exam_type);
    setSelectedTaramaSubject('');
    setSelectedTaramaQuestionCount(10);
    setShowExamModal(true);
  };

  const closeExamModal = () => {
    setShowExamModal(false);
    setEditingExam(null);
    setExamModalTab('TYT');
    setSelectedTaramaSubject('');
    setSelectedTaramaQuestionCount(10);
  };

  // Calculation helpers
  const calculateNet = (correct: number, wrong: number) => {
    return correct - (wrong * 0.25);
  };

  const calculateTYTTotals = () => {
    const matematikTotal = calculateNet(examForm.tyt_matematik_correct, examForm.tyt_matematik_wrong) +
                          calculateNet(examForm.tyt_geometri_correct, examForm.tyt_geometri_wrong);
    
    const sosyalTotal = calculateNet(examForm.tyt_tarih_correct, examForm.tyt_tarih_wrong) +
                      calculateNet(examForm.tyt_cografya_correct, examForm.tyt_cografya_wrong) +
                      calculateNet(examForm.tyt_felsefe_correct, examForm.tyt_felsefe_wrong) +
                      calculateNet(examForm.tyt_din_correct, examForm.tyt_din_wrong);
    
    const fenTotal = calculateNet(examForm.tyt_fizik_correct, examForm.tyt_fizik_wrong) +
                    calculateNet(examForm.tyt_kimya_correct, examForm.tyt_kimya_wrong) +
                    calculateNet(examForm.tyt_biyoloji_correct, examForm.tyt_biyoloji_wrong);
    
    const turkceNet = calculateNet(examForm.tyt_turkce_correct, examForm.tyt_turkce_wrong);
    
    const overallTotal = turkceNet + matematikTotal + sosyalTotal + fenTotal;
    
    return {
      turkce: turkceNet,
      matematik: matematikTotal,
      sosyal: sosyalTotal,
      fen: fenTotal,
      overall: overallTotal
    };
  };

  const calculateAYTTotal = () => {
    return calculateNet(examForm.ayt_matematik_correct, examForm.ayt_matematik_wrong) +
           calculateNet(examForm.ayt_geometri_correct, examForm.ayt_geometri_wrong);
  };

  const calculateTaramaTotal = () => {
    return examForm.tarama_lessons.reduce((sum, lesson) => 
      sum + calculateNet(lesson.correct, lesson.wrong), 0
    );
  };

  const addTaramaLesson = () => {
    if (!selectedTaramaSubject || selectedTaramaQuestionCount <= 0) {
      Alert.alert('Hata', 'Lütfen ders ve soru sayısı seçin');
      return;
    }

    // Check if subject already exists
    const exists = examForm.tarama_lessons.find(lesson => lesson.subject === selectedTaramaSubject);
    if (exists) {
      Alert.alert('Hata', 'Bu ders zaten eklenmiş');
      return;
    }

    const newLesson = {
      subject: selectedTaramaSubject,
      question_count: selectedTaramaQuestionCount,
      correct: 0,
      wrong: 0
    };

    setExamForm(prev => ({
      ...prev,
      tarama_lessons: [...prev.tarama_lessons, newLesson]
    }));

    setSelectedTaramaSubject('');
    setSelectedTaramaQuestionCount(10);
  };

  const removeTaramaLesson = (index: number) => {
    setExamForm(prev => ({
      ...prev,
      tarama_lessons: prev.tarama_lessons.filter((_, i) => i !== index)
    }));
  };

  const updateTaramaLesson = (index: number, field: 'correct' | 'wrong', value: number) => {
    setExamForm(prev => ({
      ...prev,
      tarama_lessons: prev.tarama_lessons.map((lesson, i) => 
        i === index ? { ...lesson, [field]: Math.max(0, Math.min(lesson.question_count, value)) } : lesson
      )
    }));
  };

  const saveExamResult = async () => {
    if (!targetStudent || !user || !examForm.exam_date) {
      Alert.alert('Hata', 'Sınav tarihi gereklidir.');
      return;
    }

    if (!supabase) {
      Alert.alert('Hata', 'Veritabanı bağlantısı mevcut değil');
      return;
    }

    // Use empty string if exam name is not provided (matches web behavior)
    const examName = examForm.exam_name.trim() || '';

    try {
      const examData = {
        student_id: targetStudent.id,
        coach_id: user.id,
        exam_type: examForm.exam_type,
        exam_date: examForm.exam_date,
        exam_name: examName,
        exam_duration: examForm.exam_duration,
        notes: examForm.notes.trim() || null,
        is_active: true,
        ...(examForm.exam_type === 'TYT' && {
          // TYT Raw scores
          tyt_turkce_correct: examForm.tyt_turkce_correct,
          tyt_turkce_wrong: examForm.tyt_turkce_wrong,
          tyt_matematik_correct: examForm.tyt_matematik_correct,
          tyt_matematik_wrong: examForm.tyt_matematik_wrong,
          tyt_geometri_correct: examForm.tyt_geometri_correct,
          tyt_geometri_wrong: examForm.tyt_geometri_wrong,
          tyt_tarih_correct: examForm.tyt_tarih_correct,
          tyt_tarih_wrong: examForm.tyt_tarih_wrong,
          tyt_cografya_correct: examForm.tyt_cografya_correct,
          tyt_cografya_wrong: examForm.tyt_cografya_wrong,
          tyt_felsefe_correct: examForm.tyt_felsefe_correct,
          tyt_felsefe_wrong: examForm.tyt_felsefe_wrong,
          tyt_din_correct: examForm.tyt_din_correct,
          tyt_din_wrong: examForm.tyt_din_wrong,
          tyt_fizik_correct: examForm.tyt_fizik_correct,
          tyt_fizik_wrong: examForm.tyt_fizik_wrong,
          tyt_kimya_correct: examForm.tyt_kimya_correct,
          tyt_kimya_wrong: examForm.tyt_kimya_wrong,
          tyt_biyoloji_correct: examForm.tyt_biyoloji_correct,
          tyt_biyoloji_wrong: examForm.tyt_biyoloji_wrong,
          
          // TYT Net scores
          tyt_turkce_net: calculateNet(examForm.tyt_turkce_correct, examForm.tyt_turkce_wrong),
          tyt_matematik_net: calculateNet(examForm.tyt_matematik_correct, examForm.tyt_matematik_wrong),
          tyt_geometri_net: calculateNet(examForm.tyt_geometri_correct, examForm.tyt_geometri_wrong),
          tyt_tarih_net: calculateNet(examForm.tyt_tarih_correct, examForm.tyt_tarih_wrong),
          tyt_cografya_net: calculateNet(examForm.tyt_cografya_correct, examForm.tyt_cografya_wrong),
          tyt_felsefe_net: calculateNet(examForm.tyt_felsefe_correct, examForm.tyt_felsefe_wrong),
          tyt_din_net: calculateNet(examForm.tyt_din_correct, examForm.tyt_din_wrong),
          tyt_fizik_net: calculateNet(examForm.tyt_fizik_correct, examForm.tyt_fizik_wrong),
          tyt_kimya_net: calculateNet(examForm.tyt_kimya_correct, examForm.tyt_kimya_wrong),
          tyt_biyoloji_net: calculateNet(examForm.tyt_biyoloji_correct, examForm.tyt_biyoloji_wrong),
          
          // TYT Totals
          ...(() => {
            const totals = calculateTYTTotals();
            return {
              tyt_total_net: totals.overall,
              tyt_matematik_total_net: totals.matematik,
              tyt_sosyal_total_net: totals.sosyal,
              tyt_fen_total_net: totals.fen
            };
          })()
        }),
        ...(examForm.exam_type === 'AYT' && {
          // AYT Raw scores
          ayt_matematik_correct: examForm.ayt_matematik_correct,
          ayt_matematik_wrong: examForm.ayt_matematik_wrong,
          ayt_geometri_correct: examForm.ayt_geometri_correct,
          ayt_geometri_wrong: examForm.ayt_geometri_wrong,
          
          // AYT Net scores
          ayt_matematik_net: calculateNet(examForm.ayt_matematik_correct, examForm.ayt_matematik_wrong),
          ayt_geometri_net: calculateNet(examForm.ayt_geometri_correct, examForm.ayt_geometri_wrong),
          
          // AYT Total
          ayt_total_net: calculateAYTTotal()
        }),
        ...(examForm.exam_type === 'Tarama' && {
          // Tarama lessons with nets
          tarama_lessons: examForm.tarama_lessons.map(lesson => ({
            ...lesson,
            net: calculateNet(lesson.correct, lesson.wrong)
          })),
          tarama_total_net: calculateTaramaTotal()
        })
      };

      if (editingExam) {
        const { error } = await supabase
          .from('mock_exam_results')
          .update(examData)
          .eq('id', editingExam.id);

        if (error) throw error;
        Alert.alert('Başarılı', 'Sınav sonucu güncellendi');
      } else {
        const { error } = await supabase
          .from('mock_exam_results')
          .insert([examData]);

        if (error) throw error;
        Alert.alert('Başarılı', 'Sınav sonucu eklendi');
      }

      await loadMockExamResults();
      closeExamModal();
    } catch (error) {
      console.error('Error saving exam result:', error);
      Alert.alert('Hata', 'Sınav sonucu kaydedilirken hata oluştu');
    }
  };

  const deleteExamResult = async (exam: MockExamResult) => {
    Alert.alert(
      'Sınav Sonucunu Sil',
      'Bu sınav sonucunu silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!supabase) return;
            
            try {
              const { error } = await supabase
                .from('mock_exam_results')
                .update({ is_active: false })
                .eq('id', exam.id);

              if (error) throw error;
              
              setMockExamResults(prev => prev.filter(e => e.id !== exam.id));
              Alert.alert('Başarılı', 'Sınav sonucu silindi');
            } catch (error) {
              console.error('Error deleting exam result:', error);
              Alert.alert('Hata', 'Sınav sonucu silinirken hata oluştu');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Sınav sonuçları yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mockExamsContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.tabTitle}>📊 Sınav Sonuçları</Text>
        <TouchableOpacity style={styles.headerButton} onPress={openExamModal}>
          <Text style={styles.headerButtonText}>+ Sınav Ekle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.fullWidthScrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshExams} />}
      >
        {mockExamResults.length > 0 ? (
          mockExamResults.map((result) => (
            <View key={result.id} style={styles.fullWidthExamCard}>
              <View style={styles.examHeader}>
                <View style={styles.examInfo}>
                  <View style={styles.examInfoRow}>
                    <View style={[
                      styles.examTypeTag,
                      result.exam_type === 'TYT' ? styles.tytTag :
                      result.exam_type === 'AYT' ? styles.aytTag :
                      styles.taramaTag
                    ]}>
                      <Text style={[
                        styles.examTypeTagText,
                        result.exam_type === 'TYT' ? styles.tytTagText :
                        result.exam_type === 'AYT' ? styles.aytTagText :
                        styles.taramaTagText
                      ]}>
                        {result.exam_type}
                      </Text>
                    </View>
                    {result.exam_name && (
                      <Text style={styles.examName}>{result.exam_name}</Text>
                    )}
                    <Text style={styles.examDate}>
                      {new Date(result.exam_date).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                </View>
                <View style={styles.examActions}>
                  <TouchableOpacity
                    style={styles.examEditButton}
                    onPress={() => openEditExamModal(result)}
                  >
                    <Ionicons name="create-outline" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.examDeleteButton}
                    onPress={() => deleteExamResult(result)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.examScores}>
                {result.exam_type === 'TYT' && (
                  <>
                    <View style={styles.scoreGrid}>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Türkçe</Text>
                        <Text style={styles.scoreValue}>
                          {((result.tyt_turkce_correct || 0) - (result.tyt_turkce_wrong || 0) / 4).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Matematik</Text>
                        <Text style={styles.scoreValue}>
                          {(((result.tyt_matematik_correct || 0) - (result.tyt_matematik_wrong || 0) / 4) + 
                            ((result.tyt_geometri_correct || 0) - (result.tyt_geometri_wrong || 0) / 4)).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Sosyal</Text>
                        <Text style={styles.scoreValue}>
                          {(((result.tyt_tarih_correct || 0) - (result.tyt_tarih_wrong || 0) / 4) + 
                            ((result.tyt_cografya_correct || 0) - (result.tyt_cografya_wrong || 0) / 4) + 
                            ((result.tyt_felsefe_correct || 0) - (result.tyt_felsefe_wrong || 0) / 4) + 
                            ((result.tyt_din_correct || 0) - (result.tyt_din_wrong || 0) / 4)).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Fen</Text>
                        <Text style={styles.scoreValue}>
                          {(((result.tyt_fizik_correct || 0) - (result.tyt_fizik_wrong || 0) / 4) + 
                            ((result.tyt_kimya_correct || 0) - (result.tyt_kimya_wrong || 0) / 4) + 
                            ((result.tyt_biyoloji_correct || 0) - (result.tyt_biyoloji_wrong || 0) / 4)).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.totalScore}>
                      <Text style={styles.totalLabel}>Toplam Net:</Text>
                      <Text style={styles.totalValue}>
                        {((result.tyt_turkce_correct || 0) - (result.tyt_turkce_wrong || 0) / 4 +
                          (result.tyt_matematik_correct || 0) - (result.tyt_matematik_wrong || 0) / 4 +
                          (result.tyt_geometri_correct || 0) - (result.tyt_geometri_wrong || 0) / 4 +
                          (result.tyt_tarih_correct || 0) - (result.tyt_tarih_wrong || 0) / 4 +
                          (result.tyt_cografya_correct || 0) - (result.tyt_cografya_wrong || 0) / 4 +
                          (result.tyt_felsefe_correct || 0) - (result.tyt_felsefe_wrong || 0) / 4 +
                          (result.tyt_din_correct || 0) - (result.tyt_din_wrong || 0) / 4 +
                          (result.tyt_fizik_correct || 0) - (result.tyt_fizik_wrong || 0) / 4 +
                          (result.tyt_kimya_correct || 0) - (result.tyt_kimya_wrong || 0) / 4 +
                          (result.tyt_biyoloji_correct || 0) - (result.tyt_biyoloji_wrong || 0) / 4).toFixed(2)}
                      </Text>
                    </View>
                  </>
                )}
                
                {result.exam_type === 'AYT' && (
                  <>
                    <View style={styles.scoreGrid}>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Matematik</Text>
                        <Text style={styles.scoreValue}>
                          {((result.ayt_matematik_correct || 0) - (result.ayt_matematik_wrong || 0) / 4).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Geometri</Text>
                        <Text style={styles.scoreValue}>
                          {((result.ayt_geometri_correct || 0) - (result.ayt_geometri_wrong || 0) / 4).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.totalScore}>
                      <Text style={styles.totalLabel}>Toplam Net:</Text>
                      <Text style={styles.totalValue}>
                        {((result.ayt_matematik_correct || 0) - (result.ayt_matematik_wrong || 0) / 4 +
                          (result.ayt_geometri_correct || 0) - (result.ayt_geometri_wrong || 0) / 4).toFixed(2)}
                      </Text>
                    </View>
                  </>
                )}

                {result.exam_type === 'Tarama' && (
                  <>
                    {result.tarama_lessons && result.tarama_lessons.length > 0 ? (
                      <>
                        <View style={styles.taramaLessons}>
                          {result.tarama_lessons.map((lesson: any, index: number) => (
                            <View key={index} style={styles.taramaLesson}>
                              <Text style={styles.taramaLessonName}>
                                {lesson.subject} ({lesson.question_count} soru)
                              </Text>
                              <Text style={styles.taramaLessonScore}>
                                {lesson.correct}D / {lesson.wrong}Y • Net: {((lesson.correct || 0) - (lesson.wrong || 0) / 4).toFixed(2)}
                              </Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.totalScore}>
                          <Text style={styles.totalLabel}>Toplam Net:</Text>
                          <Text style={styles.totalValue}>
                            {(result.tarama_lessons?.reduce((sum: number, lesson: any) => 
                              sum + ((lesson.correct || 0) - (lesson.wrong || 0) / 4), 0) || 0).toFixed(2)}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.noData}>Ders bilgisi mevcut değil</Text>
                    )}
                  </>
                )}

                {result.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notlar:</Text>
                    <Text style={styles.notesText}>{result.notes}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Henüz sınav sonucu yok</Text>
            {userProfile?.role === 'coach' && (
              <TouchableOpacity style={styles.addButton} onPress={openExamModal}>
                <Text style={styles.addButtonText}>İlk Sınavı Ekle</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Exam Modal */}
      {showExamModal && (
        <Modal visible={showExamModal} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeExamModal}>
                <Text style={styles.modalCloseButton}>İptal</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Sınav Sonucu</Text>
              <TouchableOpacity onPress={saveExamResult}>
                <Text style={styles.modalSaveButton}>Kaydet</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Sınav Adı</Text>
                  <TextInput
                    style={styles.input}
                    value={examForm.exam_name}
                    onChangeText={(text) => setExamForm(prev => ({ ...prev, exam_name: text }))}
                    placeholder="Sınav adı (isteğe bağlı)"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Sınav Tarihi *</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton} 
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.datePickerText}>
                      {examForm.exam_date || 'Tarih seçin'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={examForm.exam_date ? new Date(examForm.exam_date) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                  />
                )}

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Süre (dakika)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(examForm.exam_duration)}
                    onChangeText={(text) => setExamForm(prev => ({ ...prev, exam_duration: parseInt(text) || 180 }))}
                    placeholder="180"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Sınav Türü</Text>
                  <View style={styles.examTypeButtons}>
                    {['TYT', 'AYT', 'Tarama'].map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.examTypeButton,
                          examForm.exam_type === type && styles.activeExamTypeButton
                        ]}
                        onPress={() => setExamForm(prev => ({ ...prev, exam_type: type as any }))}
                      >
                        <Text style={[
                          styles.examTypeButtonText,
                          examForm.exam_type === type && styles.activeExamTypeButtonText
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* TYT Scores */}
                {examForm.exam_type === 'TYT' && (
                  <View style={styles.scoresSection}>
                    <Text style={styles.sectionTitle}>TYT Puanları</Text>
                    
                    {/* Türkçe */}
                    <View style={styles.subjectGroup}>
                      <Text style={styles.subjectTitle}>📖 Türkçe (40)</Text>
                      {[
                        { key: 'turkce', label: 'Türkçe' }
                      ].map(subject => (
                        <View key={subject.key} style={styles.scoreRow}>
                          <Text style={styles.scoreLabel}>{subject.label}</Text>
                          <View style={styles.scoreInputs}>
                            <TextInput
                              style={styles.scoreInput}
                              placeholder="Doğru"
                              keyboardType="numeric"
                              value={String(examForm[`tyt_${subject.key}_correct` as keyof typeof examForm] || 0)}
                              onChangeText={(text) => setExamForm(prev => ({
                                ...prev,
                                [`tyt_${subject.key}_correct`]: Math.max(0, Math.min(40, parseInt(text) || 0))
                              }))}
                            />
                            <TextInput
                              style={styles.scoreInput}
                              placeholder="Yanlış"
                              keyboardType="numeric"
                              value={String(examForm[`tyt_${subject.key}_wrong` as keyof typeof examForm] || 0)}
                              onChangeText={(text) => setExamForm(prev => ({
                                ...prev,
                                [`tyt_${subject.key}_wrong`]: Math.max(0, Math.min(40, parseInt(text) || 0))
                              }))}
                            />
                          </View>
                          <Text style={styles.netScore}>
                            Net: {calculateNet(
                              examForm[`tyt_${subject.key}_correct` as keyof typeof examForm] as number || 0,
                              examForm[`tyt_${subject.key}_wrong` as keyof typeof examForm] as number || 0
                            ).toFixed(1)}
                          </Text>
                        </View>
                      ))}
                      <Text style={styles.groupTotal}>
                        Türkçe Net: {calculateTYTTotals().turkce.toFixed(1)}
                      </Text>
                    </View>
                    
                    {/* Matematik */}
                    <View style={styles.subjectGroup}>
                      <Text style={styles.subjectTitle}>🔢 Matematik (30)</Text>
                      {[
                        { key: 'matematik', label: 'Matematik' },
                        { key: 'geometri', label: 'Geometri' }
                      ].map(subject => (
                        <View key={subject.key} style={styles.scoreRow}>
                          <Text style={styles.scoreLabel}>{subject.label}</Text>
                          <View style={styles.scoreInputs}>
                            <TextInput
                              style={styles.scoreInput}
                              placeholder="Doğru"
                              keyboardType="numeric"
                              value={String(examForm[`tyt_${subject.key}_correct` as keyof typeof examForm] || 0)}
                              onChangeText={(text) => setExamForm(prev => ({
                                ...prev,
                                [`tyt_${subject.key}_correct`]: Math.max(0, Math.min(subject.key === 'matematik' ? 20 : 10, parseInt(text) || 0))
                              }))}
                            />
                            <TextInput
                              style={styles.scoreInput}
                              placeholder="Yanlış"
                              keyboardType="numeric"
                              value={String(examForm[`tyt_${subject.key}_wrong` as keyof typeof examForm] || 0)}
                              onChangeText={(text) => setExamForm(prev => ({
                                ...prev,
                                [`tyt_${subject.key}_wrong`]: Math.max(0, Math.min(subject.key === 'matematik' ? 20 : 10, parseInt(text) || 0))
                              }))}
                            />
                          </View>
                          <Text style={styles.netScore}>
                            Net: {calculateNet(
                              examForm[`tyt_${subject.key}_correct` as keyof typeof examForm] as number || 0,
                              examForm[`tyt_${subject.key}_wrong` as keyof typeof examForm] as number || 0
                            ).toFixed(1)}
                          </Text>
                        </View>
                      ))}
                      <Text style={styles.groupTotal}>
                        Matematik Net: {calculateTYTTotals().matematik.toFixed(1)}
                      </Text>
                    </View>

                    {/* Sosyal Bilimler */}
                    <View style={styles.subjectGroup}>
                      <Text style={styles.subjectTitle}>🏛️ Sosyal Bilimler (20)</Text>
                      {[
                        { key: 'tarih', label: 'Tarih' },
                        { key: 'cografya', label: 'Coğrafya' },
                        { key: 'felsefe', label: 'Felsefe' },
                        { key: 'din', label: 'Din' }
                      ].map(subject => (
                        <View key={subject.key} style={styles.scoreRow}>
                          <Text style={styles.scoreLabel}>{subject.label}</Text>
                          <View style={styles.scoreInputs}>
                            <TextInput
                              style={styles.scoreInput}
                              placeholder="Doğru"
                              keyboardType="numeric"
                              value={String(examForm[`tyt_${subject.key}_correct` as keyof typeof examForm] || 0)}
                              onChangeText={(text) => setExamForm(prev => ({
                                ...prev,
                                [`tyt_${subject.key}_correct`]: Math.max(0, Math.min(5, parseInt(text) || 0))
                              }))}
                            />
                            <TextInput
                              style={styles.scoreInput}
                              placeholder="Yanlış"
                              keyboardType="numeric"
                              value={String(examForm[`tyt_${subject.key}_wrong` as keyof typeof examForm] || 0)}
                              onChangeText={(text) => setExamForm(prev => ({
                                ...prev,
                                [`tyt_${subject.key}_wrong`]: Math.max(0, Math.min(5, parseInt(text) || 0))
                              }))}
                            />
                          </View>
                          <Text style={styles.netScore}>
                            Net: {calculateNet(
                              examForm[`tyt_${subject.key}_correct` as keyof typeof examForm] as number || 0,
                              examForm[`tyt_${subject.key}_wrong` as keyof typeof examForm] as number || 0
                            ).toFixed(1)}
                          </Text>
                        </View>
                      ))}
                      <Text style={styles.groupTotal}>
                        Sosyal Net: {calculateTYTTotals().sosyal.toFixed(1)}
                      </Text>
                    </View>

                    {/* Fen Bilimleri */}
                    <View style={styles.subjectGroup}>
                      <Text style={styles.subjectTitle}>🔬 Fen Bilimleri (20)</Text>
                      {[
                        { key: 'fizik', label: 'Fizik' },
                        { key: 'kimya', label: 'Kimya' },
                        { key: 'biyoloji', label: 'Biyoloji' }
                      ].map(subject => (
                        <View key={subject.key} style={styles.scoreRow}>
                          <Text style={styles.scoreLabel}>{subject.label}</Text>
                          <View style={styles.scoreInputs}>
                            <TextInput
                              style={styles.scoreInput}
                              placeholder="Doğru"
                              keyboardType="numeric"
                              value={String(examForm[`tyt_${subject.key}_correct` as keyof typeof examForm] || 0)}
                              onChangeText={(text) => setExamForm(prev => ({
                                ...prev,
                                [`tyt_${subject.key}_correct`]: Math.max(0, Math.min(7, parseInt(text) || 0))
                              }))}
                            />
                            <TextInput
                              style={styles.scoreInput}
                              placeholder="Yanlış"
                              keyboardType="numeric"
                              value={String(examForm[`tyt_${subject.key}_wrong` as keyof typeof examForm] || 0)}
                              onChangeText={(text) => setExamForm(prev => ({
                                ...prev,
                                [`tyt_${subject.key}_wrong`]: Math.max(0, Math.min(7, parseInt(text) || 0))
                              }))}
                            />
                          </View>
                          <Text style={styles.netScore}>
                            Net: {calculateNet(
                              examForm[`tyt_${subject.key}_correct` as keyof typeof examForm] as number || 0,
                              examForm[`tyt_${subject.key}_wrong` as keyof typeof examForm] as number || 0
                            ).toFixed(1)}
                          </Text>
                        </View>
                      ))}
                      <Text style={styles.groupTotal}>
                        Fen Net: {calculateTYTTotals().fen.toFixed(1)}
                      </Text>
                    </View>

                    {/* TYT Overall Total */}
                    <View style={styles.totalSection}>
                      <Text style={styles.overallTotal}>
                        TYT TOPLAM NET: {calculateTYTTotals().overall.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* AYT Scores */}
                {examForm.exam_type === 'AYT' && (
                  <View style={styles.scoresSection}>
                    <Text style={styles.sectionTitle}>AYT Puanları</Text>
                    {[
                      { key: 'matematik', label: 'Matematik', max: 30 },
                      { key: 'geometri', label: 'Geometri', max: 10 }
                    ].map(subject => (
                      <View key={subject.key} style={styles.scoreRow}>
                        <Text style={styles.scoreLabel}>{subject.label} ({subject.max})</Text>
                        <View style={styles.scoreInputs}>
                          <TextInput
                            style={styles.scoreInput}
                            placeholder="Doğru"
                            keyboardType="numeric"
                            value={String(examForm[`ayt_${subject.key}_correct` as keyof typeof examForm] || 0)}
                            onChangeText={(text) => setExamForm(prev => ({
                              ...prev,
                              [`ayt_${subject.key}_correct`]: Math.max(0, Math.min(subject.max, parseInt(text) || 0))
                            }))}
                          />
                          <TextInput
                            style={styles.scoreInput}
                            placeholder="Yanlış"
                            keyboardType="numeric"
                            value={String(examForm[`ayt_${subject.key}_wrong` as keyof typeof examForm] || 0)}
                            onChangeText={(text) => setExamForm(prev => ({
                              ...prev,
                              [`ayt_${subject.key}_wrong`]: Math.max(0, Math.min(subject.max, parseInt(text) || 0))
                            }))}
                          />
                        </View>
                        <Text style={styles.netScore}>
                          Net: {calculateNet(
                            examForm[`ayt_${subject.key}_correct` as keyof typeof examForm] as number || 0,
                            examForm[`ayt_${subject.key}_wrong` as keyof typeof examForm] as number || 0
                          ).toFixed(1)}
                        </Text>
                      </View>
                    ))}
                    
                    {/* AYT Total */}
                    <View style={styles.totalSection}>
                      <Text style={styles.overallTotal}>
                        AYT TOPLAM NET: {calculateAYTTotal().toFixed(1)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Tarama Scores */}
                {examForm.exam_type === 'Tarama' && (
                  <View style={styles.scoresSection}>
                    <Text style={styles.sectionTitle}>Tarama Puanları</Text>
                    
                    {/* Add New Lesson */}
                    <View style={styles.addLessonSection}>
                      <Text style={styles.addLessonTitle}>➕ Ders Ekle</Text>
                      <View style={styles.addLessonForm}>
                        <View style={styles.pickerContainer}>
                          <Text style={styles.label}>Ders</Text>
                          <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => setShowTaramaSubjectPicker(true)}
                          >
                            <Text style={styles.pickerButtonText}>
                              {selectedTaramaSubject || 'Ders seçin...'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.inputContainer}>
                          <Text style={styles.label}>Soru Sayısı</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Soru sayısı"
                            keyboardType="numeric"
                            value={String(selectedTaramaQuestionCount)}
                            onChangeText={(text) => setSelectedTaramaQuestionCount(Math.max(1, parseInt(text) || 1))}
                          />
                        </View>
                        <TouchableOpacity
                          style={[styles.addButton, (!selectedTaramaSubject || selectedTaramaQuestionCount <= 0) && styles.addButtonDisabled]}
                          onPress={addTaramaLesson}
                          disabled={!selectedTaramaSubject || selectedTaramaQuestionCount <= 0}
                        >
                          <Text style={styles.addButtonText}>Ekle</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Subject Picker Modal for Tarama */}
                    {showTaramaSubjectPicker && (
                      <Modal visible={true} transparent={true} animationType="slide">
                        <View style={styles.modalOverlay}>
                          <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                              <Text style={styles.modalTitle}>Ders Seçin</Text>
                              <TouchableOpacity onPress={() => setShowTaramaSubjectPicker(false)}>
                                <Text style={styles.modalCloseButton}>✕</Text>
                              </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.modalContent}>
                              {subjects.map((subject) => (
                                <TouchableOpacity
                                  key={subject.id}
                                  style={styles.subjectOption}
                                  onPress={() => {
                                    setSelectedTaramaSubject(subject.name);
                                    setShowTaramaSubjectPicker(false);
                                  }}
                                >
                                  <Text style={styles.subjectOptionText}>{subject.name}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        </View>
                      </Modal>
                    )}

                    {/* Existing Lessons */}
                    {examForm.tarama_lessons.length > 0 && (
                      <View style={styles.lessonsSection}>
                        <Text style={styles.lessonsTitle}>📚 Eklenmiş Dersler</Text>
                        {examForm.tarama_lessons.map((lesson, index) => (
                          <View key={index} style={styles.lessonRow}>
                            <View style={styles.lessonHeader}>
                              <Text style={styles.lessonSubject}>{lesson.subject} ({lesson.question_count} soru)</Text>
                              <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => removeTaramaLesson(index)}
                              >
                                <Text style={styles.removeButtonText}>✕</Text>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.lessonInputs}>
                              <View style={styles.lessonInputContainer}>
                                <Text style={styles.lessonInputLabel}>Doğru</Text>
                                <TextInput
                                  style={styles.lessonInput}
                                  keyboardType="numeric"
                                  value={String(lesson.correct)}
                                  onChangeText={(text) => updateTaramaLesson(index, 'correct', parseInt(text) || 0)}
                                />
                              </View>
                              <View style={styles.lessonInputContainer}>
                                <Text style={styles.lessonInputLabel}>Yanlış</Text>
                                <TextInput
                                  style={styles.lessonInput}
                                  keyboardType="numeric"
                                  value={String(lesson.wrong)}
                                  onChangeText={(text) => updateTaramaLesson(index, 'wrong', parseInt(text) || 0)}
                                />
                              </View>
                              <View style={styles.lessonNetContainer}>
                                <Text style={styles.lessonNet}>
                                  Net: {calculateNet(lesson.correct, lesson.wrong).toFixed(1)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Tarama Total */}
                    {examForm.tarama_lessons.length > 0 && (
                      <View style={styles.totalSection}>
                        <Text style={styles.overallTotal}>
                          TARAMA TOPLAM NET: {calculateTaramaTotal().toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Notlar</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={examForm.notes}
                    onChangeText={(text) => setExamForm(prev => ({ ...prev, notes: text }))}
                    placeholder="Sınav hakkında notlar..."
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
};

// Useful Links Screen Implementation
const UsefulLinksScreen = () => {
  // All hooks must be called before any conditional logic
  const [educationalLinks, setEducationalLinks] = useState<EducationalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // useEffect must be before conditional logic
  React.useEffect(() => {
    loadEducationalLinks();
  }, []);

  const loadEducationalLinks = async () => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('educational_links')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error loading educational links:', error);
        return;
      }

      setEducationalLinks(data || []);
    } catch (error) {
      console.error('Error loading educational links:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefreshLinks = async () => {
    setRefreshing(true);
    await loadEducationalLinks();
    setRefreshing(false);
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Hata', 'Bu link açılamadı');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Hata', 'Link açılırken hata oluştu');
    }
  };

  const getIconColor = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: '#3B82F6',
      green: '#10B981',
      red: '#EF4444',
      purple: '#8B5CF6',
      orange: '#F59E0B',
      indigo: '#6366F1'
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Linkler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔗 Yararlı Linkler</Text>
      </View>
      
              <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshLinks} />}
        >
        {educationalLinks.length > 0 ? (
          educationalLinks.map((link) => (
            <TouchableOpacity
              key={link.id}
              style={styles.linkCard}
              onPress={() => openLink(link.url)}
            >
              <View style={styles.linkHeader}>
                <View style={[styles.linkIcon, { backgroundColor: getIconColor(link.icon_color) }]}>
                  <Text style={styles.linkIconText}>
                    {link.icon_letter || link.title.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.linkContent}>
                  <Text style={styles.linkTitle}>{link.title}</Text>
                  {link.description && (
                    <Text style={styles.linkDescription}>{link.description}</Text>
                  )}
                  <Text style={styles.linkCategory}>{link.category}</Text>
                </View>
                <Text style={styles.linkArrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Henüz link yok</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Pomodoro Timer Screen Implementation
const PomodoroTimerScreen = () => {
  // All hooks must be called before any conditional logic
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [showSettings, setShowSettings] = useState(false);

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      if (!isBreak) {
        // Work session completed
        Alert.alert('🎉 Çalışma Tamamlandı!', 'Mola zamanı! 5 dakika dinlenin.', [
          { text: 'Mola Başlat', onPress: () => {
            setTimeLeft(breakDuration * 60);
            setIsBreak(true);
            setIsRunning(true);
          }}
        ]);
      } else {
        // Break completed
        Alert.alert('💪 Mola Bitti!', 'Çalışmaya devam etmeye hazır mısınız?', [
          { text: 'Çalışmaya Başla', onPress: () => {
            setTimeLeft(workDuration * 60);
            setIsBreak(false);
            setIsRunning(true);
          }}
        ]);
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isBreak, workDuration, breakDuration]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? breakDuration * 60 : workDuration * 60);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalTime = isBreak ? breakDuration * 60 : workDuration * 60;
    return 1 - (timeLeft / totalTime);
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.pomodoroHeader}>
        <Text style={styles.tabTitle}>🍅 Çalışma Zamanlayıcı</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timerContainer}>
        {/* Timer Circle */}
        <View style={styles.timerCircle}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <Text style={styles.timerLabel}>
            {isBreak ? 'Mola Zamanı' : 'Çalışma Zamanı'}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${getProgress() * 100}%` }]} />
        </View>

        {/* Timer Controls */}
        <View style={styles.timerControls}>
          <TouchableOpacity
            style={[styles.timerButton, styles.resetButton]}
            onPress={resetTimer}
          >
            <Text style={styles.timerButtonText}>🔄 Sıfırla</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timerButton, 
              styles.playButton,
              isRunning && styles.pauseButton
            ]}
            onPress={toggleTimer}
          >
            <Text style={styles.timerButtonText}>
              {isRunning ? '⏸️ Duraklat' : '▶️ Başlat'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timer Stats */}
        <View style={styles.timerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Çalışma Süresi</Text>
            <Text style={styles.statValue}>{workDuration} dk</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Mola Süresi</Text>
            <Text style={styles.statValue}>{breakDuration} dk</Text>
          </View>
        </View>
      </View>

      {/* Settings Modal */}
      {showSettings && (
        <Modal visible={showSettings} animationType="slide" transparent>
          <View style={styles.settingsModalContainer}>
            <View style={styles.settingsModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Timer Ayarları</Text>
                <TouchableOpacity onPress={() => setShowSettings(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingsContent}>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Çalışma Süresi (dakika)</Text>
                  <View style={styles.settingInputContainer}>
                    <TouchableOpacity
                      style={styles.settingButton}
                      onPress={() => setWorkDuration(Math.max(5, workDuration - 5))}
                    >
                      <Text style={styles.settingButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.settingValue}>{workDuration}</Text>
                    <TouchableOpacity
                      style={styles.settingButton}
                      onPress={() => setWorkDuration(Math.min(60, workDuration + 5))}
                    >
                      <Text style={styles.settingButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Mola Süresi (dakika)</Text>
                  <View style={styles.settingInputContainer}>
                    <TouchableOpacity
                      style={styles.settingButton}
                      onPress={() => setBreakDuration(Math.max(1, breakDuration - 1))}
                    >
                      <Text style={styles.settingButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.settingValue}>{breakDuration}</Text>
                    <TouchableOpacity
                      style={styles.settingButton}
                      onPress={() => setBreakDuration(Math.min(30, breakDuration + 1))}
                    >
                      <Text style={styles.settingButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => {
                    if (!isRunning) {
                      setTimeLeft(isBreak ? breakDuration * 60 : workDuration * 60);
                    }
                    setShowSettings(false);
                  }}
                >
                  <Text style={styles.applyButtonText}>Uygula</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export const ToolsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Araçlar</Text>
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
        <Tab.Screen name="MockExams" component={MockExamsScreen} options={{ title: 'Deneme Sınavları' }} />
        <Tab.Screen name="Links" component={UsefulLinksScreen} options={{ title: 'Yararlı Linkler' }} />
        <Tab.Screen name="Pomodoro" component={PomodoroTimerScreen} options={{ title: 'Çalışma Zamanlayıcı' }} />
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
  goalEditButton: {
    marginLeft: 10,
    padding: 5,
  },
  goalDeleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
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
  // Mock Exams Styles
  examCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  examInfo: {
    flex: 1,
  },
  examInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  examTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tytTag: {
    backgroundColor: '#DBEAFE',
  },
  aytTag: {
    backgroundColor: '#E9D5FF',
  },
  taramaTag: {
    backgroundColor: '#D1FAE5',
  },
  examTypeTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tytTagText: {
    color: '#1E40AF',
  },
  aytTagText: {
    color: '#7C3AED',
  },
  taramaTagText: {
    color: '#065F46',
  },
  examActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  examEditButton: {
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  examDeleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  examName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  examDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  examScores: {
    marginTop: 8,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  scoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoreItem: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#333',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  totalScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  examTypeButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  examTypeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeExamTypeButton: {
    backgroundColor: '#3B82F6',
  },
  examTypeButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeExamTypeButtonText: {
    color: 'white',
  },
  formSection: {
    marginTop: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreInputs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
  },
  scoreInput: {
    width: 60,
    height: 36,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
    textAlign: 'center',
  },
  netScore: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  groupTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 5,
  },
  totalSection: {
    marginTop: 10,
  },
  overallTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  addLessonSection: {
    marginBottom: 20,
  },
  addLessonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  addLessonForm: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerContainer: {
    flex: 1,
    marginRight: 10,
  },
  picker: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  lessonsSection: {
    marginTop: 10,
  },
  lessonsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
  },
  lessonRow: {
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
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  lessonSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  removeButton: {
    marginLeft: 10,
    padding: 5,
  },
  removeButtonText: {
    fontSize: 18,
    color: '#EF4444',
  },
  lessonInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  lessonInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  lessonInputLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 5,
    fontWeight: '500',
  },
  lessonInput: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  lessonNetContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  lessonNet: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  taramaLessons: {
    marginBottom: 10,
  },
  taramaLesson: {
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
    padding: 10,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 0.5,
  },
  taramaLessonName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  taramaLessonScore: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  notesSection: {
    marginTop: 10,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
  },
  noData: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  // Links Styles
  linkCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  linkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 0,
  },
  linkIconText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkContent: {
    flex: 1,
    marginLeft: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  linkDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 20,
  },
  linkCategory: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  linkArrow: {
    fontSize: 20,
    color: '#3B82F6',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Pomodoro Timer Styles
  pomodoroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 20,
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 4,
    borderColor: '#2563eb',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  timerLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 30,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  timerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  resetButton: {
    backgroundColor: '#f5f5f5',
  },
  playButton: {
    backgroundColor: '#10b981',
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
  },
  timerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  // Settings Modal Styles
  settingsModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  settingsModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 20,
  },
  settingsContent: {
    marginTop: 20,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  settingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    minWidth: 40,
    textAlign: 'center',
  },
  applyButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  headerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  fullWidthScrollView: {
    flex: 1,
  },
  fullWidthExamCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mockExamsContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  datePickerButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  subjectOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subjectOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  scoresSection: {
    marginBottom: 20,
  },
  subjectGroup: {
    marginBottom: 20,
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
}); 