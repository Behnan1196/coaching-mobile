// Database types for TYT AYT Coaching System V3.0
export type UserRole = 'admin' | 'coach' | 'student' | 'coordinator'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskType = 'study' | 'practice' | 'exam' | 'review' | 'resource' | 'coaching_session' | 'deneme_analizi'
export type ResourceCategory = 'video' | 'document' | 'pdf' | 'application'
export type DifficultyLevel = 'baslangic' | 'orta' | 'ileri' | 'uzman'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone?: string
  department?: string
  school?: string
  tutoring_center?: string
  target_university?: string
  target_department?: string
  yks_score?: number
  start_date?: string
  parent_name?: string
  parent_phone?: string
  address?: string
  notes?: string
  role: UserRole
  created_at: string
  updated_at: string
  // Settings properties
  avatar_url?: string
  theme?: 'light' | 'dark' | 'system'
  language?: string
  notifications_enabled?: boolean
  email_notifications?: boolean
}

export interface CoachStudentAssignment {
  id: string
  coach_id: string
  student_id: string
  assigned_at: string
  is_active: boolean
}

export interface Subject {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
}

export interface Topic {
  id: string
  subject_id: string
  name: string
  description?: string
  order_index: number
  is_active: boolean
  created_at: string
}

export interface Resource {
  id: string
  name: string
  description?: string
  url: string
  category: ResourceCategory
  subject_id?: string
  created_by: string
  is_active: boolean
  created_at: string
  difficulty_level?: DifficultyLevel
}

export interface MockExam {
  id: string
  name: string
  description?: string
  subject_id?: string
  difficulty_level?: DifficultyLevel
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  subject_id?: string
  topic_id?: string
  resource_id?: string
  mock_exam_id?: string
  assigned_by: string
  assigned_to: string
  status: TaskStatus
  task_type: TaskType
  scheduled_date?: string
  scheduled_start_time?: string
  scheduled_end_time?: string
  estimated_duration?: number
  problem_count?: number
  priority?: 'low' | 'medium' | 'high'
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at?: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  created_by: string
  is_active: boolean
  created_at: string
}

export interface StreamToken {
  id: string
  user_id: string
  token: string
  expires_at: string
  created_at: string
}





