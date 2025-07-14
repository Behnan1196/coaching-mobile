import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Task, TaskType, Subject, Topic, Resource, MockExam } from '../types/database';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  task?: Task | null;
  selectedDate?: Date;
  onTaskSaved: () => void;
}

interface TaskFormData {
  title: string;
  description: string;
  subject_id: string;
  topic_id: string;
  resource_id: string;
  mock_exam_id: string;
  task_type: TaskType;
  scheduled_start_time: string;
  estimated_duration: number;
  problem_count: number;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  onClose,
  task,
  selectedDate,
  onTaskSaved,
}) => {
  const { user } = useAuth();
  const { selectedStudent } = useCoachStudent();

  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    subject_id: '',
    topic_id: '',
    resource_id: '',
    mock_exam_id: '',
    task_type: 'study',
    scheduled_start_time: '',
    estimated_duration: 60,
    problem_count: 10,
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load reference data
  useEffect(() => {
    if (visible) {
      loadReferenceData();
    }
  }, [visible]);

  // Initialize form data when task or selectedDate changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        subject_id: task.subject_id || '',
        topic_id: task.topic_id || '',
        resource_id: task.resource_id || '',
        mock_exam_id: task.mock_exam_id || '',
        task_type: task.task_type,
        scheduled_start_time: task.scheduled_start_time || '',
        estimated_duration: task.estimated_duration || 60,
        problem_count: task.problem_count || 10,
      });
    } else {
          setFormData({
      title: '',
      description: '',
      subject_id: '',
      topic_id: '',
      resource_id: '',
      mock_exam_id: '',
      task_type: 'study',
      scheduled_start_time: '',
      estimated_duration: 60,
      problem_count: 10,
    });
    }
    setErrors({});
  }, [task, visible]);

  const loadReferenceData = async () => {
    try {
      if (!supabase) return;
      
      const [subjectsRes, topicsRes, resourcesRes, mockExamsRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('is_active', true).order('name'),
        supabase.from('topics').select('*').eq('is_active', true).order('name'),
        supabase.from('resources').select('*').eq('is_active', true).order('name'),
        supabase.from('mock_exams').select('*').eq('is_active', true).order('name'),
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (topicsRes.data) setTopics(topicsRes.data);
      if (resourcesRes.data) setResources(resourcesRes.data);
      if (mockExamsRes.data) setMockExams(mockExamsRes.data);
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Görev başlığı gereklidir';
    }

    if (formData.task_type === 'resource' && !formData.resource_id) {
      newErrors.resource_id = 'Kaynak türü görevler için kaynak seçimi gereklidir';
    }

    if ((formData.task_type === 'exam' || formData.task_type === 'practice') && !formData.mock_exam_id) {
      newErrors.mock_exam_id = 'Sınav türü görevler için deneme sınavı seçimi gereklidir';
    }

    if (formData.task_type === 'coaching_session' && !formData.scheduled_start_time) {
      newErrors.scheduled_start_time = 'Koçluk seansları için başlangıç saati gereklidir';
    }

    if (formData.estimated_duration < 1 || formData.estimated_duration > 480) {
      newErrors.estimated_duration = 'Tahmini süre 1-480 dakika arasında olmalıdır';
    }

    if (formData.task_type === 'practice' && (formData.problem_count < 1 || formData.problem_count > 100)) {
      newErrors.problem_count = 'Soru sayısı 1-100 arasında olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !selectedStudent || !user || !supabase) {
      return;
    }

    setLoading(true);
    try {
      const taskDate = selectedDate || (task ? new Date(task.scheduled_date!) : new Date());
      const taskData = {
        title: formData.title.trim() || 'Görev',
        description: formData.description.trim() || null,
        subject_id: formData.subject_id || null,
        topic_id: formData.topic_id || null,
        resource_id: formData.resource_id || null,
        mock_exam_id: formData.mock_exam_id || null,
        task_type: formData.task_type,
        scheduled_date: taskDate.toISOString().split('T')[0],
        scheduled_start_time: formData.scheduled_start_time || null,
        estimated_duration: formData.estimated_duration,
        problem_count: formData.task_type === 'practice' ? formData.problem_count : null,
        assigned_to: selectedStudent.id,
        assigned_by: user.id,
        status: 'pending' as const,
        priority: 'medium' as const,
      };

      if (task) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update({
            ...taskData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        if (error) throw error;
      } else {
        // Create new task
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);

        if (error) throw error;
      }

      onTaskSaved();
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert('Hata', 'Görev kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getTaskTypeText = (type: TaskType): string => {
    switch (type) {
      case 'study': return 'Çalışma';
      case 'practice': return 'Soru Çözme';
      case 'exam': return 'Sınav';
      case 'review': return 'Tekrar';
      case 'resource': return 'Kaynak';
      case 'coaching_session': return 'Koçluk Seansı';
      default: return 'Çalışma';
    }
  };

  const filteredTopics = topics.filter(topic => 
    !formData.subject_id || topic.subject_id === formData.subject_id
  );

  const filteredResources = resources.filter(resource => 
    !formData.subject_id || resource.subject_id === formData.subject_id
  );

  const filteredMockExams = mockExams.filter(mockExam => 
    !formData.subject_id || mockExam.subject_id === formData.subject_id
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {task ? 'Görevi Düzenle' : 'Yeni Görev'}
          </Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Görev Başlığı *</Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Görev başlığı..."
                placeholderTextColor="#9CA3AF"
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            {/* Task Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Görev Türü *</Text>
              <View style={styles.pickerContainer}>
                                 <Picker
                   selectedValue={formData.task_type}
                   style={styles.picker}
                   onValueChange={(itemValue: TaskType) => {
                     setFormData(prev => ({ 
                       ...prev, 
                       task_type: itemValue,
                       // Clear dependent fields when task type changes
                       resource_id: itemValue === 'resource' ? prev.resource_id : '',
                       mock_exam_id: ['exam', 'practice'].includes(itemValue) ? prev.mock_exam_id : '',
                       problem_count: itemValue === 'practice' ? prev.problem_count : 10,
                     }));
                   }}
                 >
                  <Picker.Item label="Çalışma" value="study" />
                  <Picker.Item label="Soru Çözme" value="practice" />
                  <Picker.Item label="Sınav" value="exam" />
                  <Picker.Item label="Tekrar" value="review" />
                  <Picker.Item label="Kaynak" value="resource" />
                  <Picker.Item label="Koçluk Seansı" value="coaching_session" />
                </Picker>
              </View>
            </View>

            {/* Subject */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ders (Opsiyonel)</Text>
              <View style={styles.pickerContainer}>
                                 <Picker
                   selectedValue={formData.subject_id}
                   style={styles.picker}
                   onValueChange={(itemValue: string) => {
                     setFormData(prev => ({ 
                       ...prev, 
                       subject_id: itemValue,
                       topic_id: '', // Reset topic when subject changes
                     }));
                   }}
                 >
                  <Picker.Item label="Ders seçiniz..." value="" />
                  {subjects.map(subject => (
                    <Picker.Item key={subject.id} label={subject.name} value={subject.id} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Topic */}
            {formData.subject_id && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Konu (Opsiyonel)</Text>
                <View style={styles.pickerContainer}>
                                     <Picker
                     selectedValue={formData.topic_id}
                     style={styles.picker}
                     onValueChange={(itemValue: string) => setFormData(prev => ({ ...prev, topic_id: itemValue }))}
                   >
                    <Picker.Item label="Konu seçiniz..." value="" />
                    {filteredTopics.map(topic => (
                      <Picker.Item key={topic.id} label={topic.name} value={topic.id} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {/* Resource Selection */}
            {formData.task_type === 'resource' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Kaynak Seçimi *</Text>
                <View style={styles.pickerContainer}>
                                     <Picker
                     selectedValue={formData.resource_id}
                     style={styles.picker}
                     onValueChange={(itemValue: string) => setFormData(prev => ({ ...prev, resource_id: itemValue }))}
                   >
                    <Picker.Item label="Kaynak seçiniz..." value="" />
                    {filteredResources.map(resource => (
                      <Picker.Item 
                        key={resource.id} 
                        label={`${resource.name} (${resource.category.toUpperCase()})`} 
                        value={resource.id} 
                      />
                    ))}
                  </Picker>
                </View>
                {errors.resource_id && <Text style={styles.errorText}>{errors.resource_id}</Text>}
              </View>
            )}

            {/* Mock Exam Selection */}
            {(formData.task_type === 'exam' || formData.task_type === 'practice') && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Deneme Sınavı *</Text>
                <View style={styles.pickerContainer}>
                                     <Picker
                     selectedValue={formData.mock_exam_id}
                     style={styles.picker}
                     onValueChange={(itemValue: string) => setFormData(prev => ({ ...prev, mock_exam_id: itemValue }))}
                   >
                    <Picker.Item label="Deneme sınavı seçiniz..." value="" />
                    {filteredMockExams.map(mockExam => (
                      <Picker.Item key={mockExam.id} label={mockExam.name} value={mockExam.id} />
                    ))}
                  </Picker>
                </View>
                {errors.mock_exam_id && <Text style={styles.errorText}>{errors.mock_exam_id}</Text>}
              </View>
            )}

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Görev Açıklaması (Opsiyonel)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Görev açıklaması..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Problem Count - Only for practice tasks */}
            {formData.task_type === 'practice' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Soru Sayısı</Text>
                <TextInput
                  style={[styles.input, errors.problem_count && styles.inputError]}
                  value={formData.problem_count.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 10;
                    setFormData(prev => ({ ...prev, problem_count: num }));
                  }}
                  placeholder="Çözülecek soru sayısı"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                {errors.problem_count && <Text style={styles.errorText}>{errors.problem_count}</Text>}
              </View>
            )}

            {/* Start Time */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Başlangıç Saati {formData.task_type === 'coaching_session' ? '*' : '(Opsiyonel)'}
              </Text>
              <TextInput
                style={[styles.input, errors.scheduled_start_time && styles.inputError]}
                value={formData.scheduled_start_time}
                onChangeText={(text) => setFormData(prev => ({ ...prev, scheduled_start_time: text }))}
                placeholder="ÖR: 14:30"
                placeholderTextColor="#9CA3AF"
              />
              {errors.scheduled_start_time && <Text style={styles.errorText}>{errors.scheduled_start_time}</Text>}
            </View>



            {/* Estimated Duration */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tahmini Süre (dakika)</Text>
              <TextInput
                style={[styles.input, errors.estimated_duration && styles.inputError]}
                value={formData.estimated_duration.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 60;
                  setFormData(prev => ({ ...prev, estimated_duration: num }));
                }}
                placeholder="Tahmini süre (dakika)"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
              {errors.estimated_duration && <Text style={styles.errorText}>{errors.estimated_duration}</Text>}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#111827',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
}); 