import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { UserProfile } from '../types/database';
import { UserProfileMenu } from './UserProfileMenu';
import { NotificationBell } from './NotificationBell';

interface StudentSelectionHeaderProps {
  onStudentChange?: (student: UserProfile | null) => void;
}

export const StudentSelectionHeader: React.FC<StudentSelectionHeaderProps> = ({ 
  onStudentChange 
}) => {
  const { userProfile } = useAuth();
  const { 
    selectedStudent, 
    availableStudents, 
    selectStudent, 
    loadStudents, 
    loading 
  } = useCoachStudent();
  
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Show for all authenticated users (header contains user profile menu)

  const handleStudentSelect = (student: UserProfile | null) => {
    if (student) {
      selectStudent(student);
    }
    setDropdownVisible(false);
    onStudentChange?.(student);
  };

  const handleRefresh = async () => {
    await loadStudents();
  };

  const renderStudentItem = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      style={[
        styles.studentItem,
        selectedStudent?.id === item.id && styles.selectedStudentItem
      ]}
      onPress={() => handleStudentSelect(item)}
    >
      <View style={styles.studentItemContent}>
        <View style={styles.studentAvatar}>
          <Text style={styles.studentInitial}>
            {item.full_name?.charAt(0)?.toUpperCase() || 'Ö'}
          </Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.full_name || 'İsimsiz Öğrenci'}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
        </View>
        {selectedStudent?.id === item.id && (
          <Ionicons name="checkmark" size={20} color="#3B82F6" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {userProfile?.role === 'coach' ? (
          <View style={styles.coachView}>
            <View style={styles.studentSelectorContainer}>
              <Ionicons name="person" size={16} color="#6B7280" style={styles.studentIcon} />
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setDropdownVisible(true)}
              >
                <Text style={styles.selectorText}>
                  {selectedStudent?.full_name || 'Öğrenci seçiniz...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.studentView}>
            <Text style={styles.brandText}>
              ÖZGÜN KOÇLUK
            </Text>
          </View>
        )}
        
        <View style={styles.rightSection}>
          <View style={styles.notificationContainer}>
            <NotificationBell size={20} color="#6B7280" />
          </View>
          <UserProfileMenu />
        </View>
      </View>

      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Öğrenci Seç</Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Ionicons name="refresh" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
            </View>
            
            {availableStudents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Henüz öğrenci ataması yapılmamış
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableStudents}
                renderItem={renderStudentItem}
                keyExtractor={(item) => item.id}
                style={styles.studentList}
                ListHeaderComponent={
                  <TouchableOpacity
                    style={[
                      styles.studentItem,
                      !selectedStudent && styles.selectedStudentItem
                    ]}
                    onPress={() => handleStudentSelect(null)}
                  >
                    <View style={styles.studentItemContent}>
                      <View style={[styles.studentAvatar, styles.noStudentAvatar]}>
                        <Ionicons name="person-outline" size={20} color="#6B7280" />
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>Öğrenci seçimi kaldır</Text>
                        <Text style={styles.studentEmail}>Hiçbir öğrenci seçili olmayacak</Text>
                      </View>
                      {!selectedStudent && (
                        <Ionicons name="checkmark" size={20} color="#3B82F6" />
                      )}
                    </View>
                  </TouchableOpacity>
                }
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachView: {
    flex: 1,
  },
  studentSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentIcon: {
    marginRight: 8,
  },
  studentView: {
    flex: 1,
  },
  brandText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    letterSpacing: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationContainer: {
    marginRight: 12,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 180,
    maxWidth: 220,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  refreshButton: {
    padding: 4,
  },
  studentList: {
    maxHeight: 300,
  },
  studentItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedStudentItem: {
    backgroundColor: '#EFF6FF',
  },
  studentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noStudentAvatar: {
    backgroundColor: '#F3F4F6',
  },
  studentInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 