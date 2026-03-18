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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-800 text-lg">{t('nav.logo')}</span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  pathname === href
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 border border-gray-200 ms-2"
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
