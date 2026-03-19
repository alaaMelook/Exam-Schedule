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
    { label: t('home.stat.employees'), value: stats.employees, bg: 'linear-gradient(135deg, var(--copper), var(--copper-dark))', icon: Users, href: '/employees' },
    { label: t('home.stat.committees'), value: stats.committees, bg: 'linear-gradient(135deg, var(--plum), var(--plum-dark))', icon: Building2, href: '/committees' },
    { label: t('home.stat.assignments'), value: stats.assignments, bg: 'linear-gradient(135deg, var(--accent-primary), var(--accent-dark))', icon: Calendar, href: '/assignments' },
    { label: t('home.stat.covered'), value: stats.covered, bg: 'linear-gradient(135deg, var(--gold), #b8912e)', icon: CheckCircle2, href: '/assignments' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-10 flex-1 w-full">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-4" style={{ background: 'var(--copper-light)', color: 'var(--copper-dark)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'نظام إدارة جداول الملاحظين' : 'Observer Schedule Management System'}
          </div>
          <h1 className="text-4xl font-extrabold mb-2" style={{ color: '#3d3229' }}>
            {t('home.title')}
          </h1>
          <p className="text-lg" style={{ color: '#9a8b7c' }}>{t('home.subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {statCards.map(({ label, value, bg, icon: Icon, href }, i) => (
            <Link key={label} href={href}>
              <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1 animate-fade-in"
                style={{ border: '1px solid var(--beige-200)', animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-3xl font-extrabold" style={{ color: '#3d3229' }}>{loading ? '...' : value}</div>
                <div className="text-sm mt-1" style={{ color: '#9a8b7c' }}>{label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-bold mb-4" style={{ color: '#5a4d40' }}>
          {lang === 'ar' ? '⚡ إجراءات سريعة' : '⚡ Quick Actions'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { href: '/employees', icon: Users, color: 'var(--copper)', lightBg: 'var(--copper-light)', title: t('home.card.employees.title'), desc: t('home.card.employees.desc') },
            { href: '/committees', icon: Building2, color: 'var(--plum)', lightBg: 'var(--plum-light)', title: t('home.card.committees.title'), desc: t('home.card.committees.desc') },
            { href: '/assignments', icon: Calendar, color: 'var(--accent-primary)', lightBg: 'var(--accent-light)', title: t('home.card.assignments.title'), desc: t('home.card.assignments.desc') },
          ].map(({ href, icon: Icon, color, lightBg, title, desc }, i) => (
            <Link key={href} href={href}>
              <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all group cursor-pointer hover:-translate-y-1.5 duration-300 animate-fade-in"
                style={{ border: '1px solid var(--beige-200)', animationDelay: `${300 + i * 100}ms`, animationFillMode: 'both' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: lightBg }}>
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <ChevronLeft className={`w-5 h-5 transition-transform group-hover:translate-x-[-4px] ${lang === 'en' ? 'rotate-180 group-hover:translate-x-[4px]' : ''}`} style={{ color: 'var(--beige-400)' }} />
                </div>
                <h3 className="font-bold text-lg" style={{ color: '#3d3229' }}>{title}</h3>
                <p className="text-sm mt-1" style={{ color: '#9a8b7c' }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}
