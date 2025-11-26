import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { supabase } from '../lib/supabase';
import { MockExamResult } from '../types/database';

const TARAMA_LESSONS = [
  'Türkçe',
  'Matematik', 
  'Geometri',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Din Bilgisi',
  'Fizik',
  'Kimya',
  'Biyoloji'
];

interface ExamForm {
  exam_type: 'TYT' | 'AYT' | 'Tarama';
  exam_date: string;
  exam_name: string;
  exam_duration: number;
  
  // TYT Scores - Türkçe
  tyt_turkce_correct: number;
  tyt_turkce_wrong: number;
  
  // TYT Scores - Matematik
  tyt_matematik_correct: number;
  tyt_matematik_wrong: number;
  tyt_geometri_correct: number;
  tyt_geometri_wrong: number;
  
  // TYT Scores - Sosyal Bilimler
  tyt_tarih_correct: number;
  tyt_tarih_wrong: number;
  tyt_cografya_correct: number;
  tyt_cografya_wrong: number;
  tyt_felsefe_correct: number;
  tyt_felsefe_wrong: number;
  tyt_din_correct: number;
  tyt_din_wrong: number;
  
  // TYT Scores - Fen Bilimleri
  tyt_fizik_correct: number;
  tyt_fizik_wrong: number;
  tyt_kimya_correct: number;
  tyt_kimya_wrong: number;
  tyt_biyoloji_correct: number;
  tyt_biyoloji_wrong: number;
  
  // AYT Scores - Matematik Group
  ayt_matematik_correct: number;
  ayt_matematik_wrong: number;
  ayt_geometri_correct: number;
  ayt_geometri_wrong: number;
  
  // AYT Scores - Fen Group
  ayt_fizik_correct: number;
  ayt_fizik_wrong: number;
  ayt_kimya_correct: number;
  ayt_kimya_wrong: number;
  ayt_biyoloji_correct: number;
  ayt_biyoloji_wrong: number;
  
  // AYT Scores - Sözel Group
  ayt_edebiyat_correct: number;
  ayt_edebiyat_wrong: number;
  ayt_tarih_correct: number;
  ayt_tarih_wrong: number;
  ayt_cografya_correct: number;
  ayt_cografya_wrong: number;
  
  // Tarama Scores
  tarama_lessons: Array<{
    subject: string;
    question_count: number;
    correct: number;
    wrong: number;
  }>;
  
  notes: string;
}

