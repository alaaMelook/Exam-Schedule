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

export interface ReserveAssignment {
  id: string
  employee_id: string
  exam_date: string
  scope: 'صباحي' | 'مسائي' | 'يوم كامل'
  status?: string
  created_at?: string
  employees?: Employee
}

export interface EmployeeScheduleRow {
  employee: Employee
  assignments: (Assignment & { committee: Committee })[]
}

// ─── Time Range Settings ───
export interface TimeRange {
  start: string  // HH:MM
  end: string    // HH:MM
}

export interface TimeSettings {
  morning: TimeRange
  evening: TimeRange
}

const DEFAULT_TIME_SETTINGS: TimeSettings = {
  morning: { start: '08:00', end: '14:00' },
  evening: { start: '14:00', end: '22:00' },
}

export async function getTimeSettings(): Promise<TimeSettings> {
  const { data } = await supabase.from('settings').select('*').in('key', ['morning_range', 'evening_range'])
  if (!data || data.length === 0) return DEFAULT_TIME_SETTINGS
  const morning = data.find(d => d.key === 'morning_range')?.value as TimeRange | undefined
  const evening = data.find(d => d.key === 'evening_range')?.value as TimeRange | undefined
  return {
    morning: morning || DEFAULT_TIME_SETTINGS.morning,
    evening: evening || DEFAULT_TIME_SETTINGS.evening,
  }
}

export async function saveTimeSettings(settings: TimeSettings): Promise<void> {
  await supabase.from('settings').upsert([
    { key: 'morning_range', value: settings.morning },
    { key: 'evening_range', value: settings.evening },
  ])
}
