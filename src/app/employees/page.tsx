'use client'
import { useEffect, useState } from 'react'
import { supabase, Employee } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Plus, Search, Pencil, Trash2, X, Check, Users, Upload, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useTranslation } from '@/lib/i18n'

export default function EmployeesPage() {
  const { t } = useTranslation()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', department: '', role: 'ملاحظ' })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  async function fetchEmployees() {
    const { data } = await supabase.from('employees').select('*').order('name')
    setEmployees(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchEmployees() }, [])

  const filtered = employees.filter(e =>
    e.name.includes(search) ||
    (e.department || '').includes(search) ||
    (e.phone || '').includes(search)
  )

  function openAdd() {
    setForm({ name: '', phone: '', department: '', role: 'ملاحظ' })
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(emp: Employee) {
    setForm({ name: emp.name, phone: emp.phone || '', department: emp.department || '', role: emp.role || 'ملاحظ' })
    setEditingId(emp.id)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    if (editingId) {
      await supabase.from('employees').update(form).eq('id', editingId)
    } else {
      await supabase.from('employees').insert(form)
    }
    await fetchEmployees()
    setSaving(false)
    setShowModal(false)
  }

  async function handleDelete(id: string) {
    if (!confirm(t('emp.delete.confirm'))) return
    await supabase.from('employees').delete().eq('id', id)
    await fetchEmployees()
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
      name: String(row['الاسم'] || row['name'] || ''),
      phone: String(row['رقم التليفون'] || row['phone'] || row['الرقم الوطني'] || row['national_id'] || ''),
      department: String(row['القسم'] || row['department'] || ''),
      role: String(row['الدور'] || row['role'] || 'ملاحظ'),
    })).filter(r => r.name)

    if (toInsert.length > 0) {
      await supabase.from('employees').insert(toInsert)
      await fetchEmployees()
    }

    setImporting(false)
    e.target.value = ''
  }

  function handleExportExcel() {
    const data = [
      [t('emp.col.name'), t('emp.col.phone'), t('emp.col.department'), t('emp.col.role')],
      ...employees.map(emp => [
        emp.name,
        emp.phone || '',
        emp.department || '',
        emp.role || 'ملاحظ',
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Employees')
    XLSX.writeFile(wb, 'employees.xlsx')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#3d3229' }}>
              <Users className="w-6 h-6" style={{ color: 'var(--teal)' }} /> {t('emp.title')}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{employees.length} {t('emp.count')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportExcel} className="btn-secondary" disabled={employees.length === 0}>
              <Download className="w-4 h-4" /> {t('emp.export')}
            </button>
            <label className={`btn-secondary cursor-pointer ${importing ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload className="w-4 h-4" />
              {importing ? t('emp.importing') : t('emp.import')}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={importing} />
            </label>
            <button onClick={openAdd} className="btn-primary">
              <Plus className="w-4 h-4" /> {t('emp.add')}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('emp.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--beige-200)' }}>
          {loading ? (
            <div className="p-12 text-center text-gray-400">{t('emp.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">{t('emp.empty')}</div>
          ) : (
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>{t('emp.col.num')}</th>
                  <th>{t('emp.col.name')}</th>
                  <th>{t('emp.col.phone')}</th>
                  <th>{t('emp.col.department')}</th>
                  <th>{t('emp.col.role')}</th>
                  <th>{t('emp.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <tr key={emp.id}>
                    <td className="text-gray-400 w-10">{i + 1}</td>
                    <td className="font-semibold text-gray-800">{emp.name}</td>
                    <td className="text-gray-600 text-xs">{emp.phone || '-'}</td>
                    <td className="text-gray-600">{emp.department || '-'}</td>
                    <td>
                      <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                        {emp.role || 'ملاحظ'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(emp)} className="text-blue-500 hover:text-blue-700 p-1">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(emp.id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <Footer />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-lg text-gray-900">
                {editingId ? t('emp.modal.edit') : t('emp.modal.add')}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('emp.modal.name')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder={t('emp.modal.name.placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('emp.modal.phone')}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                  placeholder={t('emp.modal.phone.placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('emp.modal.department')}</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  className="input-field"
                  placeholder={t('emp.modal.department.placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('emp.modal.role')}</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="input-field"
                >
                  <option value="ملاحظ">{t('role.observer')}</option>
                  <option value="رئيس لجنة">{t('role.head')}</option>
                  <option value="مساعد">{t('role.assistant')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                <Check className="w-4 h-4" />
                {saving ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}