'use client'

export default function Footer() {
  return (
    <footer className="no-print mt-auto" style={{ borderTop: '1px solid var(--beige-200)', background: 'var(--beige-50)' }}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center">
          <span className="text-sm" style={{ color: '#9a8b7c' }}>
            Exam Schedule System
          </span>
        </div>
      </div>
    </footer>
  )
}
