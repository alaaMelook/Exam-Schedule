'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, Employee, Committee, Assignment, ReserveAssignment, getTimeSettings } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import EmployeeScheduleCard from '@/components/EmployeeScheduleCard'
import { Plus, Calendar, X, Check, Download, Users, Search, Trash2, Wand2, AlertTriangle, RotateCcw, Shuffle, FileText, Shield } from 'lucide-react'
import { getArabicDay, formatDate, formatTime } from '@/lib/utils'
import { autoDistribute, DistributionMode, ReserveConfig } from '@/lib/distribute'
import { useTranslation } from '@/lib/i18n'

type ScheduleRow = Assignment & { committees: Committee }
type AssignmentWithAll = Assignment & { employees: Employee; committees: Committee }
type ReserveWithEmployee = ReserveAssignment & { employees: Employee }

export default function AssignmentsPage() {
  const { t } = useTranslation()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [committees, setCommittees] = useState<Committee[]>([])
  const [assignments, setAssignments] = useState<AssignmentWithAll[]>([])
  const [reserves, setReserves] = useState<ReserveWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'byEmployee' | 'byDate'>('byEmployee')
  const [searchEmp, setSearchEmp] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [showAutoModal, setShowAutoModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [autoWarnings, setAutoWarnings] = useState<string[]>([])
  const [autoMode, setAutoMode] = useState<DistributionMode>('sequential')
  const [clearFirst, setClearFirst] = useState(false)
  const [morningReserveCount, setMorningReserveCount] = useState(0)
  const [eveningReserveCount, setEveningReserveCount] = useState(0)
  const [form, setForm] = useState({ employee_id: '', committee_id: '', type: 'أساسي' as 'أساسي' | 'احتياطي' })
  const [reserveForm, setReserveForm] = useState({ employee_id: '', exam_date: '', scope: 'صباحي' as 'صباحي' | 'مسائي' })
  const [morningEnd, setMorningEnd] = useState('14:00')

  const fetchData = useCallback(async () => {
    const [empRes, comRes, assRes, resRes] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('committees').select('*').order('exam_date').order('start_time'),
      supabase.from('assignments').select('*, employees(*), committees(*)').order('created_at'),
      supabase.from('reserve_assignments').select('*, employees(*)').order('exam_date'),
    ])
    setEmployees(empRes.data || [])
    setCommittees(comRes.data || [])
    setAssignments((assRes.data as AssignmentWithAll[]) || [])
    setReserves((resRes.data as ReserveWithEmployee[]) || [])
    const ts = await getTimeSettings()
    setMorningEnd(ts.morning.end)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (!form.employee_id || !form.committee_id) return
    setSaving(true)
    await supabase.from('assignments').upsert(
      { employee_id: form.employee_id, committee_id: form.committee_id, type: form.type },
      { onConflict: 'employee_id,committee_id' }
    )
    await fetchData()
    setSaving(false)
    setShowAddModal(false)
  }

  async function handleSaveReserve() {
    if (!reserveForm.employee_id || !reserveForm.exam_date || !reserveForm.scope) return
    // Client-side validation: check employee is still available
    const isBusy = !availableForReserve.some(e => e.id === reserveForm.employee_id)
    if (isBusy) {
      alert('هذا الموظف مشغول بالفعل في هذا اليوم والفترة')
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from('reserve_assignments').upsert(
      { employee_id: reserveForm.employee_id, exam_date: reserveForm.exam_date, scope: reserveForm.scope },
      { onConflict: 'employee_id,exam_date,scope' }
    ).select('*, employees(*)')
    if (error) {
      alert('حدث خطأ أثناء الحفظ: ' + error.message)
      setSaving(false)
      return
    }
    // Immediately update local reserves state so counter + schedule view reflect the new reserve
    if (data && data.length > 0) {
      setReserves(prev => {
        const newReserve = data[0] as ReserveWithEmployee
        const exists = prev.some(
          r => r.employee_id === newReserve.employee_id &&
               r.exam_date === newReserve.exam_date &&
               r.scope === newReserve.scope
        )
        if (exists) {
          return prev.map(r =>
            r.employee_id === newReserve.employee_id &&
            r.exam_date === newReserve.exam_date &&
            r.scope === newReserve.scope
              ? newReserve : r
          )
        }
        return [...prev, newReserve]
      })
    }
    // Also do a full refetch in the background to ensure consistency
    fetchData()
    setSaving(false)
    setShowReserveModal(false)
    setReserveForm({ employee_id: '', exam_date: '', scope: 'صباحي' })
  }

  async function handleDelete(id: string) {
    await supabase.from('assignments').delete().eq('id', id)
    await fetchData()
  }

  async function handleDeleteReserve(id: string) {
    await supabase.from('reserve_assignments').delete().eq('id', id)
    await fetchData()
  }

  async function handleClearAll() {
    if (!confirm(t('asg.clearAll.confirm'))) return
    await supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('reserve_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await fetchData()
  }

  async function handleAutoDistribute() {
    setDistributing(true)
    setAutoWarnings([])
    try {
      let currentAssignments: Assignment[] = assignments
      let currentReserves: ReserveAssignment[] = reserves
      if (clearFirst) {
        await supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('reserve_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        currentAssignments = []
        currentReserves = []
      }
      const resConfig: ReserveConfig = { morningCount: morningReserveCount, eveningCount: eveningReserveCount }
      const result = autoDistribute(employees, committees, currentAssignments, autoMode, currentReserves, resConfig, morningEnd)
      if (result.assignments.length > 0) {
        await supabase.from('assignments').upsert(result.assignments, { onConflict: 'employee_id,committee_id' })
      }
      if (result.reserves.length > 0) {
        await supabase.from('reserve_assignments').upsert(result.reserves, { onConflict: 'employee_id,exam_date,scope' })
      }
      setAutoWarnings(result.warnings)
      await fetchData()
      if (result.warnings.length === 0) setShowAutoModal(false)
    } catch {
      setAutoWarnings(['حدث خطأ أثناء التوزيع'])
    }
    setDistributing(false)
  }

  async function handleExportAll() {
    if (assignments.length === 0 && reserves.length === 0) return
    const { exportAllScheduleExcel } = await import('@/lib/export')
    const map = new Map<string, ScheduleRow[]>()
    employees.forEach(e => {
      map.set(e.id, assignments.filter(a => a.employee_id === e.id).map(a => ({ ...a, committees: a.committees })) as ScheduleRow[])
    })
    await exportAllScheduleExcel(employees, map)
  }

  async function handleExportAllDocx() {
    if (assignments.length === 0 && reserves.length === 0) return
    const { exportAllDocx } = await import('@/lib/export')
    const map = new Map<string, ScheduleRow[]>()
    employees.forEach(e => {
      map.set(e.id, assignments.filter(a => a.employee_id === e.id).map(a => ({ ...a, committees: a.committees })) as ScheduleRow[])
    })
    await exportAllDocx(employees, map)
  }

  const filteredEmployees = employees.filter(e => e.name.includes(searchEmp) || (e.department || '').includes(searchEmp))

  // Get unique exam dates from committees for the reserve date picker
  const examDates = [...new Set(committees.map(c => c.exam_date))].sort()

  // ─── Filter employees available for reserve based on selected date + scope ───
  const MORNING_CUTOFF = '14:00'
  const availableForReserve = (() => {
    if (!reserveForm.exam_date || !reserveForm.scope) return employees
    const selectedDate = reserveForm.exam_date
    const selectedScope = reserveForm.scope

    // Get committees on the selected date that match the scope
    const matchingCommittees = committees.filter(c => {
      if (c.exam_date !== selectedDate) return false
      const period = c.start_time < MORNING_CUTOFF ? 'صباحي' : 'مسائي'
      return period === selectedScope
    })

    // Employees assigned to ANY committee at this date+period
    const assignedIds = new Set(
      assignments
        .filter(a => matchingCommittees.some(c => c.id === a.committee_id))
        .map(a => a.employee_id)
    )

    // Employees already reserved for this date+scope
    const alreadyReservedIds = new Set(
      reserves
        .filter(r => r.exam_date === selectedDate && r.scope === selectedScope)
        .map(r => r.employee_id)
    )

    return employees.filter(e => {
      if (assignedIds.has(e.id) || alreadyReservedIds.has(e.id)) return false
      // Check availability days
      if (e.available_days && e.available_days.length > 0) {
        const dayName = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
        if (!e.available_days.includes(dayName)) return false
      }
      return true
    })
  })()

  const byDateGroups = committees.reduce((acc, c) => {
    const key = c.exam_date
    if (!acc[key]) acc[key] = []
    acc[key].push({ committee: c, comAssignments: assignments.filter(a => a.committee_id === c.id) })
    return acc
  }, {} as Record<string, { committee: Committee; comAssignments: AssignmentWithAll[] }[]>)

  // Group reserves by date
  const reservesByDate = reserves.reduce((acc, r) => {
    const key = r.exam_date
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {} as Record<string, ReserveWithEmployee[]>)

  function getScopeBadgeClass(scope: string) {
    switch (scope) {
      case 'صباحي': return 'bg-sky-100 text-sky-700'
      case 'مسائي': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  function getScopeLabel(scope: string) {
    switch (scope) {
      case 'صباحي': return t('res.scope.morning')
      case 'مسائي': return t('res.scope.evening')
      default: return scope
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#3d3229' }}>
            <Calendar className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} /> {t('asg.title')}
          </h1>
          <div className="flex items-center gap-2 flex-wrap no-print">
            <button onClick={handleExportAll} className="btn-secondary"><Download className="w-4 h-4" /> {t('asg.export')}</button>
            <button onClick={handleExportAllDocx} className="btn-secondary"><FileText className="w-4 h-4" /> تصدير Doc</button>
            <button onClick={() => { setAutoWarnings([]); setShowAutoModal(true) }}
              className="flex items-center gap-2 text-white font-semibold py-2.5 px-5 rounded-xl transition-all text-sm" style={{ background: 'linear-gradient(135deg, var(--plum), var(--plum-dark))' }}>
              <Wand2 className="w-4 h-4" /> {t('asg.auto')}
            </button>
            <button onClick={() => setShowReserveModal(true)}
              className="flex items-center gap-2 text-white font-semibold py-2.5 px-5 rounded-xl transition-all text-sm" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
              <Shield className="w-4 h-4" /> {t('res.add')}
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> {t('asg.addManual')}</button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            { label: t('asg.stat.employees'), value: employees.length },
            { label: t('asg.stat.assignments'), value: assignments.length },
            { label: t('res.stat.reserves'), value: reserves.length },
            { label: t('asg.stat.committees'), value: committees.length },
            { label: t('asg.stat.covered'), value: new Set(assignments.map(a => a.committee_id)).size },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-3xl font-bold text-gray-900">{loading ? '...' : s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6 no-print flex-wrap gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 flex gap-1">
            {(['byEmployee', 'byDate'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${viewMode === mode ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                style={viewMode === mode ? { background: 'var(--copper)' } : {}}>
                {mode === 'byEmployee' ? t('asg.view.byEmployee') : t('asg.view.byDate')}
              </button>
            ))}
          </div>
          <button onClick={handleClearAll} className="btn-danger"><RotateCcw className="w-3.5 h-3.5" /> {t('asg.clearAll')}</button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400">{t('asg.loading')}</div>
        ) : viewMode === 'byEmployee' ? (
          <>
            <div className="relative mb-5 no-print">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t('asg.searchEmp')} value={searchEmp}
                onChange={e => setSearchEmp(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties} />
            </div>
            {filteredEmployees.map(emp => (
              <EmployeeScheduleCard key={emp.id} employee={emp}
                rows={assignments.filter(a => a.employee_id === emp.id).map(a => ({ ...a, committees: a.committees })) as ScheduleRow[]}
                reserves={reserves.filter(r => r.employee_id === emp.id)} />
            ))}
          </>
        ) : (
          <div className="space-y-6">
            {Object.entries(byDateGroups).sort(([a], [b]) => a.localeCompare(b)).map(([date, groups]) => (
              <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-3 flex items-center gap-2 rounded-t-2xl" style={{ background: 'linear-gradient(135deg, var(--copper), var(--copper-dark))' }}>
                  <Calendar className="w-4 h-4 text-white" />
                  <span className="font-bold text-white">{getArabicDay(date)} — {formatDate(date)}</span>
                  <span className="text-white/70 text-sm mr-1">({groups.length} {t('com.committee')})</span>
                </div>

                {/* Reserve employees for this date — grouped by Morning / Evening */}
                {reservesByDate[date] && reservesByDate[date].length > 0 && (() => {
                  const morningReserves = reservesByDate[date].filter(r => r.scope === 'صباحي')
                  const eveningReserves = reservesByDate[date].filter(r => r.scope === 'مسائي')
                  return (
                    <>
                      {morningReserves.length > 0 && (
                        <div className="px-6 py-3 border-b border-gray-100" style={{ background: '#f0f9ff' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-sky-600" />
                            <span className="font-semibold text-sky-700 text-sm">☀️ {t('res.scope.morning')} — {t('res.title')}</span>
                            <span className="text-xs text-sky-500">({morningReserves.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {morningReserves.map(r => (
                              <div key={r.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-sky-200 shadow-sm">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-sky-100">
                                  <Users className="w-3.5 h-3.5 text-sky-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{r.employees?.name || '—'}</p>
                                  <p className="text-xs text-gray-400">{r.employees?.department}</p>
                                </div>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                                  {getScopeLabel(r.scope)}
                                </span>
                                <button onClick={() => handleDeleteReserve(r.id)} className="text-red-400 hover:text-red-600 p-1 no-print">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {eveningReserves.length > 0 && (
                        <div className="px-6 py-3 border-b border-gray-100" style={{ background: '#faf5ff' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold text-purple-700 text-sm">🌙 {t('res.scope.evening')} — {t('res.title')}</span>
                            <span className="text-xs text-purple-500">({eveningReserves.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {eveningReserves.map(r => (
                              <div key={r.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-purple-200 shadow-sm">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-purple-100">
                                  <Users className="w-3.5 h-3.5 text-purple-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{r.employees?.name || '—'}</p>
                                  <p className="text-xs text-gray-400">{r.employees?.department}</p>
                                </div>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                  {getScopeLabel(r.scope)}
                                </span>
                                <button onClick={() => handleDeleteReserve(r.id)} className="text-red-400 hover:text-red-600 p-1 no-print">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}

                {groups.map(({ committee, comAssignments }) => (
                  <div key={committee.id} className="border-b border-gray-100 last:border-0">
                    <div className="px-6 py-3 bg-gray-50 flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-800">{committee.name}</span>
                      <span className="text-gray-400 text-xs">{committee.college}</span>
                      <span className="text-gray-400 text-xs">{formatTime(committee.start_time)} - {formatTime(committee.end_time)}</span>
                      <div className="mr-auto flex gap-2 items-center">
                        <span className="badge-main">{t('asg.type.main')}: {committee.main_observers}</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${comAssignments.length >= committee.main_observers ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-500'}`}>
                          {t('asg.assigned')}: {comAssignments.length}
                        </span>
                      </div>
                    </div>
                    {comAssignments.length === 0
                      ? <div className="px-6 py-4 text-gray-400 text-sm">{t('asg.noObservers')}</div>
                      : <div className="px-6 py-2">
                          {comAssignments.map(a => (
                            <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--copper-light)' }}>
                                  <Users className="w-4 h-4" style={{ color: 'var(--copper)' }} />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{a.employees.name}</p>
                                  <p className="text-xs text-gray-400">{a.employees.department}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="badge-main">{t('asg.type.main')}</span>
                                <button onClick={() => handleDelete(a.id)} className="text-red-400 hover:text-red-600 p-1 no-print"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Manual Add Modal (main observers only) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-lg">{t('asg.modal.title')}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('asg.modal.employee')}</label>
                <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="input-field">
                  <option value="">{t('asg.modal.employee.placeholder')}</option>
                  {employees.filter(e => {
                    if (!form.committee_id) return true
                    const committee = committees.find(c => c.id === form.committee_id)
                    if (!committee) return true
                    if (!e.available_days || e.available_days.length === 0) return true
                    const dayName = new Date(committee.exam_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
                    return e.available_days.includes(dayName)
                  }).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('asg.modal.committee')}</label>
                <select value={form.committee_id} onChange={e => setForm({ ...form, committee_id: e.target.value })} className="input-field">
                  <option value="">{t('asg.modal.committee.placeholder')}</option>
                  {committees.map(c => <option key={c.id} value={c.id}>{getArabicDay(c.exam_date)} — {c.name} ({c.college})</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                <Check className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reserve Add Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-600" /> {t('res.modal.title')}
              </h2>
              <button onClick={() => setShowReserveModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* 1. Day/Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('res.modal.date')}</label>
                <select value={reserveForm.exam_date} onChange={e => setReserveForm({ ...reserveForm, exam_date: e.target.value, employee_id: '' })} className="input-field">
                  <option value="">اختر التاريخ</option>
                  {examDates.map(d => <option key={d} value={d}>{getArabicDay(d)} — {formatDate(d)}</option>)}
                </select>
              </div>
              {/* 2. Session (Morning / Evening) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('res.modal.scope')}</label>
                <div className="flex gap-3">
                  {(['صباحي', 'مسائي'] as const).map(scope => (
                    <button key={scope} onClick={() => setReserveForm({ ...reserveForm, scope, employee_id: '' })}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${reserveForm.scope === scope
                        ? scope === 'صباحي' ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-600'}`}>
                      {scope === 'صباحي' ? '☀️ ' : '🌙 '}{getScopeLabel(scope)}
                    </button>
                  ))}
                </div>
              </div>
              {/* 3. Employee (filtered) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('res.modal.employee')}</label>
                <select value={reserveForm.employee_id} onChange={e => setReserveForm({ ...reserveForm, employee_id: e.target.value })} className="input-field"
                  disabled={!reserveForm.exam_date}>
                  <option value="">{!reserveForm.exam_date ? 'اختر التاريخ والفترة أولاً' : t('res.modal.employee.placeholder')}</option>
                  {availableForReserve.map(e => <option key={e.id} value={e.id}>{e.name} — {e.department || ''}</option>)}
                </select>
                {reserveForm.exam_date && availableForReserve.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ لا يوجد موظفين متاحين لهذه الفترة</p>
                )}
                {reserveForm.exam_date && availableForReserve.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">✅ {availableForReserve.length} موظف متاح</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={handleSaveReserve} disabled={saving}
                className="flex items-center gap-2 justify-center text-white font-semibold py-2.5 px-5 rounded-xl transition-all flex-1 text-sm"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                <Check className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={() => setShowReserveModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Distribute Modal */}
      {showAutoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-lg flex items-center gap-2"><Wand2 className="w-5 h-5 text-indigo-600" /> {t('asg.auto.title')}</h2>
              <button onClick={() => setShowAutoModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">{t('asg.auto.method')}</label>
                <div className="flex gap-3">
                  <button onClick={() => setAutoMode('sequential')}
                    className={`flex-1 p-4 rounded-xl border-2 text-sm transition-all text-right ${autoMode === 'sequential' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="font-semibold text-gray-800 mb-1">{t('asg.auto.sequential')}</div>
                    <div className="text-gray-500 text-xs">{t('asg.auto.sequential.desc')}</div>
                  </button>
                  <button onClick={() => setAutoMode('random')}
                    className={`flex-1 p-4 rounded-xl border-2 text-sm transition-all text-right ${autoMode === 'random' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1"><Shuffle className="w-3.5 h-3.5" /> {t('asg.auto.random')}</div>
                    <div className="text-gray-500 text-xs">{t('asg.auto.random.desc')}</div>
                  </button>
                </div>
              </div>
              <div onClick={() => setClearFirst(!clearFirst)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${clearFirst ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${clearFirst ? 'bg-red-500 border-red-500' : 'border-gray-300'}`}>
                  {clearFirst && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{t('asg.auto.clearFirst')}</p>
                  <p className="text-xs text-gray-500">{t('asg.auto.clearFirst.desc')}</p>
                </div>
              </div>
              {/* Reserve counts per period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">{t('asg.auto.reserveCount')}</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="text-center text-xs font-medium text-sky-600 mb-1.5">{t('res.scope.morning')} ☀️</div>
                    <input type="number" min={0} max={50} value={morningReserveCount}
                      onChange={e => setMorningReserveCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="input-field w-full text-center text-lg font-bold" style={{ borderColor: morningReserveCount > 0 ? '#0ea5e9' : undefined }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-center text-xs font-medium text-purple-600 mb-1.5">{t('res.scope.evening')} 🌙</div>
                    <input type="number" min={0} max={50} value={eveningReserveCount}
                      onChange={e => setEveningReserveCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="input-field w-full text-center text-lg font-bold" style={{ borderColor: eveningReserveCount > 0 ? '#a855f7' : undefined }} />
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-600 space-y-1">
                <p className="font-semibold text-blue-700 text-sm">{t('asg.auto.notes')}</p>
                <p>• {t('asg.auto.note1')}</p>
                <p>• {t('asg.auto.note2')}</p>
                <p>• {t('asg.auto.note3')}</p>
                <p>• {t('asg.auto.note4')}</p>
              </div>
              {autoWarnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-yellow-700 font-medium text-sm mb-2"><AlertTriangle className="w-4 h-4" /> {t('asg.auto.warnings')}</div>
                  <ul className="text-xs text-yellow-600 space-y-1">{autoWarnings.map((w, i) => <li key={i}>• {w}</li>)}</ul>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={handleAutoDistribute} disabled={distributing}
                className="flex items-center gap-2 justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all flex-1 text-sm">
                <Wand2 className="w-4 h-4" />{distributing ? t('asg.auto.distributing') : t('asg.auto.start')}
              </button>
              <button onClick={() => setShowAutoModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
