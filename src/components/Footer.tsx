'use client'
import { useTranslation } from '@/lib/i18n'
import { Heart, MessageCircle } from 'lucide-react'

export default function Footer() {
  const { lang } = useTranslation()

  const whatsappLink = `https://wa.me/201210953911`

  return (
    <footer className="no-print mt-auto border-t" style={{ borderColor: 'var(--beige-200)', background: 'linear-gradient(135deg, var(--beige-50), var(--beige-100))' }}>
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Credit */}
          <div className="flex items-center gap-2 text-sm" style={{ color: '#7a6b5d' }}>
            <span>{lang === 'ar' ? 'تطوير وتصميم بواسطة' : 'Developed & Designed by'}</span>
            <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400 animate-pulse" />
            <span className="font-bold" style={{ color: '#5a4d40' }}>Eng. Alaa Molouk</span>
          </div>

          {/* WhatsApp */}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #25d366, #128c7e)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
            }}
          >
            <MessageCircle className="w-4 h-4" />
            {lang === 'ar' ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
          </a>
        </div>
      </div>
    </footer>
  )
}
