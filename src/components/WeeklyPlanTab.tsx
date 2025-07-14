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

  const currentUser = userProfile?.role === 'student' ? userProfile : selectedStudent;

  useEffect(() => {
    if (currentUser) {
      loadWeeklyTasks();
      loadRelatedData();
    }
  }, [currentUser, currentWeek]);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
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
        .order('scheduled_start_time', { ascending: true });

      // For coaches: load tasks they assigned to the selected student
      // For students: load tasks assigned to them (by any coach)
      if (userProfile?.role === 'coach') {
        console.log('📱 [WEEKLY] Loading tasks assigned by coach:', userProfile.id);
        query = query.eq('assigned_by', userProfile.id);
      } else {
        console.log('📱 [WEEKLY] Loading all tasks assigned to student:', currentUser.id);
      }

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
        <ActivityIndicator size="large" color="#3B82F6" />
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
            colors={['#3B82F6']}
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
                      compact={true}
                    />
                  ))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
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
    backgroundColor: '#3B82F6',
  },
  dayInfo: {
    flex: 1,
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