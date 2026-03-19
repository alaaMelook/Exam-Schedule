'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Building2, Calendar, LayoutDashboard, Globe } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export default function Navbar() {
  const pathname = usePathname()
  const { t, lang, toggleLang } = useTranslation()

  const navItems = [
    { href: '/', label: t('nav.home'), icon: LayoutDashboard },
    { href: '/employees', label: t('nav.employees'), icon: Users },
    { href: '/committees', label: t('nav.committees'), icon: Building2 },
    { href: '/assignments', label: t('nav.assignments'), icon: Calendar },
  ]

  return (
    <nav className="sticky top-0 z-50 no-print" style={{
      background: 'rgba(250, 248, 245, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--beige-200)',
    }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--copper), var(--copper-dark))' }}>
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: '#3d3229' }}>{t('nav.logo')}</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                style={
                  pathname === href
                    ? { background: 'var(--copper-light)', color: 'var(--copper-dark)', fontWeight: 600 }
                    : { color: '#7a6b5d' }
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ms-2 hover:scale-[1.02]"
              style={{ color: '#7a6b5d', border: '1.5px solid var(--beige-300)', background: 'white' }}
              title={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
            >
              <Globe className="w-4 h-4" />
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
