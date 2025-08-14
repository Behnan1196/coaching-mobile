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
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { Task, Subject, Topic, Resource, TaskWithRelations } from '../types/database';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';

export const TodayTab: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
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
    if (currentUser) {
      loadTodayTasks();
      loadRelatedData();
    }
  }, [currentUser]);

  // Setup real-time subscription for task updates
  useEffect(() => {
    if (!currentUser || !supabase) return;

    console.log(`📡 [TODAY] Setting up real-time subscription for user: ${currentUser.id}`);
    
    const subscription = supabase
      .channel(`today-task-updates-${currentUser.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: userProfile?.id || currentUser.id }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('📡 [TODAY] Real-time task update received:', payload);
          
          const today = new Date().toISOString().split('T')[0];
          
          if (payload.eventType === 'UPDATE') {
            console.log('📝 [TODAY] Updating task:', payload.new.id);
            setTasks(prev => prev.map(task => 
              task.id === payload.new.id 
                ? { ...task, ...payload.new, completed_at: payload.new.completed_at || undefined }
                : task
            ));
          } else if (payload.eventType === 'INSERT') {
            console.log('➕ [TODAY] New task inserted:', payload.new.id);
            // Check if the new task is for today
            if (payload.new.scheduled_date === today) {
              setTasks(prev => [...prev, {
                ...payload.new,
                completed_at: payload.new.completed_at || undefined
              } as any]);
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ [TODAY] Task deleted:', payload.old.id);
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log(`📊 [TODAY] Subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [TODAY] Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [TODAY] Real-time subscription error');
        }
      });

    return () => {
      console.log('🧹 [TODAY] Cleaning up real-time subscription');
      if (supabase) {
        supabase.removeChannel(subscription);
      }
    };
  }, [currentUser, userProfile]);

  const loadTodayTasks = async () => {
    if (!currentUser || !supabase) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
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
        .eq('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .order('created_at', { ascending: true });

      // Both coaches and students see all tasks assigned to the student, regardless of who created them
      console.log('📱 [TODAY] Loading all tasks assigned to student:', currentUser.id);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error loading today tasks:', error);
      Alert.alert('Hata', 'Bugünkü görevler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRelatedData = async () => {
    if (!supabase) return;

    try {
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

      setSubjects(subjectsData || []);
      setTopics(topicsData || []);
      setResources(resourcesData || []);
    } catch (error) {
      console.error('Error loading related data:', error);
    }
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
    loadTodayTasks();
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTodayTasks();
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
        <Text style={styles.loadingText}>Bugünkü görevler yükleniyor...</Text>
      </View>
    );
  }

  const { completedTasks, totalTasks } = getTaskStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bugünkü Görevler</Text>
        <Text style={styles.headerSubtitle}>
          {new Date().toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
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
            <Text style={styles.emptyText}>🎉 Bugün için görev yok!</Text>
            <Text style={styles.emptySubtext}>
              Hoş bir gün geçir veya yarın için hazırlık yapabilirsin.
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
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Task Modal */}
      <TaskModal
        visible={showTaskModal}
        onClose={handleCloseModal}
        task={editingTask}
        selectedDate={new Date()}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
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
  fabText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
}); 