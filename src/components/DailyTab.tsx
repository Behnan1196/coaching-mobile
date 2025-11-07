import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { useDateNavigation } from '../contexts/DateNavigationContext';
import { Task, Subject, Topic, Resource, TaskWithRelations } from '../types/database';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { useRealTimeSubscription } from '../hooks/useActivityTracking';

export const DailyTab: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  const { selectedDate, setSelectedDate } = useDateNavigation();
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const currentUser = userProfile?.role === 'student' ? userProfile : selectedStudent;

  useEffect(() => {
    console.log('📅 DailyTab: Date changed to:', selectedDate.toISOString().split('T')[0]);
    if (currentUser) {
      loadDailyTasks();
      if (subjects.length === 0) {
        loadRelatedData();
      }
    }
  }, [currentUser, selectedDate]);

  // Initial load effect
  useEffect(() => {
    console.log('🚀 DailyTab: Initial mount, currentUser:', !!currentUser);
    if (currentUser) {
      setLoading(true);
      loadDailyTasks();
      loadRelatedData();
    }
  }, [currentUser]);

  // Use the new real-time subscription hook
  const { isConnected, lastError, reconnect } = useRealTimeSubscription({
    channelName: `daily-task-updates-${currentUser?.id}-${selectedDate.toISOString().split('T')[0]}`,
    table: 'tasks',
    filter: currentUser ? `assigned_to=eq.${currentUser.id}` : undefined,
    enabled: !!currentUser,
    userId: currentUser?.id,
    onUpdate: (payload) => {
      console.log('📝 [DAILY] Updating task:', payload.new.id);
      setTasks(prev => prev.map(task => 
        task.id === payload.new.id 
          ? { ...task, ...payload.new, completed_at: payload.new.completed_at || undefined }
          : task
      ));
    },
    onInsert: (payload) => {
      console.log('➕ [DAILY] New task inserted:', payload.new.id);
      const targetDate = selectedDate.toISOString().split('T')[0];
      if (payload.new.scheduled_date === targetDate) {
        setTasks(prev => [...prev, {
          ...payload.new,
          completed_at: payload.new.completed_at || undefined
        } as any]);
      }
    },
    onDelete: (payload) => {
      console.log('🗑️ [DAILY] Task deleted:', payload.old.id);
      setTasks(prev => prev.filter(task => task.id !== payload.old.id));
    }
  });

  // Show connection status and error handling
  useEffect(() => {
    if (lastError) {
      console.warn(`⚠️ [DAILY] Real-time subscription error: ${lastError}`);
    }
  }, [lastError]);

  const loadDailyTasks = async () => {
    if (!currentUser || !supabase) {
      console.log('⚠️ DailyTab: Cannot load tasks - missing currentUser or supabase');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const targetDate = selectedDate.toISOString().split('T')[0];
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          subjects (
            id,
            name
          ),
          topics (
            id,
            name
          ),
          resources (
            id,
            name
          )
        `)
        .eq('assigned_to', currentUser.id)
        .eq('scheduled_date', targetDate)
        .order('scheduled_date', { ascending: true })
        .order('created_at', { ascending: true });

      console.log('📱 [DAILY] Loading tasks for date:', targetDate, 'student:', currentUser.id);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      console.log('✅ [DAILY] Loaded', data?.length || 0, 'tasks for', targetDate);
      setTasks(data || []);
    } catch (error) {
      console.error('❌ Error loading daily tasks:', error);
      Alert.alert('Hata', 'Günlük görevler yüklenirken bir hata oluştu');
      setTasks([]); // Set empty array on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRelatedData = async () => {
    if (!supabase) {
      console.log('⚠️ DailyTab: Cannot load related data - missing supabase');
      return;
    }

    try {
      console.log('📚 [DAILY] Loading related data (subjects, topics, resources)');
      
      // Load subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      // Load topics
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      // Load resources
      const { data: resourcesData } = await supabase
        .from('resources')
        .select('*')
        .eq('is_active', true)
        .order('name');

      console.log('✅ [DAILY] Loaded related data:', {
        subjects: subjectsData?.length || 0,
        topics: topicsData?.length || 0,
        resources: resourcesData?.length || 0
      });

      setSubjects(subjectsData || []);
      setTopics(topicsData || []);
      setResources(resourcesData || []);
    } catch (error) {
      console.error('❌ Error loading related data:', error);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    console.log('🔄 DailyTab: Navigating date from', selectedDate.toISOString().split('T')[0], 'to', newDate.toISOString().split('T')[0]);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id 
          ? { ...task, ...updatedTask }
          : task
      )
    );
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleTaskSaved = () => {
    loadDailyTasks();
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDailyTasks();
  };

  const getTaskStats = () => {
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const totalTasks = tasks.length;
    return { completedTasks, totalTasks };
  };

  const getSubjectById = (subjectId: string | undefined) => {
    return subjects.find(s => s.id === subjectId);
  };

  const getTopicById = (topicId: string | undefined) => {
    return topics.find(t => t.id === topicId);
  };

  const getResourceById = (resourceId: string | undefined) => {
    return resources.find(r => r.id === resourceId);
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const getDateDisplayText = () => {
    if (isToday()) {
      return 'Bugün';
    }
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (selectedDate.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    }
    
    if (selectedDate.toDateString() === tomorrow.toDateString()) {
      return 'Yarın';
    }
    
    return selectedDate.toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  if (!currentUser) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {userProfile?.role === 'coach' ? 'Lütfen bir öğrenci seçin' : 'Kullanıcı bilgisi yüklenemedi'}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#249096" />
        <Text style={styles.loadingText}>Günlük görevler yükleniyor...</Text>
      </View>
    );
  }

  const { completedTasks, totalTasks } = getTaskStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dateNavigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateDate('prev')}
          >
            <Ionicons name="chevron-back" size={20} color="#374151" />
          </TouchableOpacity>
          
          <View style={styles.dateInfo}>
            <Text style={styles.headerTitle}>{getDateDisplayText()}</Text>
            <Text style={styles.headerSubtitle}>
              {selectedDate.toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateDate('next')}
          >
            <Ionicons name="chevron-forward" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
        
        {!isToday() && (
          <TouchableOpacity
            style={styles.todayButton}
            onPress={goToToday}
          >
            <Text style={styles.todayButtonText}>Bugüne Git</Text>
          </TouchableOpacity>
        )}
        
        {totalTasks > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {completedTasks}/{totalTasks} görev tamamlandı
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(completedTasks / totalTasks) * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#249096']}
          />
        }
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isToday() ? '🎉 Bugün için görev yok!' : '📅 Bu gün için görev yok'}
            </Text>
            <Text style={styles.emptySubtext}>
              {isToday() 
                ? 'Hoş bir gün geçir veya yarın için hazırlık yapabilirsin.'
                : 'Bu tarih için henüz görev planlanmamış.'
              }
            </Text>
          </View>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              subject={getSubjectById(task.subject_id)}
              topic={getTopicById(task.topic_id)}
              resource={getResourceById(task.resource_id)}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onTaskEdit={handleTaskEdit}
              userRole={userProfile?.role}
              userId={userProfile?.id}
            />
          ))
        )}
      </ScrollView>
      
      {/* Floating Action Button for Coaches */}
      {userProfile?.role === 'coach' && selectedStudent && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddTask}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Task Modal */}
      <TaskModal
        visible={showTaskModal}
        onClose={handleCloseModal}
        task={editingTask}
        selectedDate={selectedDate}
        onTaskSaved={handleTaskSaved}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  todayButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#249096',
    borderRadius: 20,
    marginBottom: 12,
  },
  todayButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    marginTop: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#249096',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});