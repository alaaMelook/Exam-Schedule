'use client'
import { useState } from 'react'
import { Employee, Committee, Assignment, ReserveAssignment } from '@/lib/supabase'
import { getArabicDay, formatDate, formatTime } from '@/lib/utils'
import { FileSpreadsheet, FileText, User, Shield } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

type ScheduleRow = Assignment & { committees: Committee }

interface Props {
  employee: Employee
  rows: ScheduleRow[]
  reserves?: (ReserveAssignment & { employees?: Employee })[]
}

export default function EmployeeScheduleCard({ employee, rows, reserves = [] }: Props) {
  const { t } = useTranslation()
  const [exporting, setExporting] = useState(false)

  async function handleExportExcel() {
    setExporting(true)
    const { exportEmployeeExcel } = await import('@/lib/export')
    await exportEmployeeExcel(employee, rows)
    setExporting(false)
  }

  async function handleExportDocx() {
    setExporting(true)
    const { exportEmployeeDocx } = await import('@/lib/export')
    await exportEmployeeDocx(employee, rows)
    setExporting(false)
  }

  const mainCount = rows.filter(r => r.type === 'أساسي').length
  const reserveCount = reserves.length

  const grouped = rows.reduce((acc, row) => {
    const key = row.committees.exam_date
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {} as Record<string, ScheduleRow[]>)

  function getScopeBadgeClass(scope: string) {
    switch (scope) {
      case 'صباحي': return 'bg-sky-100 text-sky-700'
      case 'مسائي': return 'bg-purple-100 text-purple-700'
      case 'يوم كامل': return 'bg-emerald-100 text-emerald-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  function getScopeLabel(scope: string) {
    switch (scope) {
      case 'صباحي': return t('res.scope.morning')
      case 'مسائي': return t('res.scope.evening')
      case 'يوم كامل': return t('res.scope.fullday')
      default: return scope
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, var(--copper), var(--copper-dark))' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">{employee.name}</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {t('card.sessions')}: {rows.length} &nbsp;|&nbsp;
              {t('card.main')}: {mainCount} &nbsp;|&nbsp;
              {t('card.backup')}: {reserveCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button onClick={handleExportExcel} disabled={exporting || (rows.length === 0 && reserves.length === 0)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-2 rounded-xl transition-all">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={handleExportDocx} disabled={exporting || (rows.length === 0 && reserves.length === 0)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-2 rounded-xl transition-all">
            <FileText className="w-3.5 h-3.5" /> Doc
          </button>
        </div>
      </div>

      {rows.length === 0 && reserves.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-400 text-sm">{t('card.noAssignments')}</div>
      ) : (
        <div>
          {/* Reserve assignments section */}
          {reserves.length > 0 && (
            <div className="px-6 py-3 border-b border-gray-100" style={{ background: '#f0f9ff' }}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-sky-600" />
                <span className="font-semibold text-sky-700 text-sm">{t('res.title')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {reserves.map(r => (
                  <div key={r.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-sky-200 text-sm">
                    <span className="text-gray-700">{getArabicDay(r.exam_date)} — {formatDate(r.exam_date)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getScopeBadgeClass(r.scope)}`}>
                      {getScopeLabel(r.scope)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Committee assignments */}
          {Object.entries(grouped).map(([date, dayRows]) => (
            <div key={date}>
              <div className="bg-gray-50 px-6 py-2 border-b border-gray-100 flex items-center gap-2">
                <span className="font-semibold text-gray-700 text-sm">{getArabicDay(date)} — {formatDate(date)}</span>
                <span className="text-gray-400 text-xs">({dayRows.length} {t('com.committee')})</span>
              </div>
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>{t('card.col.day')}</th>
                    <th>{t('card.col.branch')}</th>
                    <th>{t('card.col.time')}</th>
                    <th>{t('card.col.location')}</th>
                    <th>{t('card.col.college')}</th>
                    <th>{t('card.col.type')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dayRows.map(row => (
                    <tr key={row.id}>
                      <td className="text-gray-600 text-sm">{getArabicDay(row.committees.exam_date)}</td>
                      <td className="font-medium text-gray-800">{row.committees.name}</td>
                      <td className="text-gray-600 text-sm">{formatTime(row.committees.start_time)} - {formatTime(row.committees.end_time)}</td>
                      <td className="text-gray-500 text-sm">{row.committees.location || '-'}</td>
                      <td className="text-gray-600 text-sm">{row.committees.college}</td>
                      <td>
                        <span className="badge-main">{t('asg.type.main')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
