import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Dimensions
} from 'react-native';
import { Task, Subject, Topic, Resource, UserRole } from '../types/database';
import { supabase } from '../lib/supabase';
import { deleteTask, toggleTaskCompletion } from '../utils/taskUtils';

interface TaskCardProps {
  task: Task;
  subject?: Subject;
  topic?: Topic;
  resource?: Resource;
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
  onTaskUpdate,
  onTaskDelete,
  onTaskEdit,
  userRole,
  userId,
  compact = false
}) => {
  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'resource':
        return '#10B981'; // Green for KAYNAK
      case 'study':
        return '#3B82F6'; // Blue for ÇALIŞMA
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
      default:
        return taskType.toUpperCase();
    }
  };

  const formatDuration = (minutes: number) => {
    return `${minutes}dk`;
  };

  const formatQuestionCount = (count: number) => {
    return `${count} soru`;
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

  // Check if user can edit/delete this task
  const canEditTask = userRole === 'coach' && task.assigned_by === userId;
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
              <Text style={styles.actionButtonText}>✏️</Text>
            </TouchableOpacity>
          )}
          {canEditTask && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <Text style={styles.actionButtonText}>🗑️</Text>
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
        <Text style={[styles.taskTitle, isCompleted && styles.completedText]} numberOfLines={compact ? 2 : 3}>
          {task.title}
        </Text>
        
        {subject && (
          <Text style={[styles.taskSubject, isCompleted && styles.completedText]}>
            {subject.name}
          </Text>
        )}
        
        {topic && (
          <Text style={[styles.taskTopic, isCompleted && styles.completedText]}>
            {topic.name}
          </Text>
        )}
        
        <View style={styles.taskDetails}>
          {task.estimated_duration && (
            <Text style={[styles.detailText, isCompleted && styles.completedText]}>
              {formatDuration(task.estimated_duration)}
            </Text>
          )}
          
          {task.problem_count && (
            <Text style={[styles.detailText, isCompleted && styles.completedText]}>
              {formatQuestionCount(task.problem_count)}
            </Text>
          )}
          
          {task.scheduled_start_time && (
            <Text style={[styles.detailText, isCompleted && styles.completedText]}>
              {task.scheduled_start_time}
            </Text>
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
    backgroundColor: '#3B82F6',
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
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  taskSubject: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginBottom: 4,
  },
  taskTopic: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  taskDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    textDecorationLine: 'line-through',
  },
}); 