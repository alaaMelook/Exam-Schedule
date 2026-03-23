'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type Lang = 'ar' | 'en'

const translations = {
  // ─── Navbar ───
  'nav.logo': { ar: 'جدول الملاحظين', en: 'Observer Schedule' },
  'nav.home': { ar: 'الرئيسية', en: 'Dashboard' },
  'nav.employees': { ar: 'الموظفون', en: 'Employees' },
  'nav.committees': { ar: 'اللجان', en: 'Committees' },
  'nav.assignments': { ar: 'التوزيع', en: 'Assignments' },

  // ─── Home Page ───
  'home.title': { ar: 'جدول توزيع الملاحظين', en: 'Observer Distribution Schedule' },
  'home.subtitle': { ar: 'إدارة توزيع الملاحظين على اللجان الامتحانية', en: 'Manage observer distribution across exam committees' },
  'home.stat.employees': { ar: 'الموظفون', en: 'Employees' },
  'home.stat.committees': { ar: 'اللجان', en: 'Committees' },
  'home.stat.assignments': { ar: 'التكليفات', en: 'Assignments' },
  'home.stat.covered': { ar: 'لجان مغطاة', en: 'Covered' },
  'home.card.employees.title': { ar: 'إدارة الموظفين', en: 'Manage Employees' },
  'home.card.employees.desc': { ar: 'إضافة وتعديل بيانات الموظفين الملاحظين', en: 'Add and edit observer employee data' },
  'home.card.committees.title': { ar: 'إدارة اللجان', en: 'Manage Committees' },
  'home.card.committees.desc': { ar: 'إضافة اللجان والأماكن والأوقات', en: 'Add committees, locations, and times' },
  'home.card.assignments.title': { ar: 'توزيع الملاحظين', en: 'Assign Observers' },
  'home.card.assignments.desc': { ar: 'تكليف الموظفين على اللجان وتصدير الجداول', en: 'Assign employees to committees and export schedules' },

  // ─── Employees Page ───
  'emp.title': { ar: 'الموظفون', en: 'Employees' },
  'emp.count': { ar: 'موظف مسجل', en: 'registered employees' },
  'emp.add': { ar: 'إضافة موظف', en: 'Add Employee' },
  'emp.import': { ar: 'استيراد Excel', en: 'Import Excel' },
  'emp.importing': { ar: 'جاري الاستيراد...', en: 'Importing...' },
  'emp.export': { ar: 'تصدير Excel', en: 'Export Excel' },
  'emp.search': { ar: 'بحث بالاسم أو القسم...', en: 'Search by name or department...' },
  'emp.col.num': { ar: '#', en: '#' },
  'emp.col.name': { ar: 'الاسم', en: 'Name' },
  'emp.col.phone': { ar: 'رقم التليفون', en: 'Phone' },
  'emp.col.department': { ar: 'القسم / الكلية', en: 'Department' },
  'emp.col.role': { ar: 'الدور', en: 'Role' },
  'emp.col.actions': { ar: 'إجراءات', en: 'Actions' },
  'emp.loading': { ar: 'جاري التحميل...', en: 'Loading...' },
  'emp.empty': { ar: 'لا يوجد موظفون', en: 'No employees found' },
  'emp.modal.add': { ar: 'إضافة موظف جديد', en: 'Add New Employee' },
  'emp.modal.edit': { ar: 'تعديل موظف', en: 'Edit Employee' },
  'emp.modal.name': { ar: 'الاسم الكامل *', en: 'Full Name *' },
  'emp.modal.name.placeholder': { ar: 'مثال: محمد أحمد علي', en: 'e.g. Mohamed Ahmed Ali' },
  'emp.modal.phone': { ar: 'رقم التليفون', en: 'Phone Number' },
  'emp.modal.phone.placeholder': { ar: 'اختياري', en: 'Optional' },
  'emp.modal.department': { ar: 'القسم / الكلية', en: 'Department / College' },
  'emp.modal.department.placeholder': { ar: 'مثال: كلية العلوم', en: 'e.g. Faculty of Science' },
  'emp.modal.role': { ar: 'الدور', en: 'Role' },
  'emp.delete.confirm': { ar: 'هل تريد حذف هذا الموظف؟', en: 'Delete this employee?' },

  // ─── Roles ───
  'role.observer': { ar: 'ملاحظ', en: 'Observer' },
  'role.head': { ar: 'رئيس لجنة', en: 'Committee Head' },
  'role.assistant': { ar: 'مساعد', en: 'Assistant' },

  // ─── Committees Page ───
  'com.title': { ar: 'اللجان', en: 'Committees' },
  'com.count': { ar: 'لجنة مسجلة', en: 'registered committees' },
  'com.add': { ar: 'إضافة لجنة', en: 'Add Committee' },
  'com.import': { ar: 'استيراد Excel', en: 'Import Excel' },
  'com.importing': { ar: 'جاري الاستيراد...', en: 'Importing...' },
  'com.export': { ar: 'تصدير Excel', en: 'Export Excel' },
  'com.loading': { ar: 'جاري التحميل...', en: 'Loading...' },
  'com.empty': { ar: 'لا توجد لجان', en: 'No committees found' },
  'com.committee': { ar: 'لجنة', en: 'committee' },
  'com.col.name': { ar: 'اسم اللجنة', en: 'Committee Name' },
  'com.col.college': { ar: 'الكلية', en: 'College' },
  'com.col.location': { ar: 'المكان', en: 'Location' },
  'com.col.time': { ar: 'الوقت', en: 'Time' },
  'com.col.main': { ar: 'أساسي', en: 'Main' },
  'com.col.backup': { ar: 'احتياطي', en: 'Backup' },
  'com.col.actions': { ar: 'إجراءات', en: 'Actions' },
  'com.modal.add': { ar: 'إضافة لجنة جديدة', en: 'Add New Committee' },
  'com.modal.edit': { ar: 'تعديل لجنة', en: 'Edit Committee' },
  'com.modal.name': { ar: 'اسم اللجنة / الفرع *', en: 'Committee / Branch Name *' },
  'com.modal.name.placeholder': { ar: 'مثال: مدرج 1 يحيى', en: 'e.g. Hall 1 Yahya' },
  'com.modal.college': { ar: 'الكلية *', en: 'College *' },
  'com.modal.college.placeholder': { ar: 'مثال: كلية العلوم', en: 'e.g. Faculty of Science' },
  'com.modal.location': { ar: 'المكان', en: 'Location' },
  'com.modal.location.placeholder': { ar: 'مثال: مبنى أ', en: 'e.g. Building A' },
  'com.modal.date': { ar: 'تاريخ الامتحان *', en: 'Exam Date *' },
  'com.modal.start': { ar: 'وقت البداية', en: 'Start Time' },
  'com.modal.end': { ar: 'وقت النهاية', en: 'End Time' },
  'com.modal.main': { ar: 'عدد الملاحظين الأساسيين', en: 'Main Observers Count' },
  'com.modal.backup': { ar: 'عدد الملاحظين الاحتياطيين', en: 'Backup Observers Count' },
  'com.col.period': { ar: 'الفترة', en: 'Period' },
  'com.period.morning': { ar: '☀️ صباحي', en: '☀️ Morning' },
  'com.period.evening': { ar: '🌙 مسائي', en: '🌙 Evening' },
  'com.period.unknown': { ar: 'غير محدد', en: 'Unknown' },
  'com.settings.title': { ar: '⚙️ إعدادات الفترات', en: '⚙️ Period Settings' },
  'com.settings.morning': { ar: 'الفترة الصباحية', en: 'Morning Period' },
  'com.settings.evening': { ar: 'الفترة المسائية', en: 'Evening Period' },
  'com.settings.from': { ar: 'من', en: 'From' },
  'com.settings.to': { ar: 'إلى', en: 'To' },
  'com.settings.save': { ar: 'حفظ الإعدادات', en: 'Save Settings' },
  'com.settings.saved': { ar: 'تم الحفظ ✓', en: 'Saved ✓' },
  'com.settings.overlap': { ar: '⚠️ الفترات متداخلة!', en: '⚠️ Periods overlap!' },
  'com.delete.confirm': { ar: 'هل تريد حذف هذه اللجنة؟ سيتم حذف جميع التكليفات المرتبطة بها.', en: 'Delete this committee? All related assignments will also be deleted.' },

  // ─── Assignments Page ───
  'asg.title': { ar: 'جدول توزيع الملاحظين', en: 'Observer Distribution Schedule' },
  'asg.export': { ar: 'تصدير Excel', en: 'Export Excel' },
  'asg.auto': { ar: 'توزيع تلقائي', en: 'Auto Distribute' },
  'asg.addManual': { ar: 'إضافة يدوي', en: 'Add Manual' },
  'asg.stat.employees': { ar: 'الموظفون', en: 'Employees' },
  'asg.stat.assignments': { ar: 'التكليفات', en: 'Assignments' },
  'asg.stat.committees': { ar: 'اللجان', en: 'Committees' },
  'asg.stat.covered': { ar: 'لجان مغطاة', en: 'Covered' },
  'asg.view.byEmployee': { ar: 'عرض جدول كل موظف', en: 'View by Employee' },
  'asg.view.byDate': { ar: 'عرض حسب الموعد', en: 'View by Date' },
  'asg.clearAll': { ar: 'مسح كل التكليفات', en: 'Clear All' },
  'asg.clearAll.confirm': { ar: 'هل تريد حذف جميع التكليفات؟', en: 'Delete all assignments?' },
  'asg.searchEmp': { ar: 'بحث بالاسم...', en: 'Search by name...' },
  'asg.loading': { ar: 'جاري التحميل...', en: 'Loading...' },
  'asg.noObservers': { ar: 'لا يوجد ملاحظون مكلفون بعد', en: 'No observers assigned yet' },
  'asg.assigned': { ar: 'مكلف', en: 'Assigned' },
  'asg.type.main': { ar: 'أساسي', en: 'Main' },
  'asg.type.backup': { ar: 'احتياطي', en: 'Backup' },

  // ─── Manual Add Modal ───
  'asg.modal.title': { ar: 'إضافة تكليف يدوي', en: 'Add Manual Assignment' },
  'asg.modal.employee': { ar: 'الموظف *', en: 'Employee *' },
  'asg.modal.employee.placeholder': { ar: 'اختر الموظف', en: 'Select Employee' },
  'asg.modal.committee': { ar: 'اللجنة *', en: 'Committee *' },
  'asg.modal.committee.placeholder': { ar: 'اختر اللجنة', en: 'Select Committee' },
  'asg.modal.type': { ar: 'النوع', en: 'Type' },

  // ─── Auto Distribution Modal ───
  'asg.auto.title': { ar: 'التوزيع التلقائي', en: 'Auto Distribution' },
  'asg.auto.method': { ar: 'طريقة التوزيع', en: 'Distribution Method' },
  'asg.auto.sequential': { ar: 'بالتسلسل', en: 'Sequential' },
  'asg.auto.sequential.desc': { ar: 'يوازن الأعباء بين الموظفين', en: 'Balances workload between employees' },
  'asg.auto.random': { ar: 'عشوائي', en: 'Random' },
  'asg.auto.random.desc': { ar: 'توزيع عشوائي مع تجنب التعارض', en: 'Random with conflict avoidance' },
  'asg.auto.clearFirst': { ar: 'مسح التكليفات الحالية أولاً', en: 'Clear current assignments first' },
  'asg.auto.clearFirst.desc': { ar: 'سيتم حذف التكليفات القديمة قبل التوزيع الجديد', en: 'Old assignments will be deleted before new distribution' },
  'asg.auto.reserveCount': { ar: 'عدد الاحتياطيين', en: 'Reserve Count' },
  'asg.auto.reserveScope': { ar: 'نطاق الاحتياطي', en: 'Reserve Scope' },
  'asg.auto.reserveScope.desc': { ar: 'هل الاحتياطي للفترة ولا لليوم كله؟', en: 'Per period or full day?' },
  'asg.auto.notes': { ar: 'ملاحظات:', en: 'Notes:' },
  'asg.auto.note1': { ar: 'يراعي عدم تعارض مواعيد الموظف', en: 'Avoids employee time conflicts' },
  'asg.auto.note2': { ar: 'يوزع بحسب عدد الملاحظين المطلوب لكل لجنة', en: 'Distributes based on required observer count per committee' },
  'asg.auto.note3': { ar: 'يمكن التعديل يدوياً بعد التوزيع', en: 'You can edit manually after distribution' },
  'asg.auto.note4': { ar: 'الاحتياطيون يوزعون حسب العدد والنطاق المحدد', en: 'Reserves distributed based on specified count and scope' },
  'asg.auto.warnings': { ar: 'تحذيرات', en: 'Warnings' },
  'asg.auto.start': { ar: 'بدء التوزيع التلقائي', en: 'Start Auto Distribution' },
  'asg.auto.distributing': { ar: 'جاري التوزيع...', en: 'Distributing...' },

  // ─── Reserve Assignments ───
  'res.title': { ar: 'الاحتياطيون', en: 'Reserves' },
  'res.add': { ar: 'إضافة احتياطي', en: 'Add Reserve' },
  'res.modal.title': { ar: 'إضافة موظف احتياطي', en: 'Add Reserve Employee' },
  'res.modal.employee': { ar: 'الموظف *', en: 'Employee *' },
  'res.modal.employee.placeholder': { ar: 'اختر الموظف', en: 'Select Employee' },
  'res.modal.date': { ar: 'تاريخ الامتحان *', en: 'Exam Date *' },
  'res.modal.scope': { ar: 'النطاق', en: 'Scope' },
  'res.scope.morning': { ar: 'صباحي', en: 'Morning' },
  'res.scope.evening': { ar: 'مسائي', en: 'Evening' },
  'res.scope.fullday': { ar: 'يوم كامل', en: 'Full Day' },
  'res.noReserves': { ar: 'لا يوجد احتياطيون', en: 'No reserves assigned' },
  'res.stat.reserves': { ar: 'الاحتياطيون', en: 'Reserves' },

  // ─── Employee Schedule Card ───
  'card.sessions': { ar: 'إنسان الملحظين', en: 'Sessions' },
  'card.main': { ar: 'أساسي', en: 'Main' },
  'card.backup': { ar: 'احتياطي', en: 'Backup' },
  'card.noAssignments': { ar: 'لا توجد تكليفات لهذا الموظف', en: 'No assignments for this employee' },
  'card.col.day': { ar: 'اليوم', en: 'Day' },
  'card.col.branch': { ar: 'الفرع', en: 'Branch' },
  'card.col.time': { ar: 'الوقت', en: 'Time' },
  'card.col.location': { ar: 'المكان', en: 'Location' },
  'card.col.college': { ar: 'الكمال', en: 'College' },
  'card.col.type': { ar: 'النوع', en: 'Type' },

  // ─── Common ───
  'common.save': { ar: 'حفظ', en: 'Save' },
  'common.saving': { ar: 'جاري الحفظ...', en: 'Saving...' },
  'common.cancel': { ar: 'إلغاء', en: 'Cancel' },
} as const

type TranslationKey = keyof typeof translations

interface LanguageContextType {
  lang: Lang
  toggleLang: () => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ar',
  toggleLang: () => {},
  t: (key) => translations[key]?.ar || key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ar')

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar')
  }, [])

  const t = useCallback((key: TranslationKey): string => {
    return translations[key]?.[lang] || key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LanguageContext)
}
