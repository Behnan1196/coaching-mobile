import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Dimensions,
  Linking,
  TextInput
} from 'react-native';
import { Task, Subject, Topic, Resource, UserRole } from '../types/database';
import { supabase } from '../lib/supabase';
import { deleteTask, toggleTaskCompletion } from '../utils/taskUtils';

interface TaskCardProps {
  task: Task;
  subject?: Subject;
  topic?: Topic;
  resource?: Resource;
  mockExam?: {
    id: string;
    name: string;
  };
  onTaskUpdate?: (updatedTask: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskEdit?: (task: Task) => void;
  userRole?: UserRole;
  userId?: string;
  compact?: boolean;
}

const { width } = Dimensions.get('window');

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  subject,
  topic,
  resource,
  mockExam: propMockExam,
  onTaskUpdate,
  onTaskDelete,
  onTaskEdit,
  userRole,
  userId,
  compact = false
}) => {
  const [mockExam, setMockExam] = useState(propMockExam);
  const [isEditingProblemCount, setIsEditingProblemCount] = useState(false);
  const [editingProblemCount, setEditingProblemCount] = useState(task.problem_count?.toString() || '');
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [editingDuration, setEditingDuration] = useState(task.estimated_duration?.toString() || '');

  useEffect(() => {
    const fetchMockExam = async () => {
      if (task.mock_exam_id && !mockExam && supabase) {
        const { data, error } = await supabase
          .from('mock_exams')
          .select('id, name')
          .eq('id', task.mock_exam_id)
          .single();

        if (data && !error) {
          setMockExam(data);
        }
      }
    };

    fetchMockExam();
  }, [task.mock_exam_id]);

  const handleResourcePress = async () => {
    if (resource?.url) {
      try {
        const supported = await Linking.canOpenURL(resource.url);
        if (supported) {
          await Linking.openURL(resource.url);
        } else {
          Alert.alert('Hata', 'Bu kaynağın linkine erişilemiyor.');
        }
      } catch (error) {
        Alert.alert('Hata', 'Kaynak açılırken bir hata oluştu.');
      }
    }
  };
  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'resource':
        return '#10B981'; // Green for KAYNAK
      case 'study':
        return '#249096'; // Blue for ÇALIŞMA
      case 'practice':
        return '#F59E0B'; // Orange for SORU ÇÖZ
      case 'exam':
        return '#EF4444'; // Red for EXAM
      case 'review':
        return '#8B5CF6'; // Purple for REVIEW
      default:
        return '#6B7280'; // Gray for other types
    }
  };

  const getTaskTypeText = (taskType: string) => {
    switch (taskType) {
      case 'resource':
        return 'KAYNAK';
      case 'study':
        return 'ÇALIŞMA';
      case 'practice':
        return 'SORU ÇÖZ';
      case 'exam':
        return 'SINAV';
      case 'review':
        return 'TEKRAR';
      case 'coaching_session':
        return 'KOÇLUK';
      case 'deneme_analizi':
        return 'DENEME ANALİZİ';
      default:
        return taskType.toUpperCase();
    }
  };

  const formatDuration = (minutes: number) => {
    return `${minutes}dk`;
  };

  const formatQuestionCount = (count: number | null | undefined) => {
    if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
      return `${count} soru`;
    }
    return null;
  };

  const formatStartTime = (timeString: string) => {
    // Remove seconds from the time string if they exist
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    }
    return timeString;
  };

  const handleToggleComplete = async () => {
    if (!task) return;

    const updatedTask = await toggleTaskCompletion(task);
    if (updatedTask && onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }
  };

  const handleEdit = () => {
    if (onTaskEdit) {
      onTaskEdit(task);
    }
  };

  const handleDelete = async () => {
    const deleted = await deleteTask(task);
    if (deleted && onTaskDelete) {
      onTaskDelete(task.id);
    }
  };

  const handleProblemCountUpdate = async () => {
    const newCount = parseInt(editingProblemCount);
    
    if (isNaN(newCount) || newCount < 0) {
      Alert.alert('Hata', 'Geçerli bir sayı girin');
      setEditingProblemCount(task.problem_count?.toString() || '');
      setIsEditingProblemCount(false);
      return;
    }

    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          problem_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data && onTaskUpdate) {
        onTaskUpdate(data);
      }
      
      setIsEditingProblemCount(false);
    } catch (error) {
      console.error('Error updating problem count:', error);
      Alert.alert('Hata', 'Soru sayısı güncellenirken bir hata oluştu');
      setEditingProblemCount(task.problem_count?.toString() || '');
      setIsEditingProblemCount(false);
    }
  };

  const handleProblemCountEdit = () => {
    setEditingProblemCount(task.problem_count?.toString() || '');
    setIsEditingProblemCount(true);
  };

  const handleProblemCountCancel = () => {
    setEditingProblemCount(task.problem_count?.toString() || '');
    setIsEditingProblemCount(false);
  };

  const handleDurationUpdate = async () => {
    const newDuration = parseInt(editingDuration);
    
    if (isNaN(newDuration) || newDuration <= 0) {
      Alert.alert('Hata', 'Geçerli bir süre girin (pozitif sayı)');
      setEditingDuration(task.estimated_duration?.toString() || '');
      setIsEditingDuration(false);
      return;
    }

    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          estimated_duration: newDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data && onTaskUpdate) {
        onTaskUpdate(data);
      }
      
      setIsEditingDuration(false);
    } catch (error) {
      console.error('Error updating duration:', error);
      Alert.alert('Hata', 'Süre güncellenirken bir hata oluştu');
      setEditingDuration(task.estimated_duration?.toString() || '');
      setIsEditingDuration(false);
    }
  };

  const handleDurationEdit = () => {
    setEditingDuration(task.estimated_duration?.toString() || '');
    setIsEditingDuration(true);
  };

  const handleDurationCancel = () => {
    setEditingDuration(task.estimated_duration?.toString() || '');
    setIsEditingDuration(false);
  };

  // Check if user can edit/delete this task
  // Coaches can edit any task they can see (filtering ensures only appropriate tasks are shown)
  // Students can edit problem_count for specific task types
  const canEditTask = userRole === 'coach';
  const canEditProblemCount = userRole === 'student' && task.assigned_to === userId && 
    ['practice', 'study', 'review'].includes(task.task_type);
  const canEditDuration = userRole === 'student' && task.assigned_to === userId;
  const canCompleteTask = userRole === 'student' && task.assigned_to === userId || userRole === 'coach';
  const isCompleted = task.status === 'completed';
  const taskTypeColor = getTaskTypeColor(task.task_type);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={styles.taskHeader}>
        <View style={[styles.taskTypeChip, { backgroundColor: taskTypeColor }]}>
          <Text style={styles.taskTypeText}>{getTaskTypeText(task.task_type)}</Text>
        </View>
        <View style={styles.actionButtons}>
          {canEditTask && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleEdit}
            >
              <Text style={styles.actionButtonText}>{'✏️'}</Text>
            </TouchableOpacity>
          )}
          {canEditTask && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <Text style={styles.actionButtonText}>{'🗑️'}</Text>
            </TouchableOpacity>
          )}
          {canCompleteTask && (
            <TouchableOpacity
              style={[styles.statusButton, isCompleted && styles.completedButton]}
              onPress={handleToggleComplete}
            >
              <Text style={[styles.statusButtonText, isCompleted && styles.completedButtonText]}>
                {isCompleted ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.taskContent}>
        {/* Subject/Topic line based on task type */}
        {subject && (
          <Text style={[styles.taskSubjectTopic, isCompleted && styles.completedText]}>
            {['study', 'review', 'practice'].includes(task.task_type) && topic
              ? `${subject.name} - ${topic.name}`
              : subject.name}
          </Text>
        )}

        {/* Mock exam name for SORU ÇÖZ and SINAV */}
        {['practice', 'exam'].includes(task.task_type) && mockExam && (
          <Text style={[styles.mockExamName, isCompleted && styles.completedText]}>
            {mockExam.name}
          </Text>
        )}

        {/* Resource name with link for KAYNAK */}
        {task.task_type === 'resource' && resource && (
          <TouchableOpacity onPress={handleResourcePress}>
            <Text style={[styles.resourceName, isCompleted && styles.completedText]}>
              {resource.name} 🔗
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Description for all types */}
        {task.description && (
          <Text style={[styles.taskDescription, isCompleted && styles.completedText]} numberOfLines={2}>
            {task.description}
          </Text>
        )}

        {/* Problem count for SORU ÇÖZ, SINAV, ÇALIŞMA and TEKRAR */}
        {(task.task_type === 'practice' || task.task_type === 'exam' || task.task_type === 'study' || task.task_type === 'review') && (
          <View style={styles.problemCountContainer}>
            {isEditingProblemCount ? (
              <View style={styles.problemCountEditContainer}>
                <TextInput
                  style={[styles.problemCountInput, isCompleted && styles.completedText]}
                  value={editingProblemCount}
                  onChangeText={setEditingProblemCount}
                  placeholder="Soru sayısı"
                  keyboardType="numeric"
                  autoFocus
                />
                <View style={styles.problemCountButtons}>
                  <TouchableOpacity
                    style={styles.problemCountButton}
                    onPress={handleProblemCountUpdate}
                  >
                    <Text style={styles.problemCountButtonText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.problemCountButton}
                    onPress={handleProblemCountCancel}
                  >
                    <Text style={styles.problemCountButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={canEditProblemCount ? handleProblemCountEdit : undefined}
                disabled={!canEditProblemCount}
                style={canEditProblemCount ? styles.problemCountEditable : undefined}
              >
                <Text style={[styles.problemCount, styles.boldText, isCompleted && styles.completedText]}>
                  {formatQuestionCount(task.problem_count) || 'Soru yok'}
                </Text>
                {canEditProblemCount && (
                  <Text style={styles.editHint}>Dokunarak düzenle</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Time and Duration row */}
        <View style={styles.taskDetails}>
          <Text style={[styles.detailText, isCompleted && styles.completedText]}>
            {task.scheduled_start_time ? formatStartTime(task.scheduled_start_time) : '--:--'}
          </Text>
          
          {task.estimated_duration && (
            <View style={styles.durationContainer}>
              {isEditingDuration ? (
                <View style={styles.durationEditContainer}>
                  <TextInput
                    style={[styles.durationInput, isCompleted && styles.completedText]}
                    value={editingDuration}
                    onChangeText={setEditingDuration}
                    placeholder="Süre (dk)"
                    keyboardType="numeric"
                    autoFocus
                  />
                  <View style={styles.durationButtons}>
                    <TouchableOpacity
                      style={styles.durationButton}
                      onPress={handleDurationUpdate}
                    >
                      <Text style={styles.durationButtonText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.durationButton}
                      onPress={handleDurationCancel}
                    >
                      <Text style={styles.durationButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={canEditDuration ? handleDurationEdit : undefined}
                  disabled={!canEditDuration}
                  style={canEditDuration ? styles.durationEditable : undefined}
                >
                  <Text style={[styles.detailText, isCompleted && styles.completedText]}>
                    {formatDuration(task.estimated_duration)}
                  </Text>
                  {canEditDuration && (
                    <Text style={styles.editHint}>Dokunarak düzenle</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  compactContainer: {
    padding: 12,
    marginBottom: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 14,
  },
  taskTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#249096',
  },
  taskTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  completedButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  statusButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  completedButtonText: {
    color: 'white',
  },
  taskContent: {
    flex: 1,
  },
  taskSubjectTopic: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700',
    marginBottom: 4,
  },
  mockExamName: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    marginBottom: 4,
  },
  resourceName: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
    marginBottom: 4,
    textDecorationLine: 'underline',
  },
  taskDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  problemCountContainer: {
    marginBottom: 8,
  },
  problemCount: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  problemCountEditable: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  problemCountEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  problemCountInput: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'white',
  },
  problemCountButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  problemCountButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  problemCountButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  editHint: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  boldText: {
    fontWeight: 'bold',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationEditable: {
    padding: 4,
    borderRadius: 4,
  },
  durationEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    minWidth: 60,
    textAlign: 'center',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  durationButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  taskDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedText: {
    opacity: 0.6,
  },
});