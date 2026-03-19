'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Users, Building2, Calendar, ChevronLeft, CheckCircle2, Sparkles } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export default function HomePage() {
  const { t, lang } = useTranslation()
  const [stats, setStats] = useState({ employees: 0, committees: 0, assignments: 0, covered: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [empRes, comRes, assRes] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('committees').select('id', { count: 'exact', head: true }),
        supabase.from('assignments').select('id', { count: 'exact', head: true }),
      ])
      const { data: assignedCommittees } = await supabase.from('assignments').select('committee_id')
      const uniqueCovered = new Set(assignedCommittees?.map(a => a.committee_id) || []).size
      setStats({ employees: empRes.count || 0, committees: comRes.count || 0, assignments: assRes.count || 0, covered: uniqueCovered })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const statCards = [
    { label: t('home.stat.employees'), value: stats.employees, bg: 'linear-gradient(135deg, var(--teal), var(--teal-dark))', icon: Users, href: '/employees' },
    { label: t('home.stat.committees'), value: stats.committees, bg: 'linear-gradient(135deg, #9b7dcf, #7c5db5)', icon: Building2, href: '/committees' },
    { label: t('home.stat.assignments'), value: stats.assignments, bg: 'linear-gradient(135deg, var(--accent-primary), var(--accent-dark))', icon: Calendar, href: '/assignments' },
    { label: t('home.stat.covered'), value: stats.covered, bg: 'linear-gradient(135deg, var(--gold), #b8912e)', icon: CheckCircle2, href: '/assignments' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: '#3d3229' }}>
            <Sparkles className="w-7 h-7" style={{ color: 'var(--gold)' }} />
            {t('home.title')}
          </h1>
          <p className="mt-1" style={{ color: '#9a8b7c' }}>{t('home.subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, bg, icon: Icon, href }) => (
            <Link key={label} href={href}>
              <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1" style={{ border: '1px solid var(--beige-200)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold" style={{ color: '#3d3229' }}>{loading ? '...' : value}</div>
                <div className="text-sm mt-1" style={{ color: '#9a8b7c' }}>{label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/employees">
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:-translate-y-1 duration-300" style={{ border: '1px solid var(--beige-200)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'var(--teal-light)' }}>
                  <Users className="w-6 h-6" style={{ color: 'var(--teal)' }} />
                </div>
                <ChevronLeft className={`w-5 h-5 group-hover:text-gray-600 ${lang === 'en' ? 'rotate-180' : ''}`} style={{ color: 'var(--beige-400)' }} />
              </div>
              <h3 className="font-bold text-lg" style={{ color: '#3d3229' }}>{t('home.card.employees.title')}</h3>
              <p className="text-sm mt-1" style={{ color: '#9a8b7c' }}>{t('home.card.employees.desc')}</p>
            </div>
          </Link>

          <Link href="/committees">
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:-translate-y-1 duration-300" style={{ border: '1px solid var(--beige-200)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors" style={{ background: '#f0eaf8' }}>
                  <Building2 className="w-6 h-6" style={{ color: '#9b7dcf' }} />
                </div>
                <ChevronLeft className={`w-5 h-5 group-hover:text-gray-600 ${lang === 'en' ? 'rotate-180' : ''}`} style={{ color: 'var(--beige-400)' }} />
              </div>
              <h3 className="font-bold text-lg" style={{ color: '#3d3229' }}>{t('home.card.committees.title')}</h3>
              <p className="text-sm mt-1" style={{ color: '#9a8b7c' }}>{t('home.card.committees.desc')}</p>
            </div>
          </Link>

          <Link href="/assignments">
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:-translate-y-1 duration-300" style={{ border: '1px solid var(--beige-200)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'var(--accent-light)' }}>
                  <Calendar className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <ChevronLeft className={`w-5 h-5 group-hover:text-gray-600 ${lang === 'en' ? 'rotate-180' : ''}`} style={{ color: 'var(--beige-400)' }} />
              </div>
              <h3 className="font-bold text-lg" style={{ color: '#3d3229' }}>{t('home.card.assignments.title')}</h3>
              <p className="text-sm mt-1" style={{ color: '#9a8b7c' }}>{t('home.card.assignments.desc')}</p>
            </div>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
