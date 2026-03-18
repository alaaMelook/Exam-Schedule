'use client'
import { LanguageProvider, useTranslation } from '@/lib/i18n'
import './globals.css'

function HtmlWrapper({ children }: { children: React.ReactNode }) {
  const { lang } = useTranslation()
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        <title>{lang === 'ar' ? 'جدول توزيع الملاحظين' : 'Observer Distribution Schedule'}</title>
        <meta name="description" content={lang === 'ar' ? 'نظام إدارة جداول الملاحظين في الامتحانات' : 'Exam observer schedule management system'} />
      </head>
      <body>{children}</body>
    </html>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LanguageProvider>
      <HtmlWrapper>{children}</HtmlWrapper>
    </LanguageProvider>
  )
}
