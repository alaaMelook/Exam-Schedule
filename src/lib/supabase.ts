import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Employee {
  id: string
  name: string
  phone?: string
  department?: string
  role?: string
  created_at?: string
}

export interface Committee {
  id: string
  name: string
  college: string
  location?: string
  exam_date: string
  start_time: string
  end_time: string
  main_observers: number
  backup_observers: number
  created_at?: string
}

export interface Assignment {
  id: string
  employee_id: string
  committee_id: string
  type: 'أساسي' | 'احتياطي'
  status?: string
  created_at?: string
  employees?: Employee
  committees?: Committee
}

export interface EmployeeScheduleRow {
  employee: Employee
  assignments: (Assignment & { committee: Committee })[]
}