// Extended types with relations
export interface Goal {
  id: string
  student_id: string
  coach_id: string
  goal_type: 'tyt_target' | 'ayt_target' | 'university_target' | 'department_target' | 'study_hours' | 'custom'
  title: string
  description?: string
  target_value?: string
  current_value?: string
  target_date?: string
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MockExamResult {
  id: string
  student_id: string
  coach_id: string
  exam_type: 'TYT' | 'AYT' | 'Tarama'
  exam_date: string
  exam_name: string
  exam_duration?: number
  
  // TYT Scores - Türkçe
  tyt_turkce_correct?: number
  tyt_turkce_wrong?: number
  tyt_turkce_net?: number

  // TYT Scores - Matematik
  tyt_matematik_correct?: number
  tyt_matematik_wrong?: number
  tyt_matematik_net?: number
  tyt_geometri_correct?: number
  tyt_geometri_wrong?: number
  tyt_geometri_net?: number

  // TYT Scores - Sosyal Bilimler
  tyt_tarih_correct?: number
  tyt_tarih_wrong?: number
  tyt_tarih_net?: number
  tyt_cografya_correct?: number
  tyt_cografya_wrong?: number
  tyt_cografya_net?: number
  tyt_felsefe_correct?: number
  tyt_felsefe_wrong?: number
  tyt_felsefe_net?: number
  tyt_din_correct?: number
  tyt_din_wrong?: number
  tyt_din_net?: number

  // TYT Scores - Fen Bilimleri
  tyt_fizik_correct?: number
  tyt_fizik_wrong?: number
  tyt_fizik_net?: number
  tyt_kimya_correct?: number
  tyt_kimya_wrong?: number
  tyt_kimya_net?: number
  tyt_biyoloji_correct?: number
  tyt_biyoloji_wrong?: number
  tyt_biyoloji_net?: number

  // TYT Group Totals
  tyt_total_net?: number
  tyt_matematik_total_net?: number
  tyt_sosyal_total_net?: number
  tyt_fen_total_net?: number
  
  // AYT Scores
  ayt_matematik_correct?: number
  ayt_matematik_wrong?: number
  ayt_matematik_net?: number
  ayt_geometri_correct?: number
  ayt_geometri_wrong?: number
  ayt_geometri_net?: number
  ayt_total_net?: number
  
  // Tarama Scores
  tarama_lessons?: Array<{
    subject: string
    question_count: number
    correct: number
    wrong: number
    net: number
  }>
  tarama_total_net?: number
  
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EducationalLink {
  id: string
  title: string
  description?: string
  url: string
  category: string
  icon_letter?: string
  icon_color: string
  display_order: number
  is_active: boolean
  target_audience: string
  created_at: string
  updated_at: string
}

export interface ProfileForm {
  full_name: string
  email: string
  phone: string
  department: string
  school: string
  tutoring_center: string
  target_university: string
  target_department: string
  yks_score: string
  start_date: string
  parent_name: string
  parent_phone: string
  address: string
  notes: string
}

export interface GoalForm {
  goal_type: 'tyt_target' | 'ayt_target' | 'university_target' | 'department_target' | 'study_hours' | 'custom'
  title: string
  description: string
  target_value: string
  current_value: string
  target_date: string
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'completed' | 'paused' | 'cancelled'
}

export interface UserProfileWithStats extends UserProfile {
  task_count?: number
  completed_tasks?: number
  active_assignments?: number
}

export interface SubjectWithTopics extends Subject {
  topics?: Topic[]
  resource_count?: number
}

export interface TaskWithRelations extends Task {
  subject?: Subject
  topic?: Topic
  assigned_by_user?: UserProfile
  assigned_to_user?: UserProfile
}

export interface MockExamWithRelations extends MockExam {
  subject?: Subject
  created_by_user?: UserProfile
}

// Database type for Supabase client
export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
      }
      coach_student_assignments: {
        Row: CoachStudentAssignment
        Insert: Omit<CoachStudentAssignment, 'id' | 'assigned_at'>
        Update: Partial<Omit<CoachStudentAssignment, 'id' | 'assigned_at'>>
      }
      subjects: {
        Row: Subject
        Insert: Omit<Subject, 'id' | 'created_at'>
        Update: Partial<Omit<Subject, 'id' | 'created_at'>>
      }
      topics: {
        Row: Topic
        Insert: Omit<Topic, 'id' | 'created_at'>
        Update: Partial<Omit<Topic, 'id' | 'created_at'>>
      }
      resources: {
        Row: Resource
        Insert: Omit<Resource, 'id' | 'created_at'>
        Update: Partial<Omit<Resource, 'id' | 'created_at'>>
      }
      mock_exams: {
        Row: MockExam
        Insert: Omit<MockExam, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MockExam, 'id' | 'created_at' | 'updated_at'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at'>>
      }
      announcements: {
        Row: Announcement
        Insert: Omit<Announcement, 'id' | 'created_at'>
        Update: Partial<Omit<Announcement, 'id' | 'created_at'>>
      }
      stream_tokens: {
        Row: StreamToken
        Insert: Omit<StreamToken, 'id' | 'created_at'>
        Update: Partial<Omit<StreamToken, 'id' | 'created_at'>>
      }


      student_goals: {
        Row: Goal
        Insert: Omit<Goal, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at'>>
      }
      mock_exam_results: {
        Row: MockExamResult
        Insert: Omit<MockExamResult, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MockExamResult, 'id' | 'created_at' | 'updated_at'>>
      }
      educational_links: {
        Row: EducationalLink
        Insert: Omit<EducationalLink, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EducationalLink, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 