import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Task } from '../types/database';

export const deleteTask = async (task: Task): Promise<boolean> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Görevi Sil',
      'Bu görevi silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!supabase) {
                Alert.alert('Hata', 'Bağlantı hatası');
                resolve(false);
                return;
              }

              const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', task.id);

              if (error) {
                console.error('Task delete error:', error);
                Alert.alert('Hata', 'Görev silinirken bir hata oluştu');
                resolve(false);
                return;
              }

              resolve(true);
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Hata', 'Görev silinirken bir hata oluştu');
              resolve(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  });
};

export const toggleTaskCompletion = async (task: Task): Promise<Task | null> => {
  try {
    if (!supabase) {
      Alert.alert('Hata', 'Bağlantı hatası');
      return null;
    }

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .select()
      .single();

    if (error) {
      console.error('Task update error:', error);
      Alert.alert('Hata', 'Görev durumu güncellenirken bir hata oluştu');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error toggling task completion:', error);
    Alert.alert('Hata', 'Görev durumu güncellenirken bir hata oluştu');
    return null;
  }
};

export const getTaskTypeColor = (taskType: string): string => {
  switch (taskType) {
    case 'study':
      return '#3B82F6'; // Blue
    case 'practice':
      return '#F59E0B'; // Orange
    case 'exam':
      return '#EF4444'; // Red
    case 'review':
      return '#8B5CF6'; // Purple
    case 'resource':
      return '#10B981'; // Green
    case 'coaching_session':
      return '#059669'; // Emerald
    default:
      return '#6B7280'; // Gray
  }
};

export const getTaskTypeText = (taskType: string): string => {
  switch (taskType) {
    case 'study':
      return 'Çalışma';
    case 'practice':
      return 'Soru Çözme';
    case 'exam':
      return 'Sınav';
    case 'review':
      return 'Tekrar';
    case 'resource':
      return 'Kaynak';
    case 'coaching_session':
      return 'Koçluk Seansı';
    default:
      return 'Görev';
  }
};

export const formatTaskDisplay = (task: Task): string => {
  let display = task.title;
  
  if (task.estimated_duration) {
    display += ` (${task.estimated_duration}dk)`;
  }
  
  if (task.problem_count && task.task_type === 'practice') {
    display += ` (${task.problem_count} soru)`;
  }
  
  return display;
};

export const formatTaskTime = (task: Task): string | null => {
  if (task.scheduled_start_time) {
    if (task.scheduled_end_time) {
      return `${task.scheduled_start_time} - ${task.scheduled_end_time}`;
    }
    return task.scheduled_start_time;
  }
  return null;
}; 