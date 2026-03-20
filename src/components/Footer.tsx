'use client'
import { useTranslation } from '@/lib/i18n'
import { MessageCircle, Code2 } from 'lucide-react'

export default function Footer() {
  const { lang } = useTranslation()

  const whatsappLink = `https://wa.me/201210953911`

  return (
    <footer className="no-print mt-auto" style={{ borderTop: '1px solid var(--beige-200)', background: 'var(--beige-50)' }}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Code2 className="w-4 h-4" style={{ color: 'var(--beige-400)' }} />
          <span className="text-sm" style={{ color: '#9a8b7c' }}>
            Developed & Designed by
          </span>
          <span className="text-sm font-bold" style={{ color: '#5a4d40' }}>Eng. Alaa Molouk</span>
          <span style={{ color: 'var(--beige-300)' }}>|</span>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-all hover:opacity-80"
            style={{ color: '#5a4d40' }}
          >
            <MessageCircle className="w-3.5 h-3.5" style={{ color: '#25d366' }} />
            01210953911
          </a>
        </div>
      </div>
    </footer>
  )
}
