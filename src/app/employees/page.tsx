'use client'
import { useEffect, useState } from 'react'
import { supabase, Employee } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Plus, Search, Pencil, Trash2, X, Check, Users, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', national_id: '', department: '', role: 'ملاحظ' })
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
    (e.national_id || '').includes(search)
  )

  function openAdd() {
    setForm({ name: '', national_id: '', department: '', role: 'ملاحظ' })
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(emp: Employee) {
    setForm({ name: emp.name, national_id: emp.national_id || '', department: emp.department || '', role: emp.role || 'ملاحظ' })
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
    if (!confirm('هل تريد حذف هذا الموظف؟')) return
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
      national_id: String(row['الرقم الوطني'] || row['national_id'] || ''),
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" /> الموظفون
            </h1>
            <p className="text-gray-500 text-sm mt-1">{employees.length} موظف مسجل</p>
          </div>
          <div className="flex items-center gap-2">
            <label className={`btn-secondary cursor-pointer ${importing ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload className="w-4 h-4" />
              {importing ? 'جاري الاستيراد...' : 'استيراد Excel'}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={importing} />
            </label>
            <button onClick={openAdd} className="btn-primary">
              <Plus className="w-4 h-4" /> إضافة موظف
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو القسم..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">لا يوجد موظفون</div>
          ) : (
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم</th>
                  <th>الرقم الوطني</th>
                  <th>القسم / الكلية</th>
                  <th>الدور</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <tr key={emp.id}>
                    <td className="text-gray-400 w-10">{i + 1}</td>
                    <td className="font-semibold text-gray-800">{emp.name}</td>
                    <td className="text-gray-600 text-xs">{emp.national_id || '-'}</td>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-lg text-gray-900">
                {editingId ? 'تعديل موظف' : 'إضافة موظف جديد'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="مثال: محمد أحمد علي"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الرقم الوطني</label>
                <input
                  type="text"
                  value={form.national_id}
                  onChange={e => setForm({ ...form, national_id: e.target.value })}
                  className="input-field"
                  placeholder="اختياري"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">القسم / الكلية</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  className="input-field"
                  placeholder="مثال: كلية العلوم"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الدور</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="input-field"
                >
                  <option>ملاحظ</option>
                  <option>رئيس لجنة</option>
                  <option>مساعد</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                <Check className="w-4 h-4" />
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}