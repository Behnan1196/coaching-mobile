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
import { Task } from '../types/database';
import { TaskModal } from './TaskModal';

const { width } = Dimensions.get('window');

interface MonthlyPlanTabProps {
  onNavigateToWeek?: (weekDate: Date) => void;
}

interface DayData {
  date: Date;
  tasks: Task[];
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
}

export const MonthlyPlanTab: React.FC<MonthlyPlanTabProps> = ({ onNavigateToWeek }) => {
  const { userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const currentUser = userProfile?.role === 'student' ? userProfile : selectedStudent;

  useEffect(() => {
    if (currentUser) {
      loadMonthlyTasks();
    }
  }, [currentUser, currentMonth]);

  // Setup real-time subscription for task updates
  useEffect(() => {
    if (!currentUser || !supabase) return;

    console.log(`📡 [MONTHLY] Setting up real-time subscription for user: ${currentUser.id}`);
    
    const subscription = supabase
      .channel(`monthly-task-updates-${currentUser.id}`, {
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
          console.log('📡 [MONTHLY] Real-time task update received:', payload);
          
          const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
          
          if (payload.eventType === 'UPDATE') {
            console.log('📝 [MONTHLY] Updating task:', payload.new.id);
            setTasks(prev => prev.map(task => 
              task.id === payload.new.id 
                ? { ...task, ...payload.new, completed_at: payload.new.completed_at || undefined }
                : task
            ));
          } else if (payload.eventType === 'INSERT') {
            console.log('➕ [MONTHLY] New task inserted:', payload.new.id);
            // Check if the new task is in the current month
            const taskDate = new Date(payload.new.scheduled_date);
            if (taskDate >= monthStart && taskDate <= monthEnd) {
              setTasks(prev => [...prev, {
                ...payload.new,
                completed_at: payload.new.completed_at || undefined
              } as any]);
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ [MONTHLY] Task deleted:', payload.old.id);
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log(`📊 [MONTHLY] Subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [MONTHLY] Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [MONTHLY] Real-time subscription error');
        }
      });

    return () => {
      console.log('🧹 [MONTHLY] Cleaning up real-time subscription');
      if (supabase) {
        supabase.removeChannel(subscription);
      }
    };
  }, [currentUser, currentMonth, userProfile]);

  const loadMonthlyTasks = async () => {
    if (!currentUser || !supabase) return;

    try {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      let query = supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', currentUser.id)
        .gte('scheduled_date', monthStart.toISOString().split('T')[0])
        .lte('scheduled_date', monthEnd.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true });

      // For coaches: load tasks they assigned to the selected student
      // For students: load tasks assigned to them (by any coach)
      if (userProfile?.role === 'coach') {
        console.log('📱 [MONTHLY] Loading tasks assigned by coach:', userProfile.id);
        query = query.eq('assigned_by', userProfile.id);
      } else {
        console.log('📱 [MONTHLY] Loading all tasks assigned to student:', currentUser.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error loading monthly tasks:', error);
      Alert.alert('Hata', 'Aylık görevler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMonthlyTasks();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newDate);
  };

  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingWeekDay = firstDay.getDay();
    
    const days: DayData[] = [];
    
    // Add empty days for the beginning of the month
    for (let i = 0; i < startingWeekDay; i++) {
      const emptyDate = new Date(year, month, -startingWeekDay + i + 1);
      days.push({
        date: emptyDate,
        tasks: [],
        completedTasks: 0,
        totalTasks: 0,
        completionRate: 0
      });
    }
    
    // Add actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayTasks = getTasksForDate(date);
      const completedTasks = dayTasks.filter(task => task.status === 'completed').length;
      const totalTasks = dayTasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      days.push({
        date,
        tasks: dayTasks,
        completedTasks,
        totalTasks,
        completionRate
      });
    }
    
    return days;
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => task.scheduled_date === dateStr);
  };

  const handleAddTask = (date: Date) => {
    setEditingTask(null);
    setSelectedDate(date);
    setShowTaskModal(true);
  };

  const handleTaskSaved = () => {
    loadMonthlyTasks();
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setSelectedDate(null);
  };

  const handleDayPress = (dayData: DayData) => {
    if (userProfile?.role === 'coach' && selectedStudent) {
      // For coaches, show options to add task or navigate to week
      Alert.alert(
        'Seçenekler',
        'Bu gün için ne yapmak istiyorsunuz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Görev Ekle', onPress: () => handleAddTask(dayData.date) },
          { text: 'Haftalık Görünüm', onPress: () => onNavigateToWeek && onNavigateToWeek(dayData.date) },
        ]
      );
    } else if (onNavigateToWeek) {
      onNavigateToWeek(dayData.date);
    }
  };

  const getWeekOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const startingWeekDay = firstDay.getDay();
    const dayOfMonth = date.getDate();
    return Math.ceil((dayOfMonth + startingWeekDay) / 7);
  };

  const getDayColor = (completionRate: number, totalTasks: number) => {
    if (totalTasks === 0) return '#F9FAFB';
    if (completionRate >= 80) return '#10B981';
    if (completionRate >= 60) return '#F59E0B';
    if (completionRate >= 40) return '#EF4444';
    return '#6B7280';
  };

  const getMonthStats = () => {
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return { completedTasks, totalTasks, completionRate };
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
        <Text style={styles.loadingText}>Aylık plan yükleniyor...</Text>
      </View>
    );
  }

  const monthDays = getMonthDays();
  const { completedTasks, totalTasks, completionRate } = getMonthStats();
  const cellWidth = (width - 64) / 7; // 32px padding on each side

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.monthNavigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('prev')}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {currentMonth.toLocaleDateString('tr-TR', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </Text>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('next')}
          >
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>
        
        {totalTasks > 0 && (
          <View style={styles.monthStats}>
            <Text style={styles.statsText}>
              {completedTasks}/{totalTasks} görev tamamlandı ({completionRate.toFixed(0)}%)
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${completionRate}%` }
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
            colors={['#3B82F6']}
          />
        }
      >
        {/* Week day headers */}
        <View style={styles.weekDaysHeader}>
          {['P', 'S', 'Ç', 'P', 'C', 'C', 'P'].map((day, index) => (
            <View key={index} style={[styles.weekDayCell, { width: cellWidth }]}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {monthDays.map((dayData, index) => {
            const isCurrentMonth = dayData.date.getMonth() === currentMonth.getMonth();
            const isToday = dayData.date.toDateString() === new Date().toDateString();
            const backgroundColor = isCurrentMonth ? getDayColor(dayData.completionRate, dayData.totalTasks) : '#F9FAFB';
            const textColor = isCurrentMonth && dayData.totalTasks > 0 ? 'white' : '#374151';
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  { 
                    width: cellWidth, 
                    backgroundColor: isToday ? '#3B82F6' : backgroundColor,
                    opacity: isCurrentMonth ? 1 : 0.3
                  }
                ]}
                onPress={() => handleDayPress(dayData)}
                disabled={!isCurrentMonth}
              >
                <Text style={[
                  styles.dayNumber,
                  { color: isToday ? 'white' : textColor }
                ]}>
                  {dayData.date.getDate()}
                </Text>
                
                {dayData.totalTasks > 0 && (
                  <View style={styles.taskCountContainer}>
                    <Text style={[
                      styles.taskCount,
                      { color: isToday ? 'white' : textColor }
                    ]}>
                      {dayData.completedTasks}/{dayData.totalTasks}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Görev Tamamlama Oranı</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>%80+</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>%60-79</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>%40-59</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#6B7280' }]} />
              <Text style={styles.legendText}>%0-39</Text>
            </View>
          </View>
        </View>
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
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  monthStats: {
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
  weekDaysHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDayCell: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  dayCell: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskCountContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  taskCount: {
    fontSize: 10,
    fontWeight: '600',
  },
  legend: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
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