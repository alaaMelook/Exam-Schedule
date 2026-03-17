'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Users, Building2, Calendar, ChevronLeft, CheckCircle2 } from 'lucide-react'

export default function HomePage() {
  const [stats, setStats] = useState({ employees: 0, committees: 0, assignments: 0, covered: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [empRes, comRes, assRes] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('committees').select('id', { count: 'exact', head: true }),
        supabase.from('assignments').select('id', { count: 'exact', head: true }),
      ])

      // Count committees that have at least one assignment
      const { data: assignedCommittees } = await supabase
        .from('assignments')
        .select('committee_id')

      const uniqueCovered = new Set(assignedCommittees?.map(a => a.committee_id) || []).size

      setStats({
        employees: empRes.count || 0,
        committees: comRes.count || 0,
        assignments: assRes.count || 0,
        covered: uniqueCovered,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const statCards = [
    { label: 'الموظفون', value: stats.employees, color: 'bg-blue-500', icon: Users, href: '/employees' },
    { label: 'اللجان', value: stats.committees, color: 'bg-purple-500', icon: Building2, href: '/committees' },
    { label: 'التكليفات', value: stats.assignments, color: 'bg-green-500', icon: Calendar, href: '/assignments' },
    { label: 'لجان مغطاة', value: stats.covered, color: 'bg-emerald-500', icon: CheckCircle2, href: '/assignments' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">جدول توزيع الملاحظين</h1>
          <p className="text-gray-500 mt-1">إدارة توزيع الملاحظين على اللجان الامتحانية</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, color, icon: Icon, href }) => (
            <Link key={label} href={href}>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{loading ? '...' : value}</div>
                <div className="text-sm text-gray-500 mt-1">{label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/employees">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">إدارة الموظفين</h3>
              <p className="text-gray-500 text-sm mt-1">إضافة وتعديل بيانات الموظفين الملاحظين</p>
            </div>
          </Link>

          <Link href="/committees">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">إدارة اللجان</h3>
              <p className="text-gray-500 text-sm mt-1">إضافة اللجان والأماكن والأوقات</p>
            </div>
          </Link>

          <Link href="/assignments">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">توزيع الملاحظين</h3>
              <p className="text-gray-500 text-sm mt-1">تكليف الموظفين على اللجان وتصدير الجداول</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
