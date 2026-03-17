import { Employee, Committee, Assignment } from './supabase'
import { getArabicDay, formatDate } from './utils'

type ScheduleRow = Assignment & { committees: Committee }

export async function exportEmployeePDF(employee: Employee, rows: ScheduleRow[]) {
  const { default: jsPDF } = await import('jspdf')
  // @ts-ignore
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Add Unicode font support via base64 - use built-in for now
  doc.setFont('helvetica')

  // Header background
  doc.setFillColor(34, 197, 94)
  doc.rect(0, 0, 210, 35, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  
  // Title (right-to-left text)
  const title = `${employee.name}`
  doc.text(title, 200, 15, { align: 'right' })
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${employee.department || ''} | ${rows.length} sessions`, 200, 25, { align: 'right' })

  // Stats row
  doc.setFillColor(240, 253, 244)
  doc.rect(10, 40, 190, 20, 'F')
  doc.setTextColor(22, 163, 74)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  
  const mainCount = rows.filter(r => r.type === 'أساسي').length
  const backupCount = rows.filter(r => r.type === 'احتياطي').length
  doc.text(`Main: ${mainCount}  |  Backup: ${backupCount}  |  Total: ${rows.length}`, 105, 53, { align: 'center' })

  // Table
  const tableData = rows.map((r, i) => [
    i + 1,
    r.type === 'أساسي' ? 'Main' : 'Backup',
    `${r.committees.start_time.slice(0,5)}-${r.committees.end_time.slice(0,5)}`,
    r.committees.location || '',
    r.committees.college,
    r.committees.name,
    `${getArabicDay(r.committees.exam_date)} ${formatDate(r.committees.exam_date)}`,
  ])

  // @ts-ignore
  doc.autoTable({
    startY: 66,
    head: [['#', 'Type', 'Time', 'Location', 'College', 'Committee', 'Date']],
    body: tableData,
    styles: { fontSize: 9, halign: 'center' },
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 20 },
      2: { cellWidth: 25 },
      6: { cellWidth: 35 },
    },
    margin: { left: 10, right: 10 },
  })

  doc.save(`جدول_${employee.name}.pdf`)
}

export async function exportEmployeeExcel(employee: Employee, rows: ScheduleRow[]) {
  const XLSX = await import('xlsx')

  const data = [
    ['الموظف:', employee.name],
    ['القسم:', employee.department || ''],
    [''],
    ['اليوم', 'التاريخ', 'اسم اللجنة', 'الكلية', 'المكان', 'الوقت', 'النوع'],
    ...rows.map(r => [
      getArabicDay(r.committees.exam_date),
      formatDate(r.committees.exam_date),
      r.committees.name,
      r.committees.college,
      r.committees.location || '',
      `${r.committees.start_time.slice(0,5)} - ${r.committees.end_time.slice(0,5)}`,
      r.type,
    ])
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 18 },
    { wch: 15 }, { wch: 16 }, { wch: 10 }
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'الجدول')
  XLSX.writeFile(wb, `جدول_${employee.name}.xlsx`)
}

export async function exportAllScheduleExcel(
  employees: Employee[],
  allRows: Map<string, ScheduleRow[]>
) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryData = [
    ['اسم الموظف', 'القسم', 'عدد التكليفات', 'أساسي', 'احتياطي'],
    ...employees.map(emp => {
      const rows = allRows.get(emp.id) || []
      return [
        emp.name,
        emp.department || '',
        rows.length,
        rows.filter(r => r.type === 'أساسي').length,
        rows.filter(r => r.type === 'احتياطي').length,
      ]
    })
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'ملخص')

  // Each employee gets their own sheet
  employees.forEach(emp => {
    const rows = allRows.get(emp.id) || []
    if (rows.length === 0) return
    const data = [
      ['اليوم', 'التاريخ', 'اللجنة', 'الكلية', 'المكان', 'الوقت', 'النوع'],
      ...rows.map(r => [
        getArabicDay(r.committees.exam_date),
        formatDate(r.committees.exam_date),
        r.committees.name,
        r.committees.college,
        r.committees.location || '',
        `${r.committees.start_time.slice(0,5)} - ${r.committees.end_time.slice(0,5)}`,
        r.type,
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 16 }, { wch: 10 }]
    // Sheet name max 31 chars
    const sheetName = emp.name.slice(0, 28)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  })

  XLSX.writeFile(wb, 'جدول_توزيع_الملاحظين.xlsx')
}
