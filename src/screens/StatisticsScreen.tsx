import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { supabase } from '../lib/supabase';
import { Task, Subject, TaskType } from '../types/database';



const Tab = createMaterialTopTabNavigator();

interface StatisticsData {
  taskCompletionRate: number;
  totalStudyHours: number;
  completedTasks: number;
  totalTasks: number;
  subjectStats: SubjectStat[];
  taskTypeStats: TaskTypeStat[];
  weeklyProgress: WeeklyProgress[];
  monthlyProgress: MonthlyProgress[];
}

interface SubjectStat {
  subject: string;
  subjectId: string;
  totalTasks: number;
  completedTasks: number;
  totalHours: number;
  completionRate: number;
  color: string;
}

interface TaskTypeStat {
  taskType: TaskType;
  label: string;
  count: number;
  color: string;
}

interface WeeklyProgress {
  day: string;
  dayIndex: number;
  completedTasks: number;
  studyHours: number;
}

interface MonthlyProgress {
  week: string;
  weekIndex: number;
  completedTasks: number;
  studyHours: number;
}

const StatisticsScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistics, setStatistics] = useState<StatisticsData>({
    taskCompletionRate: 0,
    totalStudyHours: 0,
    completedTasks: 0,
    totalTasks: 0,
    subjectStats: [],
    taskTypeStats: [],
    weeklyProgress: [],
    monthlyProgress: []
  });

  useEffect(() => {
    if (userProfile && (userProfile.role === 'student' || selectedStudent)) {
      loadStatistics();
    }
  }, [userProfile, selectedStudent, currentDate]);

  const loadStatistics = async () => {
    try {
      const targetUserId = userProfile?.role === 'student' ? userProfile.id : selectedStudent?.id;
      if (!targetUserId || !supabase) return;

      // Load subjects for reference
      const { data: subjects } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      // Calculate date ranges
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const monthStart = new Date(currentDate);
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthStart.getMonth() + 1);
      monthEnd.setDate(0);

      // Load tasks for the current period
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', targetUserId)
        .gte('scheduled_date', monthStart.toISOString().split('T')[0])
        .lte('scheduled_date', monthEnd.toISOString().split('T')[0])
        .order('scheduled_date');

      if (error) throw error;

      const allTasks = tasks || [];
      const completedTasks = allTasks.filter(task => task.status === 'completed');

      // Calculate basic statistics
      const taskCompletionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;
      const totalStudyHours = completedTasks.reduce((sum, task) => sum + (task.estimated_duration || 0), 0) / 60;

      // Calculate subject statistics
      const subjectStats = calculateSubjectStats(allTasks, completedTasks, subjects || []);
      
      // Calculate task type statistics
      const taskTypeStats = calculateTaskTypeStats(allTasks);

      // Calculate weekly and monthly progress
      const weeklyProgress = calculateWeeklyProgress(allTasks, weekStart);
      const monthlyProgress = calculateMonthlyProgress(allTasks, monthStart);

      setStatistics({
        taskCompletionRate,
        totalStudyHours,
        completedTasks: completedTasks.length,
        totalTasks: allTasks.length,
        subjectStats,
        taskTypeStats,
        weeklyProgress,
        monthlyProgress
      });
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

  const calculateSubjectStats = (allTasks: Task[], completedTasks: Task[], subjects: Subject[]): SubjectStat[] => {
    const subjectColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];
    
    return subjects.map((subject, index) => {
      const subjectTasks = allTasks.filter(task => task.subject_id === subject.id);
      const subjectCompletedTasks = completedTasks.filter(task => task.subject_id === subject.id);
      const totalHours = subjectCompletedTasks.reduce((sum, task) => sum + (task.estimated_duration || 0), 0) / 60;
      const completionRate = subjectTasks.length > 0 ? (subjectCompletedTasks.length / subjectTasks.length) * 100 : 0;

      return {
        subject: subject.name,
        subjectId: subject.id,
        totalTasks: subjectTasks.length,
        completedTasks: subjectCompletedTasks.length,
        totalHours,
        completionRate,
        color: subjectColors[index % subjectColors.length]
      };
    }).filter(stat => stat.totalTasks > 0);
  };

  const calculateTaskTypeStats = (allTasks: Task[]): TaskTypeStat[] => {
    const taskTypeColors = {
      'study': '#3B82F6',
      'practice': '#F59E0B',
      'exam': '#EF4444',
      'review': '#10B981',
      'resource': '#8B5CF6',
      'coaching_session': '#F97316'
    };

    const taskTypeLabels = {
      'study': 'Çalışma',
      'practice': 'Soru Çözme',
      'exam': 'Sınav',
      'review': 'Tekrar',
      'resource': 'Kaynak',
      'coaching_session': 'Koçluk Seansı'
    };

    const taskTypeCounts = allTasks.reduce((acc, task) => {
      acc[task.task_type] = (acc[task.task_type] || 0) + 1;
      return acc;
    }, {} as Record<TaskType, number>);

    return Object.entries(taskTypeCounts).map(([taskType, count]) => ({
      taskType: taskType as TaskType,
      label: taskTypeLabels[taskType as TaskType],
      count,
      color: taskTypeColors[taskType as TaskType]
    }));
  };

  const calculateWeeklyProgress = (allTasks: Task[], weekStart: Date): WeeklyProgress[] => {
    const weekProgress: WeeklyProgress[] = [];
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);
      
      const dayTasks = allTasks.filter(task => {
        const taskDate = new Date(task.scheduled_date || '');
        return taskDate.toDateString() === dayDate.toDateString();
      });

      const completedDayTasks = dayTasks.filter(task => task.status === 'completed');
      const studyHours = completedDayTasks.reduce((sum, task) => sum + (task.estimated_duration || 0), 0) / 60;

      weekProgress.push({
        day: dayNames[i],
        dayIndex: i,
        completedTasks: completedDayTasks.length,
        studyHours
      });
    }

    return weekProgress;
  };

  const calculateMonthlyProgress = (allTasks: Task[], monthStart: Date): MonthlyProgress[] => {
    const monthProgress: MonthlyProgress[] = [];
    const month = monthStart.getMonth();
    const year = monthStart.getFullYear();
    
    // Get all weeks in the month
    const weeks = [];
    let currentWeek = new Date(year, month, 1);
    
    while (currentWeek.getMonth() === month) {
      const weekStart = getWeekStart(currentWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      weeks.push({ start: new Date(weekStart), end: new Date(weekEnd) });
      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    weeks.forEach((week, index) => {
      const weekTasks = allTasks.filter(task => {
        const taskDate = new Date(task.scheduled_date || '');
        return taskDate >= week.start && taskDate <= week.end;
      });

      const completedWeekTasks = weekTasks.filter(task => task.status === 'completed');
      const studyHours = completedWeekTasks.reduce((sum, task) => sum + (task.estimated_duration || 0), 0) / 60;

      monthProgress.push({
        week: `${week.start.getDate()}. Hafta`,
        weekIndex: index,
        completedTasks: completedWeekTasks.length,
        studyHours
      });
    });

    return monthProgress;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStatistics();
  };

  const WeeklyStatisticsScreen = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Week Navigation */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity onPress={() => navigateWeek('prev')} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {getWeekStart(currentDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - {' '}
            {(() => {
              const weekEnd = new Date(getWeekStart(currentDate));
              weekEnd.setDate(weekEnd.getDate() + 6);
              return weekEnd.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
            })()}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigateWeek('next')} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={styles.loading} />
      ) : (
        <>
          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>✓</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Bu Hafta Tamamlanan</Text>
                <Text style={styles.statValue}>{Math.round(statistics.taskCompletionRate)}%</Text>
                <Text style={styles.statSubtext}>
                  {statistics.completedTasks}/{statistics.totalTasks} görev
                </Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>⏰</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Toplam Çalışma Saati</Text>
                <Text style={styles.statValue}>{statistics.totalStudyHours.toFixed(1)}h</Text>
                <Text style={styles.statSubtext}>Bu hafta tahmini</Text>
              </View>
            </View>
          </View>

          {/* Weekly Progress Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Haftalık Görev Tamamlama</Text>
            <View style={styles.chartContent}>
              <BarChart
                data={{
                  labels: statistics.weeklyProgress.map(p => p.day.substring(0, 3)),
                  datasets: [{
                    data: statistics.weeklyProgress.map(p => p.completedTasks)
                  }]
                }}
                width={Dimensions.get('window').width - 60}
                height={200}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  style: {
                    borderRadius: 16
                  }
                }}
                style={{
                  marginVertical: 8,
                  borderRadius: 16
                }}
              />
            </View>
          </View>

          {/* Study Hours Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Haftalık Çalışma Saatleri</Text>
            <View style={styles.chartContent}>
              <LineChart
                data={{
                  labels: statistics.weeklyProgress.map(p => p.day.substring(0, 3)),
                  datasets: [{
                    data: statistics.weeklyProgress.map(p => p.studyHours)
                  }]
                }}
                width={Dimensions.get('window').width - 60}
                height={200}
                yAxisLabel=""
                yAxisSuffix="h"
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  style: {
                    borderRadius: 16
                  }
                }}
                style={{
                  marginVertical: 8,
                  borderRadius: 16
                }}
              />
            </View>
          </View>

          {/* Subject Statistics */}
          {statistics.subjectStats.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Ders Bazında İstatistikler</Text>
              {statistics.subjectStats.map((stat, index) => (
                <View key={stat.subjectId} style={styles.subjectStatItem}>
                  <View style={styles.subjectStatHeader}>
                    <View style={[styles.subjectColorDot, { backgroundColor: stat.color }]} />
                    <Text style={styles.subjectName}>{stat.subject}</Text>
                    <Text style={styles.subjectPercent}>{Math.round(stat.completionRate)}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${stat.completionRate}%`, backgroundColor: stat.color }
                      ]} 
                    />
                  </View>
                  <Text style={styles.subjectStats}>
                    {stat.completedTasks}/{stat.totalTasks} görev • {stat.totalHours.toFixed(1)} saat
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  const MonthlyStatisticsScreen = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Month Navigation */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={styles.loading} />
      ) : (
        <>
          {/* Monthly Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>✓</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Bu Ay Tamamlanan</Text>
                <Text style={styles.statValue}>{Math.round(statistics.taskCompletionRate)}%</Text>
                <Text style={styles.statSubtext}>
                  {statistics.completedTasks}/{statistics.totalTasks} görev
                </Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>⏰</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Toplam Çalışma Saati</Text>
                <Text style={styles.statValue}>{statistics.totalStudyHours.toFixed(1)}h</Text>
                <Text style={styles.statSubtext}>Bu ay toplam</Text>
              </View>
            </View>
          </View>

          {/* Monthly Progress Chart */}
          {statistics.monthlyProgress.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Aylık Görev Tamamlama</Text>
              <View style={styles.chartContent}>
                <BarChart
                  data={{
                    labels: statistics.monthlyProgress.map((p, index) => `H${index + 1}`),
                    datasets: [{
                      data: statistics.monthlyProgress.map(p => p.completedTasks)
                    }]
                  }}
                  width={Dimensions.get('window').width - 60}
                  height={200}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    style: {
                      borderRadius: 16
                    }
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                />
              </View>
            </View>
          )}

          {/* Task Type Distribution */}
          {statistics.taskTypeStats.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Görev Türü Dağılımı</Text>
              <View style={styles.pieChartContainer}>
                <PieChart
                  data={statistics.taskTypeStats.map(stat => ({
                    name: stat.label,
                    population: stat.count,
                    color: stat.color,
                    legendFontColor: '#333333',
                    legendFontSize: 12,
                  }))}
                  width={Dimensions.get('window').width - 60}
                  height={200}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gelişimim</Text>
      </View>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: {
            backgroundColor: '#3B82F6',
          },
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
        }}
      >
        <Tab.Screen name="Weekly" component={WeeklyStatisticsScreen} options={{ title: 'Haftalık' }} />
        <Tab.Screen name="Monthly" component={MonthlyStatisticsScreen} options={{ title: 'Aylık' }} />
      </Tab.Navigator>
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
  chartContainer: {
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
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chartContent: {
    flexDirection: 'row',
    height: 200,
    alignItems: 'center',
  },
  pieChartContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  legendContainer: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  subjectStatItem: {
    marginBottom: 16,
  },
  subjectStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  subjectName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  subjectPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginBottom: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  subjectStats: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export { StatisticsScreen }; 