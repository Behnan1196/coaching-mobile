import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';
import { useAuth } from './AuthContext';

interface CoachStudentContextType {
  selectedStudent: UserProfile | null;
  availableStudents: UserProfile[];
  selectStudent: (student: UserProfile) => void;
  loadStudents: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const CoachStudentContext = createContext<CoachStudentContextType | undefined>(undefined);

export const useCoachStudent = () => {
  const context = useContext(CoachStudentContext);
  if (!context) {
    throw new Error('useCoachStudent must be used within a CoachStudentProvider');
  }
  return context;
};

interface CoachStudentProviderProps {
  children: React.ReactNode;
}

export const CoachStudentProvider: React.FC<CoachStudentProviderProps> = ({ children }) => {
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [availableStudents, setAvailableStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();

  const loadStudents = async () => {
    if (!userProfile || userProfile.role !== 'coach') {
      return;
    }

    if (!supabase) {
      console.error('Supabase not available');
      setError('Database connection not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get students assigned to this coach
      const { data: assignments, error: assignmentsError } = await supabase
        .from('coach_student_assignments')
        .select(`
          student_id,
          user_profiles!coach_student_assignments_student_id_fkey (
            id,
            email,
            full_name,
            role,
            created_at,
            updated_at
          )
        `)
        .eq('coach_id', userProfile.id)
        .eq('is_active', true);

      if (assignmentsError) {
        throw assignmentsError;
      }

      // Extract student profiles from assignments
      const students = assignments
        ?.map(assignment => assignment.user_profiles)
        .filter(Boolean)
        .map(profile => profile as unknown as UserProfile) || [];

      setAvailableStudents(students);
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = (student: UserProfile) => {
    console.log('🎯 [CONTEXT] selectStudent called with:', student);
    console.log('🎯 [CONTEXT] Setting selected student:', student.full_name);
    setSelectedStudent(student);
    console.log('🎯 [CONTEXT] Selected student state updated');
  };

  useEffect(() => {
    if (userProfile?.role === 'coach') {
      loadStudents();
    }
  }, [userProfile]);

  const value: CoachStudentContextType = {
    selectedStudent,
    availableStudents,
    selectStudent,
    loadStudents,
    loading,
    error,
  };

  return (
    <CoachStudentContext.Provider value={value}>
      {children}
    </CoachStudentContext.Provider>
  );
}; 