export const ExamResultsScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  const [examResults, setExamResults] = useState<MockExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<MockExamResult | null>(null);
  const [examModalTab, setExamModalTab] = useState<'TYT' | 'AYT' | 'Tarama'>('TYT');
  
  // Tarama lesson modal
  const [showTaramaModal, setShowTaramaModal] = useState(false);
  const [taramaForm, setTaramaForm] = useState({
    lesson: '',
    question_count: 10,
    correct: 0,
    wrong: 0,
  });
  const [editingTaramaIndex, setEditingTaramaIndex] = useState<number | null>(null);
  
  const [examForm, setExamForm] = useState<ExamForm>({
    exam_type: 'TYT',
    exam_date: new Date().toISOString().split('T')[0],
    exam_name: '',
    exam_duration: 180,
    
    // TYT Scores - Türkçe
    tyt_turkce_correct: 0,
    tyt_turkce_wrong: 0,
    
    // TYT Scores - Matematik
    tyt_matematik_correct: 0,
    tyt_matematik_wrong: 0,
    tyt_geometri_correct: 0,
    tyt_geometri_wrong: 0,
    
    // TYT Scores - Sosyal Bilimler
    tyt_tarih_correct: 0,
    tyt_tarih_wrong: 0,
    tyt_cografya_correct: 0,
    tyt_cografya_wrong: 0,
    tyt_felsefe_correct: 0,
    tyt_felsefe_wrong: 0,
    tyt_din_correct: 0,
    tyt_din_wrong: 0,
    
    // TYT Scores - Fen Bilimleri
    tyt_fizik_correct: 0,
    tyt_fizik_wrong: 0,
    tyt_kimya_correct: 0,
    tyt_kimya_wrong: 0,
    tyt_biyoloji_correct: 0,
    tyt_biyoloji_wrong: 0,
    
    // AYT Scores - Matematik Group
    ayt_matematik_correct: 0,
    ayt_matematik_wrong: 0,
    ayt_geometri_correct: 0,
    ayt_geometri_wrong: 0,
    
    // AYT Scores - Fen Group
    ayt_fizik_correct: 0,
    ayt_fizik_wrong: 0,
    ayt_kimya_correct: 0,
    ayt_kimya_wrong: 0,
    ayt_biyoloji_correct: 0,
    ayt_biyoloji_wrong: 0,
    
    // AYT Scores - Sözel Group
    ayt_edebiyat_correct: 0,
    ayt_edebiyat_wrong: 0,
    ayt_tarih_correct: 0,
    ayt_tarih_wrong: 0,
    ayt_cografya_correct: 0,
    ayt_cografya_wrong: 0,
    
    // Tarama Scores
    tarama_lessons: [],
    
    notes: '',
  });

  // Determine which student's results to show
  const targetStudent = userProfile?.role === 'coach' ? selectedStudent : userProfile;

  useEffect(() => {
    if (targetStudent) {
      loadExamResults();
    }
  }, [targetStudent]);

  const loadExamResults = async () => {
    if (!supabase || !targetStudent) return;
    
    try {
      const { data, error } = await supabase
        .from('mock_exam_results')
        .select('*')
        .eq('student_id', targetStudent.id)
        .eq('is_active', true)
        .order('exam_date', { ascending: false });

      if (error) {
        console.error('Error loading exam results:', error);
        return;
      }

      setExamResults(data || []);
    } catch (error) {
      console.error('Error loading exam results:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExamResults();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditingExam(null);
    setExamForm({
      exam_type: 'TYT',
      exam_date: new Date().toISOString().split('T')[0],
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
      ayt_fizik_correct: 0,
      ayt_fizik_wrong: 0,
      ayt_kimya_correct: 0,
      ayt_kimya_wrong: 0,
      ayt_biyoloji_correct: 0,
      ayt_biyoloji_wrong: 0,
      ayt_edebiyat_correct: 0,
      ayt_edebiyat_wrong: 0,
      ayt_tarih_correct: 0,
      ayt_tarih_wrong: 0,
      ayt_cografya_correct: 0,
      ayt_cografya_wrong: 0,
      tarama_lessons: [],
      notes: '',
    });
    setExamModalTab('TYT');
    setShowModal(true);
  };

  const openEditModal = (exam: MockExamResult) => {
    setEditingExam(exam);
    setExamForm({
      exam_type: exam.exam_type,
      exam_date: exam.exam_date,
      exam_name: exam.exam_name,
      exam_duration: exam.exam_duration || 180,
      tyt_turkce_correct: exam.tyt_turkce_correct || 0,
      tyt_turkce_wrong: exam.tyt_turkce_wrong || 0,
      tyt_matematik_correct: exam.tyt_matematik_correct || 0,
      tyt_matematik_wrong: exam.tyt_matematik_wrong || 0,
      tyt_geometri_correct: exam.tyt_geometri_correct || 0,
      tyt_geometri_wrong: exam.tyt_geometri_wrong || 0,
      tyt_tarih_correct: exam.tyt_tarih_correct || 0,
      tyt_tarih_wrong: exam.tyt_tarih_wrong || 0,
      tyt_cografya_correct: exam.tyt_cografya_correct || 0,
      tyt_cografya_wrong: exam.tyt_cografya_wrong || 0,
      tyt_felsefe_correct: exam.tyt_felsefe_correct || 0,
      tyt_felsefe_wrong: exam.tyt_felsefe_wrong || 0,
      tyt_din_correct: exam.tyt_din_correct || 0,
      tyt_din_wrong: exam.tyt_din_wrong || 0,
      tyt_fizik_correct: exam.tyt_fizik_correct || 0,
      tyt_fizik_wrong: exam.tyt_fizik_wrong || 0,
      tyt_kimya_correct: exam.tyt_kimya_correct || 0,
      tyt_kimya_wrong: exam.tyt_kimya_wrong || 0,
      tyt_biyoloji_correct: exam.tyt_biyoloji_correct || 0,
      tyt_biyoloji_wrong: exam.tyt_biyoloji_wrong || 0,
      ayt_matematik_correct: exam.ayt_matematik_correct || 0,
      ayt_matematik_wrong: exam.ayt_matematik_wrong || 0,
      ayt_geometri_correct: exam.ayt_geometri_correct || 0,
      ayt_geometri_wrong: exam.ayt_geometri_wrong || 0,
      ayt_fizik_correct: exam.ayt_fizik_correct || 0,
      ayt_fizik_wrong: exam.ayt_fizik_wrong || 0,
      ayt_kimya_correct: exam.ayt_kimya_correct || 0,
      ayt_kimya_wrong: exam.ayt_kimya_wrong || 0,
      ayt_biyoloji_correct: exam.ayt_biyoloji_correct || 0,
      ayt_biyoloji_wrong: exam.ayt_biyoloji_wrong || 0,
      ayt_edebiyat_correct: exam.ayt_edebiyat_correct || 0,
      ayt_edebiyat_wrong: exam.ayt_edebiyat_wrong || 0,
      ayt_tarih_correct: exam.ayt_tarih_correct || 0,
      ayt_tarih_wrong: exam.ayt_tarih_wrong || 0,
      ayt_cografya_correct: exam.ayt_cografya_correct || 0,
      ayt_cografya_wrong: exam.ayt_cografya_wrong || 0,
      
      // Tarama Scores
      tarama_lessons: exam.tarama_lessons || [],
      
      notes: exam.notes || '',
    });
    setExamModalTab(exam.exam_type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingExam(null);
    setExamModalTab('TYT');
  };

  const saveExam = async () => {
    if (!supabase || !targetStudent || !userProfile) return;
    
    if (!examForm.exam_name.trim()) {
      Alert.alert('Hata', 'Sınav adı gereklidir.');
      return;
    }

    try {
      const examData = {
        student_id: targetStudent.id,
        coach_id: userProfile.id,
        exam_type: examForm.exam_type,
        exam_date: examForm.exam_date,
        exam_name: examForm.exam_name,
        exam_duration: examForm.exam_duration,
        notes: examForm.notes,
        is_active: true,
        
        // Only include relevant scores based on exam type
        ...(examForm.exam_type === 'TYT' ? {
          // TYT Scores
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
        } : examForm.exam_type === 'AYT' ? {
          // AYT Scores
          ayt_matematik_correct: examForm.ayt_matematik_correct,
          ayt_matematik_wrong: examForm.ayt_matematik_wrong,
          ayt_geometri_correct: examForm.ayt_geometri_correct,
          ayt_geometri_wrong: examForm.ayt_geometri_wrong,
          ayt_fizik_correct: examForm.ayt_fizik_correct,
          ayt_fizik_wrong: examForm.ayt_fizik_wrong,
          ayt_kimya_correct: examForm.ayt_kimya_correct,
          ayt_kimya_wrong: examForm.ayt_kimya_wrong,
          ayt_biyoloji_correct: examForm.ayt_biyoloji_correct,
          ayt_biyoloji_wrong: examForm.ayt_biyoloji_wrong,
          ayt_edebiyat_correct: examForm.ayt_edebiyat_correct,
          ayt_edebiyat_wrong: examForm.ayt_edebiyat_wrong,
          ayt_tarih_correct: examForm.ayt_tarih_correct,
          ayt_tarih_wrong: examForm.ayt_tarih_wrong,
          ayt_cografya_correct: examForm.ayt_cografya_correct,
          ayt_cografya_wrong: examForm.ayt_cografya_wrong,
        } : examForm.exam_type === 'Tarama' ? {
          // Tarama Scores
          tarama_lessons: examForm.tarama_lessons,
        } : {})
      };

      if (editingExam) {
        // Update existing exam
        const { error } = await supabase
          .from('mock_exam_results')
          .update(examData)
          .eq('id', editingExam.id);

        if (error) throw error;
      } else {
        // Create new exam
        const { error } = await supabase
          .from('mock_exam_results')
          .insert([examData]);

        if (error) throw error;
      }

      closeModal();
      await loadExamResults();
      Alert.alert('Başarılı', editingExam ? 'Sınav sonucu güncellendi.' : 'Sınav sonucu eklendi.');
    } catch (error) {
      console.error('Error saving exam:', error);
      Alert.alert('Hata', 'Sınav sonucu kaydedilirken hata oluştu.');
    }
  };

  const deleteExam = async (examId: string) => {
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
                .eq('id', examId);

              if (error) throw error;

              await loadExamResults();
              Alert.alert('Başarılı', 'Sınav sonucu silindi.');
            } catch (error) {
              console.error('Error deleting exam:', error);
              Alert.alert('Hata', 'Sınav sonucu silinirken hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const calculateNet = (correct: number, wrong: number) => {
    return (correct - wrong / 4).toFixed(2);
  };

  const getExamTypeColor = (examType: string) => {
    switch (examType) {
      case 'TYT':
        return '#3B82F6'; // Blue
      case 'AYT':
        return '#8B5CF6'; // Purple
      case 'Tarama':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };

  const renderExamCard = (exam: MockExamResult) => {
    const examColor = getExamTypeColor(exam.exam_type);
    
    return (
      <View key={exam.id} style={styles.examCard}>
        <View style={styles.examHeader}>
          <View style={styles.examInfo}>
            <View style={[styles.examTypeBadge, { backgroundColor: examColor }]}>
              <Text style={styles.examTypeText}>{exam.exam_type}</Text>
            </View>
            <Text style={styles.examName}>{exam.exam_name}</Text>
            <Text style={styles.examDate}>
              {new Date(exam.exam_date).toLocaleDateString('tr-TR')}
            </Text>
          </View>
          <View style={styles.examActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditModal(exam)}
            >
              <Ionicons name="pencil" size={16} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => deleteExam(exam.id)}
            >
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Exam Results Summary */}
        <View style={styles.resultsGrid}>
          {exam.exam_type === 'TYT' ? (
            <>
              <View style={[styles.resultItem, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.resultLabel, { color: '#1E40AF' }]}>Türkçe</Text>
                <Text style={[styles.resultValue, { color: '#1E40AF' }]}>
                  {calculateNet(exam.tyt_turkce_correct || 0, exam.tyt_turkce_wrong || 0)}
                </Text>
              </View>
              <View style={[styles.resultItem, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.resultLabel, { color: '#166534' }]}>Matematik</Text>
                <Text style={[styles.resultValue, { color: '#166534' }]}>
                  {(
                    parseFloat(calculateNet(exam.tyt_matematik_correct || 0, exam.tyt_matematik_wrong || 0)) +
                    parseFloat(calculateNet(exam.tyt_geometri_correct || 0, exam.tyt_geometri_wrong || 0))
                  ).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.resultItem, { backgroundColor: '#FAF5FF' }]}>
                <Text style={[styles.resultLabel, { color: '#7C3AED' }]}>Sosyal</Text>
                <Text style={[styles.resultValue, { color: '#7C3AED' }]}>
                  {(
                    parseFloat(calculateNet(exam.tyt_tarih_correct || 0, exam.tyt_tarih_wrong || 0)) +
                    parseFloat(calculateNet(exam.tyt_cografya_correct || 0, exam.tyt_cografya_wrong || 0)) +
                    parseFloat(calculateNet(exam.tyt_felsefe_correct || 0, exam.tyt_felsefe_wrong || 0)) +
                    parseFloat(calculateNet(exam.tyt_din_correct || 0, exam.tyt_din_wrong || 0))
                  ).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.resultItem, { backgroundColor: '#FFF7ED' }]}>
                <Text style={[styles.resultLabel, { color: '#EA580C' }]}>Fen</Text>
                <Text style={[styles.resultValue, { color: '#EA580C' }]}>
                  {(
                    parseFloat(calculateNet(exam.tyt_fizik_correct || 0, exam.tyt_fizik_wrong || 0)) +
                    parseFloat(calculateNet(exam.tyt_kimya_correct || 0, exam.tyt_kimya_wrong || 0)) +
                    parseFloat(calculateNet(exam.tyt_biyoloji_correct || 0, exam.tyt_biyoloji_wrong || 0))
                  ).toFixed(2)}
                </Text>
              </View>
            </>
          ) : exam.exam_type === 'AYT' ? (
            <>
              <View style={[styles.resultItem, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.resultLabel, { color: '#166534' }]}>Matematik</Text>
                <Text style={[styles.resultValue, { color: '#166534' }]}>
                  {(
                    parseFloat(calculateNet(exam.ayt_matematik_correct || 0, exam.ayt_matematik_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_geometri_correct || 0, exam.ayt_geometri_wrong || 0))
                  ).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.resultItem, { backgroundColor: '#FFF7ED' }]}>
                <Text style={[styles.resultLabel, { color: '#EA580C' }]}>Fen</Text>
                <Text style={[styles.resultValue, { color: '#EA580C' }]}>
                  {(
                    parseFloat(calculateNet(exam.ayt_fizik_correct || 0, exam.ayt_fizik_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_kimya_correct || 0, exam.ayt_kimya_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_biyoloji_correct || 0, exam.ayt_biyoloji_wrong || 0))
                  ).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.resultItem, { backgroundColor: '#FAF5FF' }]}>
                <Text style={[styles.resultLabel, { color: '#7C3AED' }]}>Sözel</Text>
                <Text style={[styles.resultValue, { color: '#7C3AED' }]}>
                  {(
                    parseFloat(calculateNet(exam.ayt_edebiyat_correct || 0, exam.ayt_edebiyat_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_tarih_correct || 0, exam.ayt_tarih_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_cografya_correct || 0, exam.ayt_cografya_wrong || 0))
                  ).toFixed(2)}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Total Net */}
        <View style={styles.totalNet}>
          <Text style={styles.totalNetLabel}>Toplam Net:</Text>
          <Text style={styles.totalNetValue}>
            {exam.exam_type === 'TYT' 
              ? (
                  parseFloat(calculateNet(exam.tyt_turkce_correct || 0, exam.tyt_turkce_wrong || 0)) +
                  parseFloat(calculateNet(exam.tyt_matematik_correct || 0, exam.tyt_matematik_wrong || 0)) +
                  parseFloat(calculateNet(exam.tyt_geometri_correct || 0, exam.tyt_geometri_wrong || 0)) +
                  parseFloat(calculateNet(exam.tyt_tarih_correct || 0, exam.tyt_tarih_wrong || 0)) +
                  parseFloat(calculateNet(exam.tyt_cografya_correct || 0, exam.tyt_cografya_wrong || 0)) +
                  parseFloat(calculateNet(exam.tyt_felsefe_correct || 0, exam.tyt_felsefe_wrong || 0)) +
                  parseFloat(calculateNet(exam.tyt_din_correct || 0, exam.tyt_din_wrong || 0)) +
                  parseFloat(calculateNet(exam.tyt_fizik_correct || 0, exam.tyt_fizik_wrong || 0)) +
                  parseFloat(calculateNet(exam.tyt_kimya_correct || 0, exam.tyt_kimya_wrong || 0)) +
                  parseFloat(calculateNet(exam.tyt_biyoloji_correct || 0, exam.tyt_biyoloji_wrong || 0))
                ).toFixed(2)
              : exam.exam_type === 'AYT' 
                ? (
                    parseFloat(calculateNet(exam.ayt_matematik_correct || 0, exam.ayt_matematik_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_geometri_correct || 0, exam.ayt_geometri_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_fizik_correct || 0, exam.ayt_fizik_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_kimya_correct || 0, exam.ayt_kimya_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_biyoloji_correct || 0, exam.ayt_biyoloji_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_edebiyat_correct || 0, exam.ayt_edebiyat_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_tarih_correct || 0, exam.ayt_tarih_wrong || 0)) +
                    parseFloat(calculateNet(exam.ayt_cografya_correct || 0, exam.ayt_cografya_wrong || 0))
                  ).toFixed(2)
                : '0.00'
            }
          </Text>
        </View>
      </View>
    );
  };

  if (!targetStudent) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          {userProfile?.role === 'coach' 
            ? 'Sınav sonuçlarını görmek için bir öğrenci seçin.'
            : 'Kullanıcı bilgileri yükleniyor...'}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Sınav sonuçları yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {examResults.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyStateText}>Henüz sınav sonucu eklenmemiş</Text>
            <Text style={styles.emptyStateSubtext}>
              {userProfile?.role === 'coach' 
                ? 'Öğrenciniz için sınav sonucu eklemek için + butonuna tıklayın.'
                : 'Koçunuz tarafından sınav sonuçlarınız eklendiğinde burada görünecek.'}
            </Text>
          </View>
        ) : (
          examResults.map(renderExamCard)
        )}
      </ScrollView>

      {/* Add Button - Only for coaches */}
      {userProfile?.role === 'coach' && (
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Exam Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingExam ? 'Sınav Sonucunu Düzenle' : 'Yeni Sınav Sonucu'}
            </Text>
            <TouchableOpacity onPress={saveExam}>
              <Text style={styles.saveButton}>Kaydet</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Basic Info */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Sınav Bilgileri</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sınav Adı</Text>
                <TextInput
                  style={styles.textInput}
                  value={examForm.exam_name}
                  onChangeText={(text) => setExamForm(prev => ({ ...prev, exam_name: text }))}
                  placeholder="Örn: 1. Deneme Sınavı"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sınav Tarihi</Text>
                <TextInput
                  style={styles.textInput}
                  value={examForm.exam_date}
                  onChangeText={(text) => setExamForm(prev => ({ ...prev, exam_date: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* Exam Type Tabs */}
            <View style={styles.tabContainer}>
              {['TYT', 'AYT', 'Tarama'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.tab,
                    examModalTab === type && styles.activeTab,
                    examModalTab === type && type === 'TYT' && { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
                    examModalTab === type && type === 'AYT' && { backgroundColor: '#FAF5FF', borderColor: '#8B5CF6' },
                    examModalTab === type && type === 'Tarama' && { backgroundColor: '#F0FDF4', borderColor: '#10B981' },
                  ]}
                  onPress={() => {
                    setExamModalTab(type as 'TYT' | 'AYT' | 'Tarama');
                    setExamForm(prev => ({ ...prev, exam_type: type as 'TYT' | 'AYT' | 'Tarama' }));
                  }}
                >
                  <Text style={[
                    styles.tabText,
                    examModalTab === type && styles.activeTabText,
                    examModalTab === type && type === 'TYT' && { color: '#1E40AF' },
                    examModalTab === type && type === 'AYT' && { color: '#7C3AED' },
                    examModalTab === type && type === 'Tarama' && { color: '#059669' },
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TYT Scores */}
            {examModalTab === 'TYT' && (
              <View style={styles.scoresSection}>
                <Text style={styles.sectionTitle}>TYT Sınav Sonuçları</Text>
                
                {/* Türkçe */}
                <View style={[styles.subjectCard, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.subjectTitle, { color: '#1E40AF' }]}>📚 Türkçe (40)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#1E40AF' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#3B82F6' }]}
                        value={examForm.tyt_turkce_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_turkce_correct: Math.max(0, Math.min(40, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#1E40AF' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#3B82F6' }]}
                        value={examForm.tyt_turkce_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_turkce_wrong: Math.max(0, Math.min(40, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#1E40AF' }]}>
                    Net: {calculateNet(examForm.tyt_turkce_correct, examForm.tyt_turkce_wrong)}
                  </Text>
                </View>

                {/* Matematik */}
                <View style={[styles.subjectCard, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.subjectTitle, { color: '#166534' }]}>🔢 Matematik (30)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#166534' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#10B981' }]}
                        value={examForm.tyt_matematik_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_matematik_correct: Math.max(0, Math.min(30, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#166534' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#10B981' }]}
                        value={examForm.tyt_matematik_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_matematik_wrong: Math.max(0, Math.min(30, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#166534' }]}>
                    Net: {calculateNet(examForm.tyt_matematik_correct, examForm.tyt_matematik_wrong)}
                  </Text>
                </View>

                {/* Geometri */}
                <View style={[styles.subjectCard, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.subjectTitle, { color: '#166534' }]}>📐 Geometri (10)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#166534' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#10B981' }]}
                        value={examForm.tyt_geometri_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_geometri_correct: Math.max(0, Math.min(10, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#166534' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#10B981' }]}
                        value={examForm.tyt_geometri_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_geometri_wrong: Math.max(0, Math.min(10, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#166534' }]}>
                    Net: {calculateNet(examForm.tyt_geometri_correct, examForm.tyt_geometri_wrong)}
                  </Text>
                </View>

                {/* Sosyal Bilimler Group */}
                <View style={[styles.subjectCard, { backgroundColor: '#FAF5FF' }]}>
                  <Text style={[styles.subjectTitle, { color: '#7C3AED' }]}>📜 Tarih (5)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.tyt_tarih_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_tarih_correct: Math.max(0, Math.min(5, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.tyt_tarih_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_tarih_wrong: Math.max(0, Math.min(5, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#7C3AED' }]}>
                    Net: {calculateNet(examForm.tyt_tarih_correct, examForm.tyt_tarih_wrong)}
                  </Text>
                </View>

                <View style={[styles.subjectCard, { backgroundColor: '#FAF5FF' }]}>
                  <Text style={[styles.subjectTitle, { color: '#7C3AED' }]}>🌍 Coğrafya (5)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.tyt_cografya_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_cografya_correct: Math.max(0, Math.min(5, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.tyt_cografya_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_cografya_wrong: Math.max(0, Math.min(5, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#7C3AED' }]}>
                    Net: {calculateNet(examForm.tyt_cografya_correct, examForm.tyt_cografya_wrong)}
                  </Text>
                </View>

                <View style={[styles.subjectCard, { backgroundColor: '#FAF5FF' }]}>
                  <Text style={[styles.subjectTitle, { color: '#7C3AED' }]}>🤔 Felsefe (5)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.tyt_felsefe_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_felsefe_correct: Math.max(0, Math.min(5, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.tyt_felsefe_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_felsefe_wrong: Math.max(0, Math.min(5, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#7C3AED' }]}>
                    Net: {calculateNet(examForm.tyt_felsefe_correct, examForm.tyt_felsefe_wrong)}
                  </Text>
                </View>

                <View style={[styles.subjectCard, { backgroundColor: '#FAF5FF' }]}>
                  <Text style={[styles.subjectTitle, { color: '#7C3AED' }]}>🕌 Din Bilgisi (5)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.tyt_din_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_din_correct: Math.max(0, Math.min(5, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.tyt_din_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_din_wrong: Math.max(0, Math.min(5, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#7C3AED' }]}>
                    Net: {calculateNet(examForm.tyt_din_correct, examForm.tyt_din_wrong)}
                  </Text>
                </View>

                {/* Fen Bilimleri Group */}
                <View style={[styles.subjectCard, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={[styles.subjectTitle, { color: '#EA580C' }]}>⚡ Fizik (7)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.tyt_fizik_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_fizik_correct: Math.max(0, Math.min(7, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.tyt_fizik_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_fizik_wrong: Math.max(0, Math.min(7, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#EA580C' }]}>
                    Net: {calculateNet(examForm.tyt_fizik_correct, examForm.tyt_fizik_wrong)}
                  </Text>
                </View>

                <View style={[styles.subjectCard, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={[styles.subjectTitle, { color: '#EA580C' }]}>🧪 Kimya (7)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.tyt_kimya_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_kimya_correct: Math.max(0, Math.min(7, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.tyt_kimya_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_kimya_wrong: Math.max(0, Math.min(7, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#EA580C' }]}>
                    Net: {calculateNet(examForm.tyt_kimya_correct, examForm.tyt_kimya_wrong)}
                  </Text>
                </View>

                <View style={[styles.subjectCard, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={[styles.subjectTitle, { color: '#EA580C' }]}>🧬 Biyoloji (6)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.tyt_biyoloji_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_biyoloji_correct: Math.max(0, Math.min(6, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.tyt_biyoloji_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          tyt_biyoloji_wrong: Math.max(0, Math.min(6, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#EA580C' }]}>
                    Net: {calculateNet(examForm.tyt_biyoloji_correct, examForm.tyt_biyoloji_wrong)}
                  </Text>
                </View>
              </View>
            )}

            {/* AYT Scores */}
            {examModalTab === 'AYT' && (
              <View style={styles.scoresSection}>
                <Text style={styles.sectionTitle}>AYT Sınav Sonuçları</Text>
                
                {/* Matematik Group */}
                <View style={[styles.subjectCard, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.subjectTitle, { color: '#166534' }]}>🔢 Matematik (30)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#166534' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#10B981' }]}
                        value={examForm.ayt_matematik_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_matematik_correct: Math.max(0, Math.min(30, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#166534' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#10B981' }]}
                        value={examForm.ayt_matematik_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_matematik_wrong: Math.max(0, Math.min(30, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#166534' }]}>
                    Net: {calculateNet(examForm.ayt_matematik_correct, examForm.ayt_matematik_wrong)}
                  </Text>
                </View>

                <View style={[styles.subjectCard, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.subjectTitle, { color: '#166534' }]}>📐 Geometri (10)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#166534' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#10B981' }]}
                        value={examForm.ayt_geometri_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_geometri_correct: Math.max(0, Math.min(10, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#166534' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#10B981' }]}
                        value={examForm.ayt_geometri_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_geometri_wrong: Math.max(0, Math.min(10, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#166534' }]}>
                    Net: {calculateNet(examForm.ayt_geometri_correct, examForm.ayt_geometri_wrong)}
                  </Text>
                </View>

                {/* Fen Group */}
                <View style={[styles.subjectCard, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={[styles.subjectTitle, { color: '#EA580C' }]}>⚡ Fizik (14)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.ayt_fizik_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_fizik_correct: Math.max(0, Math.min(14, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.ayt_fizik_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_fizik_wrong: Math.max(0, Math.min(14, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#EA580C' }]}>
                    Net: {calculateNet(examForm.ayt_fizik_correct, examForm.ayt_fizik_wrong)}
                  </Text>
                </View>

                <View style={[styles.subjectCard, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={[styles.subjectTitle, { color: '#EA580C' }]}>🧪 Kimya (13)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.ayt_kimya_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_kimya_correct: Math.max(0, Math.min(13, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.ayt_kimya_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_kimya_wrong: Math.max(0, Math.min(13, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#EA580C' }]}>
                    Net: {calculateNet(examForm.ayt_kimya_correct, examForm.ayt_kimya_wrong)}
                  </Text>
                </View>

                <View style={[styles.subjectCard, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={[styles.subjectTitle, { color: '#EA580C' }]}>🧬 Biyoloji (13)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.ayt_biyoloji_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_biyoloji_correct: Math.max(0, Math.min(13, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#EA580C' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#F97316' }]}
                        value={examForm.ayt_biyoloji_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_biyoloji_wrong: Math.max(0, Math.min(13, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#EA580C' }]}>
                    Net: {calculateNet(examForm.ayt_biyoloji_correct, examForm.ayt_biyoloji_wrong)}
                  </Text>
                </View>

                {/* Sözel Group */}
                <View style={[styles.subjectCard, { backgroundColor: '#FAF5FF' }]}>
                  <Text style={[styles.subjectTitle, { color: '#7C3AED' }]}>📖 Edebiyat (24)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.ayt_edebiyat_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_edebiyat_correct: Math.max(0, Math.min(24, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.ayt_edebiyat_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_edebiyat_wrong: Math.max(0, Math.min(24, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#7C3AED' }]}>
                    Net: {calculateNet(examForm.ayt_edebiyat_correct, examForm.ayt_edebiyat_wrong)}
                  </Text>
                </View>

                <View style={[styles.subjectCard, { backgroundColor: '#FAF5FF' }]}>
                  <Text style={[styles.subjectTitle, { color: '#7C3AED' }]}>📜 Tarih (10)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.ayt_tarih_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_tarih_correct: Math.max(0, Math.min(10, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.ayt_tarih_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_tarih_wrong: Math.max(0, Math.min(10, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#7C3AED' }]}>
                    Net: {calculateNet(examForm.ayt_tarih_correct, examForm.ayt_tarih_wrong)}
                  </Text>
                </View>

                <View style={[styles.subjectCard, { backgroundColor: '#FAF5FF' }]}>
                  <Text style={[styles.subjectTitle, { color: '#7C3AED' }]}>🌍 Coğrafya (6)</Text>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Doğru</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.ayt_cografya_correct.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_cografya_correct: Math.max(0, Math.min(6, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                    <View style={styles.scoreInput}>
                      <Text style={[styles.scoreLabel, { color: '#7C3AED' }]}>Yanlış</Text>
                      <TextInput
                        style={[styles.scoreTextInput, { borderColor: '#8B5CF6' }]}
                        value={examForm.ayt_cografya_wrong.toString()}
                        onChangeText={(text) => setExamForm(prev => ({ 
                          ...prev, 
                          ayt_cografya_wrong: Math.max(0, Math.min(6, parseInt(text) || 0)) 
                        }))}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                  </View>
                  <Text style={[styles.netScore, { color: '#7C3AED' }]}>
                    Net: {calculateNet(examForm.ayt_cografya_correct, examForm.ayt_cografya_wrong)}
                  </Text>
                </View>
              </View>
            )}

            {/* Tarama Scores */}
            {examModalTab === 'Tarama' && (
              <View style={styles.scoresSection}>
                <Text style={styles.sectionTitle}>Tarama Sınav Sonuçları</Text>
                
                {examForm.tarama_lessons.map((lesson, index) => (
                  <View key={index} style={styles.taramaLessonCard}>
                    <View style={styles.taramaLessonHeader}>
                      <Text style={styles.taramaLessonTitle}>{lesson.subject}</Text>
                      <View style={styles.taramaLessonActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setTaramaForm({
                              lesson: lesson.subject,
                              question_count: lesson.question_count,
                              correct: lesson.correct,
                              wrong: lesson.wrong,
                            });
                            setEditingTaramaIndex(index);
                            setShowTaramaModal(true);
                          }}
                          style={{ marginRight: 12 }}
                        >
                          <Ionicons name="create-outline" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            const newLessons = examForm.tarama_lessons.filter((_, i) => i !== index);
                            setExamForm(prev => ({ ...prev, tarama_lessons: newLessons }));
                          }}
                        >
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.taramaLessonInfo}>
                      Soru: {lesson.question_count} | Doğru: {lesson.correct} | Yanlış: {lesson.wrong} | Net: {(lesson.correct - (lesson.wrong / 4)).toFixed(2)}
                    </Text>
                  </View>
                ))}
                
                <TouchableOpacity
                  style={styles.addTaramaButton}
                  onPress={() => {
                    console.log('🎯 Ders Ekle button pressed');
                    setTaramaForm({
                      lesson: '',
                      question_count: 10,
                      correct: 0,
                      wrong: 0,
                    });
                    setEditingTaramaIndex(null);
                    setShowTaramaModal(true);
                    console.log('🎯 showTaramaModal set to true');
                  }}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#10B981" />
                  <Text style={styles.addTaramaButtonText}>Ders Ekle</Text>
                </TouchableOpacity>
                
                {examForm.tarama_lessons.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Henüz ders eklenmedi</Text>
                    <Text style={styles.emptyStateSubtext}>"Ders Ekle" butonuna tıklayarak başlayın</Text>
                  </View>
                )}
              </View>
            )}

            {/* Notes */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Notlar</Text>
              <TextInput
                style={styles.notesInput}
                value={examForm.notes}
                onChangeText={(text) => setExamForm(prev => ({ ...prev, notes: text }))}
                placeholder="Sınav hakkında notlarınız..."
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tarama Lesson Modal */}
      {console.log('🔍 Tarama Modal render - visible:', showTaramaModal)}
      <Modal
        visible={showTaramaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTaramaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.taramaModalContent}>
            <View style={styles.taramaModalHeader}>
              <Text style={styles.taramaModalTitle}>
                {editingTaramaIndex !== null ? 'Ders Düzenle' : 'Ders Ekle'}
              </Text>
              <TouchableOpacity onPress={() => setShowTaramaModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.taramaModalBody}>
              {/* Lesson Selection */}
              <View style={styles.taramaFormGroup}>
                <Text style={styles.taramaFormLabel}>Ders *</Text>
                <View style={styles.pickerContainer}>
                  {TARAMA_LESSONS.map((lesson) => (
                    <TouchableOpacity
                      key={lesson}
                      style={[
                        styles.lessonOption,
                        taramaForm.lesson === lesson && styles.lessonOptionSelected
                      ]}
                      onPress={() => setTaramaForm(prev => ({ ...prev, lesson }))}
                    >
                      <Text style={[
                        styles.lessonOptionText,
                        taramaForm.lesson === lesson && styles.lessonOptionTextSelected
                      ]}>
                        {lesson}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Question Count */}
              <View style={styles.taramaFormGroup}>
                <Text style={styles.taramaFormLabel}>Soru Sayısı *</Text>
                <TextInput
                  style={styles.taramaFormInput}
                  value={String(taramaForm.question_count)}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    setTaramaForm(prev => ({ ...prev, question_count: Math.max(1, Math.min(100, num)) }));
                  }}
                  keyboardType="number-pad"
                  placeholder="10"
                />
              </View>

              {/* Correct Answers */}
              <View style={styles.taramaFormGroup}>
                <Text style={styles.taramaFormLabel}>Doğru Sayısı *</Text>
                <TextInput
                  style={styles.taramaFormInput}
                  value={String(taramaForm.correct)}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    setTaramaForm(prev => ({ ...prev, correct: Math.max(0, Math.min(prev.question_count, num)) }));
                  }}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>

              {/* Wrong Answers */}
              <View style={styles.taramaFormGroup}>
                <Text style={styles.taramaFormLabel}>Yanlış Sayısı *</Text>
                <TextInput
                  style={styles.taramaFormInput}
                  value={String(taramaForm.wrong)}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    setTaramaForm(prev => ({ ...prev, wrong: Math.max(0, Math.min(prev.question_count, num)) }));
                  }}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>

              {/* Net Calculation */}
              <View style={styles.netDisplay}>
                <Text style={styles.netLabel}>Net:</Text>
                <Text style={styles.netValue}>
                  {(taramaForm.correct - (taramaForm.wrong / 4)).toFixed(2)}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.taramaModalFooter}>
              <TouchableOpacity
                style={styles.taramaCancelButton}
                onPress={() => setShowTaramaModal(false)}
              >
                <Text style={styles.taramaCancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.taramaSaveButton,
                  !taramaForm.lesson && styles.taramaSaveButtonDisabled
                ]}
                disabled={!taramaForm.lesson}
                onPress={() => {
                  if (!taramaForm.lesson) return;

                  const newLesson = {
                    subject: taramaForm.lesson,
                    question_count: taramaForm.question_count,
                    correct: taramaForm.correct,
                    wrong: taramaForm.wrong,
                  };

                  if (editingTaramaIndex !== null) {
                    // Update existing lesson
                    const newLessons = [...examForm.tarama_lessons];
                    newLessons[editingTaramaIndex] = newLesson;
                    setExamForm(prev => ({ ...prev, tarama_lessons: newLessons }));
                  } else {
                    // Add new lesson
                    setExamForm(prev => ({
                      ...prev,
                      tarama_lessons: [...prev.tarama_lessons, newLesson]
                    }));
                  }

                  setShowTaramaModal(false);
                }}
              >
                <Text style={styles.taramaSaveButtonText}>
                  {editingTaramaIndex !== null ? 'Güncelle' : 'Ekle'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  examCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  examInfo: {
    flex: 1,
  },
  examTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  examTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  examName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  examDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  examActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  resultItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalNet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalNetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalNetValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#249096',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#249096',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'white',
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    fontWeight: '600',
  },
  scoresSection: {
    marginBottom: 24,
  },
  subjectCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scoreInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  scoreInput: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  scoreTextInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'white',
  },
  netScore: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  taramaLessonCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  taramaLessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taramaLessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  taramaLessonInfo: {
    fontSize: 14,
    color: '#059669',
  },
  addTaramaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  addTaramaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  taramaLessonActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  taramaModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  taramaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  taramaModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  taramaModalBody: {
    padding: 16,
  },
  taramaFormGroup: {
    marginBottom: 16,
  },
  taramaFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lessonOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
  },
  lessonOptionSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  lessonOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  lessonOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  taramaFormInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  netDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginRight: 8,
  },
  netValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  taramaModalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  taramaCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  taramaCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  taramaSaveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  taramaSaveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  taramaSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});