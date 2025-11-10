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
  Dimensions
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { Task, Subject, Topic, Resource, TaskWithRelations } from '../types/database';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { useRealTimeSubscription } from '../hooks/useActivityTracking';

const { width } = Dimensions.get('window');

export const WeeklyPlanTab: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const currentUser = userProfile?.role === 'student' ? userProfile : selectedStudent;

  useEffect(() => {
    if (currentUser) {
      loadWeeklyTasks();
      loadRelatedData();
    }
  }, [currentUser, currentWeek]);

  // Use the new real-time subscription hook
  const { isConnected, lastError, reconnect } = useRealTimeSubscription({
    channelName: `weekly-task-updates-${currentUser?.id}-${currentWeek.getTime()}`,
    table: 'tasks',
    filter: currentUser ? `assigned_to=eq.${currentUser.id}` : undefined,
    enabled: !!currentUser,
    userId: currentUser?.id,
    onUpdate: (payload) => {
      console.log('📝 [WEEKLY] Updating task:', payload.new.id);
      setTasks(prev => prev.map(task => 
        task.id === payload.new.id 
          ? { ...task, ...payload.new, completed_at: payload.new.completed_at || undefined }
          : task
      ));
    },
    onInsert: (payload) => {
      console.log('➕ [WEEKLY] New task inserted:', payload.new.id);
      const weekStart = getWeekStart(currentWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const taskDate = new Date(payload.new.scheduled_date);
      if (taskDate >= weekStart && taskDate <= weekEnd) {
        setTasks(prev => [...prev, {
          ...payload.new,
          completed_at: payload.new.completed_at || undefined
        } as any]);
      }
    },
    onDelete: (payload) => {
      console.log('🗑️ [WEEKLY] Task deleted:', payload.old.id);
      setTasks(prev => prev.filter(task => task.id !== payload.old.id));
    }
  });

  // Show connection status and error handling
  useEffect(() => {
    if (lastError) {
      console.warn(`⚠️ [WEEKLY] Real-time subscription error: ${lastError}`);
    }
  }, [lastError]);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    
    // Alternative approach: Use a more explicit calculation
    let daysToSubtract;
    if (day === 0) { // Sunday
      daysToSubtract = 6; // Go back 6 days to Monday
    } else { // Monday = 1, Tuesday = 2, etc.
      daysToSubtract = day - 1; // Go back to Monday
    }
    
    const result = new Date(d);
    result.setDate(d.getDate() - daysToSubtract);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const getWeekDates = (date: Date) => {
    const weekStart = getWeekStart(date);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const loadWeeklyTasks = async () => {
    if (!currentUser || !supabase) return;

    try {
      const weekStart = getWeekStart(currentWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

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
        .gte('scheduled_date', weekStart.toISOString().split('T')[0])
        .lte('scheduled_date', weekEnd.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .order('created_at', { ascending: true });

      // Both coaches and students see all tasks assigned to the student, regardless of who created them
      console.log('📱 [WEEKLY] Loading all tasks assigned to student:', currentUser.id);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error loading weekly tasks:', error);
      Alert.alert('Hata', 'Haftalık görevler yüklenirken bir hata oluştu');
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
    setSelectedDate(new Date(task.scheduled_date!));
    setShowTaskModal(true);
  };

  const handleAddTask = (date: Date) => {
    setEditingTask(null);
    setSelectedDate(date);
    setShowTaskModal(true);
  };

  const handleTaskSaved = () => {
    loadWeeklyTasks();
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setSelectedDate(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWeeklyTasks();
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => task.scheduled_date === dateStr);
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('tr-TR', { weekday: 'long' });
  };

  const getDayStats = (date: Date) => {
    const dayTasks = getTasksForDate(date);
    const completedTasks = dayTasks.filter(task => task.status === 'completed').length;
    return { total: dayTasks.length, completed: completedTasks };
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
        <Text style={styles.loadingText}>Haftalık plan yükleniyor...</Text>
      </View>
    );
  }

  const weekDates = getWeekDates(currentWeek);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.weekNavigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateWeek('prev')}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.weekTitle}>
            {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
          </Text>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateWeek('next')}
          >
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>
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
        {weekDates.map((date, index) => {
          const dayTasks = getTasksForDate(date);
          const { total, completed } = getDayStats(date);
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <View key={index} style={styles.dayContainer}>
              <View style={[styles.dayHeader, isToday && styles.todayHeader]}>
                <View style={styles.dayInfo}>
                  <Text style={[styles.dayName, isToday && styles.todayText]}>
                    {getDayName(date)}
                  </Text>
                  <Text style={[styles.dayDate, isToday && styles.todayText]}>
                    {formatDate(date)}
                  </Text>
                </View>
                
                <View style={styles.dayHeaderRight}>
                  {total > 0 && (
                    <View style={styles.dayStats}>
                      <Text style={[styles.statsText, isToday && styles.todayText]}>
                        {completed}/{total}
                      </Text>
                      <View style={styles.miniProgressBar}>
                        <View 
                          style={[
                            styles.miniProgressFill, 
                            { width: `${(completed / total) * 100}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  )}
                  
                  {userProfile?.role === 'coach' && selectedStudent && (
                    <TouchableOpacity
                      style={styles.addTaskButton}
                      onPress={() => handleAddTask(date)}
                    >
                      <Text style={styles.addTaskButtonText}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.dayTasks}>
                {dayTasks.length === 0 ? (
                  <View style={styles.emptyDay}>
                    <Text style={styles.emptyDayText}>Görev yok</Text>
                  </View>
                ) : (
                  dayTasks.map((task) => (
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
                      compact={true}
                    />
                  ))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
      
      {/* Task Modal */}
      <TaskModal
        visible={showTaskModal}
        onClose={handleCloseModal}
        task={editingTask}
        selectedDate={selectedDate || undefined}
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
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  dayContainer: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  todayHeader: {
    backgroundColor: '#249096',
  },
  dayInfo: {
    flex: 1,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addTaskButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#249096',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTaskButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  dayDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  todayText: {
    color: 'white',
  },
  dayStats: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  miniProgressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  dayTasks: {
    paddingHorizontal: 8,
  },
  emptyDay: {
    padding: 20,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
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
}); 