import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'جدول توزيع الملاحظين',
  description: 'نظام إدارة جداول الملاحظين في الامتحانات',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
