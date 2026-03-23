'use client'
import { useEffect, useState } from 'react'
import { supabase, Committee, getTimeSettings, saveTimeSettings, TimeSettings } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Plus, Building2, Pencil, Trash2, X, Check, Calendar, Upload, Download, Settings, Save } from 'lucide-react'
import { getArabicDay, formatDate, formatTime } from '@/lib/utils'
import * as XLSX from 'xlsx'
import { useTranslation } from '@/lib/i18n'

export default function CommitteesPage() {
  const { t } = useTranslation()
  const [committees, setCommittees] = useState<Committee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [timeSettings, setTimeSettings] = useState<TimeSettings>({
    morning: { start: '08:00', end: '14:00' },
    evening: { start: '14:00', end: '22:00' },
  })
  const [form, setForm] = useState({
    name: '', college: '', location: '',
    exam_date: '', start_time: '10:00', end_time: '12:00',
    main_observers: 2, backup_observers: 1
  })

  async function fetchCommittees() {
    const { data } = await supabase.from('committees').select('*').order('exam_date').order('start_time')
    setCommittees(data || [])
    const ts = await getTimeSettings()
    setTimeSettings(ts)
    setLoading(false)
  }

  useEffect(() => { fetchCommittees() }, [])

  // Classify a committee's period based on time settings
  function getCommitteePeriod(startTime: string): 'صباحي' | 'مسائي' | null {
    const t5 = startTime.slice(0, 5)
    if (t5 >= timeSettings.morning.start && t5 < timeSettings.morning.end) return 'صباحي'
    if (t5 >= timeSettings.evening.start && t5 < timeSettings.evening.end) return 'مسائي'
    return null
  }

  // Check if time ranges overlap
  function hasOverlap(): boolean {
    return timeSettings.morning.end > timeSettings.evening.start
  }

  function openAdd() {
    setForm({ name: '', college: '', location: '', exam_date: '', start_time: '10:00', end_time: '12:00', main_observers: 2, backup_observers: 1 })
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(c: Committee) {
    setForm({ name: c.name, college: c.college, location: c.location || '', exam_date: c.exam_date, start_time: c.start_time, end_time: c.end_time, main_observers: c.main_observers, backup_observers: c.backup_observers })
    setEditingId(c.id)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.college.trim() || !form.exam_date) return
    setSaving(true)
    if (editingId) {
      await supabase.from('committees').update(form).eq('id', editingId)
    } else {
      await supabase.from('committees').insert(form)
    }
    await fetchCommittees()
    setSaving(false)
    setShowModal(false)
  }

  async function handleDelete(id: string) {
    if (!confirm(t('com.delete.confirm'))) return
    await supabase.from('committees').delete().eq('id', id)
    await fetchCommittees()
  }

  async function handleSaveSettings() {
    if (hasOverlap()) return
    setSavingSettings(true)
    await saveTimeSettings(timeSettings)
    setSettingsSaved(true)
    setSavingSettings(false)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<any>(ws)
    const toInsert = rows.map(row => ({
      name: String(row['اسم اللجنة'] || row['name'] || ''),
      college: String(row['الكلية'] || row['college'] || ''),
      location: String(row['المكان'] || row['location'] || ''),
      exam_date: String(row['التاريخ'] || row['exam_date'] || ''),
      start_time: String(row['وقت البداية'] || row['start_time'] || '10:00'),
      end_time: String(row['وقت النهاية'] || row['end_time'] || '12:00'),
      main_observers: Number(row['أساسي'] || row['main_observers'] || 2),
      backup_observers: Number(row['احتياطي'] || row['backup_observers'] || 1),
    })).filter(r => r.name && r.college && r.exam_date)
    if (toInsert.length > 0) {
      await supabase.from('committees').insert(toInsert)
      await fetchCommittees()
    }
    setImporting(false)
    e.target.value = ''
  }

  function handleExportExcel() {
    const data = [
      [t('com.col.name'), t('com.col.college'), t('com.col.location'), t('com.modal.date'), t('com.modal.start'), t('com.modal.end'), t('com.col.main'), t('com.col.period')],
      ...committees.map(c => {
        const period = getCommitteePeriod(c.start_time)
        return [c.name, c.college, c.location || '', c.exam_date, c.start_time, c.end_time, c.main_observers, period === 'صباحي' ? 'صباحي' : period === 'مسائي' ? 'مسائي' : '-']
      })
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Committees')
    XLSX.writeFile(wb, 'committees.xlsx')
  }

  const grouped = committees.reduce((acc, c) => {
    const key = c.exam_date
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {} as Record<string, Committee[]>)

  function getPeriodBadge(startTime: string) {
    const period = getCommitteePeriod(startTime)
    if (period === 'صباحي') return <span className="text-xs font-medium px-2 py-1 rounded-full bg-sky-100 text-sky-700">{t('com.period.morning')}</span>
    if (period === 'مسائي') return <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">{t('com.period.evening')}</span>
    return <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">{t('com.period.unknown')}</span>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#3d3229' }}>
              <Building2 className="w-6 h-6" style={{ color: 'var(--plum)' }} /> {t('com.title')}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{committees.length} {t('com.count')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary">
              <Settings className="w-4 h-4" /> {t('com.settings.title')}
            </button>
            <button onClick={handleExportExcel} className="btn-secondary" disabled={committees.length === 0}>
              <Download className="w-4 h-4" /> {t('com.export')}
            </button>
            <label className={`btn-secondary cursor-pointer ${importing ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload className="w-4 h-4" />
              {importing ? t('com.importing') : t('com.import')}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={importing} />
            </label>
            <button onClick={openAdd} className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--plum), var(--plum-dark))' }}>
              <Plus className="w-4 h-4" /> {t('com.add')}
            </button>
          </div>
        </div>

        {/* ─── Time Settings Panel ─── */}
        {showSettings && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{t('com.settings.title')}</h3>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || hasOverlap()}
                className="flex items-center gap-2 text-sm font-semibold py-2 px-4 rounded-xl text-white transition-all"
                style={{ background: settingsSaved ? '#10b981' : hasOverlap() ? '#d1d5db' : 'linear-gradient(135deg, var(--plum), var(--plum-dark))' }}
              >
                {settingsSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {settingsSaved ? t('com.settings.saved') : savingSettings ? '...' : t('com.settings.save')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* Morning */}
              <div className="p-4 rounded-xl border-2 border-sky-200 bg-sky-50/50">
                <div className="text-sm font-semibold text-sky-700 mb-3">☀️ {t('com.settings.morning')}</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-sky-600 mb-1">{t('com.settings.from')}</label>
                    <input type="time" value={timeSettings.morning.start}
                      onChange={e => setTimeSettings({ ...timeSettings, morning: { ...timeSettings.morning, start: e.target.value } })}
                      className="input-field w-full text-center text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-sky-600 mb-1">{t('com.settings.to')}</label>
                    <input type="time" value={timeSettings.morning.end}
                      onChange={e => setTimeSettings({ ...timeSettings, morning: { ...timeSettings.morning, end: e.target.value } })}
                      className="input-field w-full text-center text-sm" />
                  </div>
                </div>
              </div>
              {/* Evening */}
              <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50/50">
                <div className="text-sm font-semibold text-purple-700 mb-3">🌙 {t('com.settings.evening')}</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-purple-600 mb-1">{t('com.settings.from')}</label>
                    <input type="time" value={timeSettings.evening.start}
                      onChange={e => setTimeSettings({ ...timeSettings, evening: { ...timeSettings.evening, start: e.target.value } })}
                      className="input-field w-full text-center text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-purple-600 mb-1">{t('com.settings.to')}</label>
                    <input type="time" value={timeSettings.evening.end}
                      onChange={e => setTimeSettings({ ...timeSettings, evening: { ...timeSettings.evening, end: e.target.value } })}
                      className="input-field w-full text-center text-sm" />
                  </div>
                </div>
              </div>
            </div>
            {hasOverlap() && (
              <div className="mt-3 text-sm text-red-600 font-medium bg-red-50 rounded-xl px-4 py-2">
                {t('com.settings.overlap')}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400">{t('com.loading')}</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, comms]) => (
              <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-3 border-b flex items-center gap-2" style={{ background: 'var(--copper-light)', borderColor: 'var(--beige-200)' }}>
                  <Calendar className="w-4 h-4" style={{ color: 'var(--copper-dark)' }} />
                  <span className="font-bold" style={{ color: 'var(--copper-dark)' }}>{getArabicDay(date)} — {formatDate(date)}</span>
                  <span className="text-sm mr-1" style={{ color: 'var(--copper)' }}>({comms.length} {t('com.committee')})</span>
                </div>
                <table className="schedule-table">
                  <thead><tr>
                    <th>{t('com.col.name')}</th><th>{t('com.col.college')}</th><th>{t('com.col.location')}</th>
                    <th>{t('com.col.time')}</th><th>{t('com.col.period')}</th><th>{t('com.col.main')}</th><th>{t('com.col.actions')}</th>
                  </tr></thead>
                  <tbody>
                    {comms.map(c => (
                      <tr key={c.id}>
                        <td className="font-semibold text-gray-800">{c.name}</td>
                        <td className="text-gray-600">{c.college}</td>
                        <td className="text-gray-500 text-sm">{c.location || '-'}</td>
                        <td className="text-gray-600 text-sm">{formatTime(c.start_time)} - {formatTime(c.end_time)}</td>
                        <td>{getPeriodBadge(c.start_time)}</td>
                        <td><span className="badge-main">{c.main_observers}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(c)} className="p-1 transition-colors" style={{ color: 'var(--copper)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--copper-dark)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--copper)')}><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {committees.length === 0 && <div className="bg-white rounded-2xl p-12 text-center text-gray-400">{t('com.empty')}</div>}
          </div>
        )}
      </main>
      <Footer />

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-bold text-lg text-gray-900">{editingId ? t('com.modal.edit') : t('com.modal.add')}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('com.modal.name')}</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder={t('com.modal.name.placeholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('com.modal.college')}</label>
                  <input type="text" value={form.college} onChange={e => setForm({...form, college: e.target.value})} className="input-field" placeholder={t('com.modal.college.placeholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('com.modal.location')}</label>
                  <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="input-field" placeholder={t('com.modal.location.placeholder')} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('com.modal.date')}</label>
                  <input type="date" value={form.exam_date} onChange={e => setForm({...form, exam_date: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('com.modal.start')}</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('com.modal.end')}</label>
                  <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('com.modal.main')}</label>
                  <input type="number" min={1} max={10} value={form.main_observers} onChange={e => setForm({...form, main_observers: parseInt(e.target.value)})} className="input-field" />
                </div>
                {/* Period auto-classification preview */}
                <div className="flex items-end pb-1">
                  {form.start_time && (
                    <div className="text-sm">
                      {t('com.col.period')}: {getPeriodBadge(form.start_time)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center" style={{ background: 'linear-gradient(135deg, var(--plum), var(--plum-dark))' }}>
                <Check className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
