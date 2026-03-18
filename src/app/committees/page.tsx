'use client'
import { useEffect, useState } from 'react'
import { supabase, Committee } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Plus, Building2, Pencil, Trash2, X, Check, Calendar, Upload, Download } from 'lucide-react'
import { getArabicDay, formatDate } from '@/lib/utils'
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
  const [form, setForm] = useState({
    name: '', college: '', location: '',
    exam_date: '', start_time: '10:00', end_time: '12:00',
    main_observers: 2, backup_observers: 1
  })

  async function fetchCommittees() {
    const { data } = await supabase.from('committees').select('*').order('exam_date').order('start_time')
    setCommittees(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCommittees() }, [])

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
      [t('com.col.name'), t('com.col.college'), t('com.col.location'), t('com.modal.date'), t('com.modal.start'), t('com.modal.end'), t('com.col.main'), t('com.col.backup')],
      ...committees.map(c => [c.name, c.college, c.location || '', c.exam_date, c.start_time, c.end_time, c.main_observers, c.backup_observers])
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-purple-600" /> {t('com.title')}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{committees.length} {t('com.count')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportExcel} className="btn-secondary" disabled={committees.length === 0}>
              <Download className="w-4 h-4" /> {t('com.export')}
            </button>
            <label className={`btn-secondary cursor-pointer ${importing ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload className="w-4 h-4" />
              {importing ? t('com.importing') : t('com.import')}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={importing} />
            </label>
            <button onClick={openAdd} className="btn-primary bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4" /> {t('com.add')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400">{t('com.loading')}</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, comms]) => (
              <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-l from-purple-50 to-indigo-50 px-6 py-3 border-b border-purple-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-purple-800">{getArabicDay(date)} — {formatDate(date)}</span>
                  <span className="text-purple-500 text-sm mr-1">({comms.length} {t('com.committee')})</span>
                </div>
                <table className="schedule-table">
                  <thead><tr>
                    <th>{t('com.col.name')}</th><th>{t('com.col.college')}</th><th>{t('com.col.location')}</th>
                    <th>{t('com.col.time')}</th><th>{t('com.col.main')}</th><th>{t('com.col.backup')}</th><th>{t('com.col.actions')}</th>
                  </tr></thead>
                  <tbody>
                    {comms.map(c => (
                      <tr key={c.id}>
                        <td className="font-semibold text-gray-800">{c.name}</td>
                        <td className="text-gray-600">{c.college}</td>
                        <td className="text-gray-500 text-sm">{c.location || '-'}</td>
                        <td className="text-gray-600 text-sm">{c.start_time.slice(0,5)} - {c.end_time.slice(0,5)}</td>
                        <td><span className="badge-main">{c.main_observers}</span></td>
                        <td><span className="badge-backup">{c.backup_observers}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(c)} className="text-purple-500 hover:text-purple-700 p-1"><Pencil className="w-4 h-4" /></button>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('com.modal.backup')}</label>
                  <input type="number" min={0} max={10} value={form.backup_observers} onChange={e => setForm({...form, backup_observers: parseInt(e.target.value)})} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center bg-purple-600 hover:bg-purple-700">
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
