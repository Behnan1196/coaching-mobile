import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { supabase } from '../lib/supabase';
import { Task, Subject, TaskType } from '../types/database';

const Tab = createMaterialTopTabNavigator();

interface StatisticsData {
  weeklyTasks: Task[];
  subjects: Subject[];
  currentWeek: Date;
  showMonthlyStats: boolean;
}

const StatisticsScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMonthlyStats, setShowMonthlyStats] = useState(false);
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([]);
  const [monthlyTasks, setMonthlyTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (userProfile && (userProfile.role === 'student' || selectedStudent)) {
      loadStatistics();
    }
  }, [userProfile, selectedStudent, currentWeek]);

  // Real-time subscription for task updates
  useEffect(() => {
    if (!userProfile || !supabase) return;

    const targetUserId = userProfile?.role === 'student' ? userProfile.id : selectedStudent?.id;
    if (!targetUserId) return;
    
    const subscription = supabase
      .channel(`statistics-updates-${targetUserId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: userProfile.id }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${targetUserId}`
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            if (payload.new?.assigned_to === targetUserId) {
              loadStatistics();
            }
          } else if (payload.eventType === 'INSERT') {
            if (payload.new?.assigned_to === targetUserId) {
              loadStatistics();
            }
          } else if (payload.eventType === 'DELETE') {
            loadStatistics();
          }
        }
      )
      // Also listen to DELETE events specifically without filter to catch them
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks'
        },
        (payload: any) => {
          loadStatistics();
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(subscription);
      }
    };
  }, [userProfile, selectedStudent]);

  const loadStatistics = async () => {
    try {
      const targetUserId = userProfile?.role === 'student' ? userProfile.id : selectedStudent?.id;
      if (!targetUserId || !supabase) return;

      // Load subjects
      const { data: subjects } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      setSubjects(subjects || []);

      // Calculate date ranges like web version
      const weekStart = getWeekStart(currentWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Load tasks for extended range to support both weekly and monthly views
      const monthStart = new Date(currentWeek);
      monthStart.setMonth(monthStart.getMonth() - 1); // Go back a month for safety
      const monthEnd = new Date(currentWeek);
      monthEnd.setMonth(monthEnd.getMonth() + 2); // Go forward 2 months for safety

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', targetUserId)
        .gte('scheduled_date', formatDateForDB(monthStart))
        .lte('scheduled_date', formatDateForDB(monthEnd))
        .order('scheduled_date');

      if (error) throw error;

      setWeeklyTasks(tasks || []);

      // Also load monthly tasks for monthly statistics
      const currentMonthStart = new Date(currentWeek);
      currentMonthStart.setDate(1);
      const currentMonthEnd = new Date(currentMonthStart);
      currentMonthEnd.setMonth(currentMonthStart.getMonth() + 1);
      currentMonthEnd.setDate(0);

      const { data: monthlyTasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', targetUserId)
        .gte('scheduled_date', formatDateForDB(currentMonthStart))
        .lte('scheduled_date', formatDateForDB(currentMonthEnd))
        .order('scheduled_date');

      setMonthlyTasks(monthlyTasksData || []);
    } catch (error) {
      console.error('Error loading statistics:', error);
      Alert.alert('Hata', 'İstatistikler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getWeekStart = (date: Date): Date => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const formatDateForDB = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStatistics();
  };

  const calculateWeeklyStats = () => {
    if (!weeklyTasks.length || !subjects.length) return [];

    const weekStart = getWeekStart(currentWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekTasks = weeklyTasks.filter(task => {
      const taskDate = new Date(task.scheduled_date || '');
      return taskDate >= weekStart && taskDate <= weekEnd && task.status === 'completed';
    });

    return subjects.map(subject => {
      const subjectTasks = weekTasks.filter(task => task.subject_id === subject.id);
      const totalProblems = subjectTasks.reduce((sum, task) => sum + (task.problem_count || 0), 0);
      return {
        subject: subject.name,
        totalProblems
      };
    }).filter(stat => stat.totalProblems > 0);
  };

  const calculateMonthlyStats = () => {
    if (!monthlyTasks.length || !subjects.length) return [];

    return subjects.map(subject => {
      const subjectTasks = monthlyTasks.filter(task => task.subject_id === subject.id && task.status === 'completed');
      const totalProblems = subjectTasks.reduce((sum, task) => sum + (task.problem_count || 0), 0);
      return {
        subject: subject.name,
        totalProblems
      };
    }).filter(stat => stat.totalProblems > 0);
  };

  const getFilteredTasks = () => {
    if (showMonthlyStats) {
      const monthStart = new Date(currentWeek);
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthStart.getMonth() + 1);
      monthEnd.setDate(0);
      
      return weeklyTasks.filter(t => {
        const taskDate = new Date(t.scheduled_date || '');
        return taskDate >= monthStart && taskDate <= monthEnd;
      });
    } else {
      const weekStart = getWeekStart(currentWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      return weeklyTasks.filter(t => {
        const taskDate = new Date(t.scheduled_date || '');
        return taskDate >= weekStart && taskDate <= weekEnd;
      });
    }
  };

  const getCompletedFilteredTasks = () => {
    return getFilteredTasks().filter(t => t.status === 'completed');
  };

  const getTaskCompletionRate = () => {
    const filtered = getFilteredTasks();
    const completed = getCompletedFilteredTasks();
    return filtered.length > 0 ? Math.round((completed.length / filtered.length) * 100) : 0;
  };

  const getTotalStudyHours = () => {
    const completed = getCompletedFilteredTasks();
    return Math.round(completed.reduce((sum, task) => sum + (task.estimated_duration || 0), 0) / 60 * 10) / 10;
  };

  const StatisticsContent = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity onPress={() => navigateWeek('prev')} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {showMonthlyStats 
              ? currentWeek.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
              : `${getWeekStart(currentWeek).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - ${(() => {
                  const weekEnd = new Date(getWeekStart(currentWeek));
                  weekEnd.setDate(weekEnd.getDate() + 6);
                  return weekEnd.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                })()}`
            }
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigateWeek('next')} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly/Monthly Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            onPress={() => setShowMonthlyStats(false)}
            style={[styles.toggleButton, !showMonthlyStats && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleButtonText, !showMonthlyStats && styles.toggleButtonTextActive]}>
              Haftalık
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMonthlyStats(true)}
            style={[styles.toggleButton, showMonthlyStats && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleButtonText, showMonthlyStats && styles.toggleButtonTextActive]}>
              Aylık
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={styles.loading} />
      ) : (
        <>
          {/* Main Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, {backgroundColor: '#F0FDF4'}]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>✓</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>
                  {showMonthlyStats ? 'Bu Ay' : 'Bu Hafta'} Tamamlanan
                </Text>
                <Text style={styles.statValue}>%{getTaskCompletionRate()}</Text>
                <Text style={styles.statSubtext}>
                  {getCompletedFilteredTasks().length}/{getFilteredTasks().length} görev
                </Text>
              </View>
            </View>

            <View style={[styles.statCard, {backgroundColor: '#EFF6FF'}]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>⏰</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Toplam Çalışma Saati</Text>
                <Text style={styles.statValue}>{getTotalStudyHours()} saat</Text>
                <Text style={styles.statSubtext}>
                  {showMonthlyStats ? 'Bu ay toplam' : 'Bu hafta tahmini'}
                </Text>
              </View>
            </View>
          </View>

          {/* Question Stats Card */}
          <View style={styles.fullWidthCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {showMonthlyStats ? 'Aylık' : 'Haftalık'} Çözülen Soru Miktarı
              </Text>
              <Text style={styles.cardIcon}>📚</Text>
            </View>
            <View style={styles.cardContent}>
              {(showMonthlyStats ? calculateMonthlyStats() : calculateWeeklyStats()).map((stat, index) => (
                <View key={index} style={styles.statItem}>
                  <Text style={styles.statItemLabel}>{stat.subject}</Text>
                  <View style={styles.statItemBar}>
                    <View 
                      style={[
                        styles.statItemFill,
                        { 
                          width: `${Math.min((stat.totalProblems / Math.max(...(showMonthlyStats ? calculateMonthlyStats() : calculateWeeklyStats()).map(s => s.totalProblems))) * 100, 100)}%` 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.statItemValue}>{stat.totalProblems} soru</Text>
                </View>
              ))}
              {(showMonthlyStats ? calculateMonthlyStats() : calculateWeeklyStats()).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Henüz soru çözülmemiş.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Task Type Distribution */}
          <View style={styles.fullWidthCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Görev Türü Dağılımı</Text>
              <Text style={styles.cardIcon}>📈</Text>
            </View>
            <View style={styles.cardContent}>
              {(() => {
                const taskTypes = ['study', 'practice', 'exam', 'review', 'resource', 'coaching_session'];
                const taskTypeNames: Record<string, string> = {
                  'study': 'Çalışma',
                  'practice': 'Soru Çöz',
                  'exam': 'Sınav',
                  'review': 'Tekrar',
                  'resource': 'Kaynak',
                  'coaching_session': 'Koçluk Seansı'
                };
                
                const filteredTasks = getFilteredTasks();
                
                return taskTypes.map(type => {
                  const count = filteredTasks.filter(t => t.task_type === type).length;
                  const percentage = filteredTasks.length > 0 ? (count / filteredTasks.length) * 100 : 0;
                  
                  if (count === 0) return null;
                  
                  return (
                    <View key={type} style={styles.statItem}>
                      <Text style={styles.statItemLabel}>{taskTypeNames[type]}</Text>
                      <View style={styles.statItemBar}>
                        <View 
                          style={[
                            styles.statItemFill,
                            { width: `${percentage}%`, backgroundColor: '#8B5CF6' }
                          ]} 
                        />
                      </View>
                      <Text style={styles.statItemValue}>{count} ({Math.round(percentage)}%)</Text>
                    </View>
                  );
                }).filter(Boolean);
              })()}
            </View>
          </View>

          {/* Performance Chart */}
          <View style={styles.fullWidthCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                📅 {showMonthlyStats ? 'Aylık' : 'Haftalık'} Performans
              </Text>
            </View>
            <View style={styles.cardContent}>
              {showMonthlyStats ? (
                <>
                  <View style={styles.weekDayLabels}>
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
                      <Text key={index} style={styles.weekDayLabel}>{day}</Text>
                    ))}
                  </View>
                  <View style={styles.performanceGrid}>
                    {(() => {
                      const monthStart = new Date(currentWeek);
                      monthStart.setDate(1);
                      const firstDay = monthStart.getDay() || 7;
                      const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
                      
                      const emptyCells = Array(firstDay - 1).fill(null);
                      const days = Array.from({length: daysInMonth}, (_, i) => {
                        const dayDate = new Date(monthStart);
                        dayDate.setDate(i + 1);
                        return dayDate;
                      });
                      
                      return [...emptyCells, ...days].map((date, index) => {
                        if (!date) {
                          return <View key={`empty-${index}`} style={styles.performanceDay} />;
                        }
                        
                        const dayTasks = weeklyTasks.filter(t => {
                          const taskDate = new Date(t.scheduled_date || '');
                          return taskDate.toDateString() === date.toDateString();
                        });
                        
                        const completedTasks = dayTasks.filter(t => t.status === 'completed').length;
                        const totalTasks = dayTasks.length;
                        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                        
                        let bgColor = '#E5E7EB'; // Default for no tasks
                        if (totalTasks === 0) {
                          bgColor = '#E5E7EB'; // Gray for no tasks
                        } else if (completionRate === 100) {
                          bgColor = '#10B981'; // Green for 100% completion
                        } else if (completionRate >= 20) {
                          bgColor = '#F59E0B'; // Yellow for 20%+ completion
                        } else {
                          bgColor = '#EF4444'; // Red for 0-20% completion
                        }
                        
                        return (
                          <View 
                            key={date.getTime()} 
                            style={[
                              styles.performanceDay,
                              { backgroundColor: bgColor }
                            ]}
                          >
                                                      {/* Tasks completion ratio in center (bigger) */}
                          {totalTasks > 0 ? (
                            <Text style={[styles.performanceDayText, { fontSize: 11, textAlign: 'center', fontWeight: 'bold' }]}>
                              {completedTasks}/{totalTasks}
                            </Text>
                          ) : (
                            <Text style={[styles.performanceDayText, { fontSize: 10, textAlign: 'center' }]}>
                              {date.getDate()}
                            </Text>
                          )}
                          
                          {/* Day number in bottom right (smaller) */}
                          {totalTasks > 0 && (
                            <Text style={{
                              position: 'absolute',
                              bottom: 2,
                              right: 2,
                              fontSize: 8,
                              color: 'white',
                              fontWeight: '600',
                            }}>
                              {date.getDate()}
                            </Text>
                          )}
                          </View>
                        );
                      });
                    })()}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.weekDayLabels}>
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
                      <Text key={index} style={styles.weekDayLabel}>{day}</Text>
                    ))}
                  </View>
                  <View style={styles.performanceGrid}>
                    {[0,1,2,3,4,5,6].map((dayIndex) => {
                      const weekStart = getWeekStart(currentWeek);
                      const dayDate = new Date(weekStart);
                      dayDate.setDate(weekStart.getDate() + dayIndex);
                      
                      const dayTasks = weeklyTasks.filter(t => {
                        const taskDate = new Date(t.scheduled_date || '');
                        return taskDate.toDateString() === dayDate.toDateString();
                      });
                      
                      const completedTasks = dayTasks.filter(t => t.status === 'completed').length;
                      const totalTasks = dayTasks.length;
                      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                      
                      let bgColor = '#E5E7EB'; // Default for no tasks
                      if (totalTasks === 0) {
                        bgColor = '#E5E7EB'; // Gray for no tasks
                      } else if (completionRate === 100) {
                        bgColor = '#10B981'; // Green for 100% completion
                      } else if (completionRate >= 20) {
                        bgColor = '#F59E0B'; // Yellow for 20%+ completion
                      } else {
                        bgColor = '#EF4444'; // Red for 0-20% completion
                      }
                      
                      return (
                        <View 
                          key={dayIndex} 
                          style={[
                            styles.performanceDay,
                            { backgroundColor: bgColor }
                          ]}
                        >
                          {/* Tasks completion ratio in center (bigger) */}
                          {totalTasks > 0 ? (
                            <Text style={[styles.performanceDayText, { fontSize: 9, textAlign: 'center', fontWeight: 'bold' }]}>
                              {completedTasks}/{totalTasks}
                            </Text>
                          ) : (
                            <Text style={[styles.performanceDayText, { fontSize: 8, textAlign: 'center' }]}>
                              {dayDate.getDate()}
                            </Text>
                          )}
                          
                          {/* Day number in bottom right (smaller) */}
                          {totalTasks > 0 && (
                            <Text style={{
                              position: 'absolute',
                              bottom: 2,
                              right: 2,
                              fontSize: 6,
                              color: 'white',
                              fontWeight: '600',
                            }}>
                              {dayDate.getDate()}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gelişimim</Text>
      </View>
      <StatisticsContent />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  dateContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  toggleContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toggleButtons: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#249096',
  },
  loading: {
    marginTop: 50,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statIcon: {
    fontSize: 18,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  fullWidthCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardIcon: {
    fontSize: 16,
  },
  cardContent: {
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItemLabel: {
    width: 80,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  statItemBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  statItemFill: {
    height: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  statItemValue: {
    width: 60,
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  weekDayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
    textAlign: 'center',
    flex: 1,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  performanceDay: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  performanceDayText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
});

export { StatisticsScreen }; 