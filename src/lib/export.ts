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

// Shared helper: build one section (page) for an employee
async function buildDocxSection(employee: Employee, rows: ScheduleRow[], docxLib: any) {
  const {
    Paragraph, Table, TableRow, TableCell,
    TextRun, ImageRun, AlignmentType, WidthType, BorderStyle,
    VerticalAlign, ShadingType,
  } = docxLib

  // Fetch university logo
  let logoData: Uint8Array | null = null
  try {
    const logoResponse = await fetch('/university-logo.png')
    if (logoResponse.ok) {
      const logoBuffer = await logoResponse.arrayBuffer()
      logoData = new Uint8Array(logoBuffer)
    }
  } catch { /* logo not found, skip */ }

  const sorted = [...rows].sort((a, b) => a.committees.exam_date.localeCompare(b.committees.exam_date))

  const thinBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  }

  // Column widths in twips - RTL order: مكان اللجنة، كنترول، الساعة، التاريخ، اليوم، م
  const colWidths = [3138, 1400, 1800, 1500, 1200, 600]

  function cell(text: string, colIdx: number, opts?: { bold?: boolean; shading?: string }) {
    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: opts?.bold, size: 20, font: 'Cairo' })],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { before: 40, after: 40 },
        }),
      ],
      borders: thinBorder,
      verticalAlign: VerticalAlign.CENTER,
      width: { size: colWidths[colIdx], type: WidthType.DXA },
      shading: opts?.shading ? { type: ShadingType.SOLID, color: opts.shading, fill: opts.shading } : undefined,
    })
  }

  const headerRow = new TableRow({
    children: [
      cell('مكان اللجنة', 0, { bold: true, shading: 'D9E2F3' }),
      cell('كنترول', 1, { bold: true, shading: 'D9E2F3' }),
      cell('الساعة', 2, { bold: true, shading: 'D9E2F3' }),
      cell('التاريخ', 3, { bold: true, shading: 'D9E2F3' }),
      cell('اليوم', 4, { bold: true, shading: 'D9E2F3' }),
      cell('م', 5, { bold: true, shading: 'D9E2F3' }),
    ],
  })

  const dataRows = sorted.map((r, i) =>
    new TableRow({
      children: [
        cell(`${r.committees.name} - ${r.committees.college}`, 0),
        cell(r.type, 1),
        cell(`${r.committees.start_time.slice(0, 5)} - ${r.committees.end_time.slice(0, 5)}`, 2),
        cell(formatDate(r.committees.exam_date), 3),
        cell(getArabicDay(r.committees.exam_date), 4),
        cell(String(i + 1), 5),
      ],
    })
  )

  const table = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 9638, type: WidthType.DXA },
    layout: 'fixed' as any,
    visuallyRightToLeft: true,
  })

  const notes = [
    '1. التواجد في التوزيع قبل موعد اللجنة بساعة.',
    '2. حضور اللجنة بين الملاحظين لا يتم عن طريق تبديل الإداعة والمراقبة الخيرة.',
    '3. في حالة التعذر عن حضور لجنة أو التأخير عن ميعادها سيعرض الملاحظ للمساءلة القانونية.',
  ]

  // No-border style for header layout table
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  }

  return {
    properties: {
      page: {
        margin: { top: 720, bottom: 720, right: 720, left: 720 },
      },
      bidi: true,
    },
    children: [
      // Header: Logo + Title side by side (RTL: logo on right, title on left)
      new Table({
        rows: [
          new TableRow({
            children: [
              // Logo cell (appears on right in RTL)
              new TableCell({
                children: [
                  ...(logoData ? [new Paragraph({
                    children: [
                      new ImageRun({
                        data: logoData,
                        transformation: { width: 80, height: 80 },
                        type: 'png',
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                  })] : [new Paragraph({ children: [] })]),
                ],
                borders: noBorder,
                verticalAlign: VerticalAlign.CENTER,
                width: { size: 1500, type: WidthType.DXA },
              }),
              // Title cell (appears on left in RTL)
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'جدول لجان الملاحظة للفصل الدراسي الأول ( خريف ) للعام الأكاديمي 2025-2026 م',
                        bold: true, size: 24, font: 'Cairo',
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                    bidirectional: true,
                    spacing: { before: 100, after: 100 },
                    border: {
                      top: { style: BorderStyle.SINGLE, size: 2, color: '4472C4' },
                      bottom: { style: BorderStyle.SINGLE, size: 2, color: '4472C4' },
                      left: { style: BorderStyle.SINGLE, size: 2, color: '4472C4' },
                      right: { style: BorderStyle.SINGLE, size: 2, color: '4472C4' },
                    },
                  }),
                ],
                borders: noBorder,
                verticalAlign: VerticalAlign.CENTER,
                width: { size: 8138, type: WidthType.DXA },
              }),
            ],
          }),
        ],
        width: { size: 9638, type: WidthType.DXA },
        layout: 'fixed' as any,
        visuallyRightToLeft: true,
      }),

      // Employee name
      new Paragraph({
        children: [
          new TextRun({ text: 'اسم الملاحظ / ', size: 24, font: 'Cairo' }),
          new TextRun({ text: employee.name, bold: true, size: 26, font: 'Cairo' }),
        ],
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { before: 300, after: 300 },
      }),

      // Table
      table,

      // Notes
      new Paragraph({
        children: [new TextRun({ text: '~ تعليمات هامة ~', bold: true, size: 22, font: 'Cairo' })],
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { before: 400, after: 200 },
      }),
      ...notes.map(note =>
        new Paragraph({
          children: [new TextRun({ text: '\u200F' + note, size: 20, font: 'Cairo' })],
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 60 },
        })
      ),

      // Signatures
      new Paragraph({ spacing: { before: 500 }, children: [] }),
      new Table({
        rows: [
          new TableRow({
            children: ['لجنة الإمتحان', 'أمين عام الجامعة المكلف', 'نائب رئيس الجامعة المكلف'].map(label =>
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: label, bold: true, size: 20, font: 'Cairo' })],
                  alignment: AlignmentType.CENTER, bidirectional: true, spacing: { before: 40, after: 40 },
                })],
                borders: thinBorder,
                width: { size: 3213, type: WidthType.DXA },
              })
            ),
          }),
          new TableRow({
            children: [1, 2, 3].map(() =>
              new TableCell({
                children: [new Paragraph({ children: [], spacing: { before: 200, after: 200 } })],
                borders: thinBorder,
                width: { size: 3213, type: WidthType.DXA },
              })
            ),
          }),
        ],
        width: { size: 9638, type: WidthType.DXA },
        layout: 'fixed' as any,
        visuallyRightToLeft: true,
      }),
    ],
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Export single employee as .docx
export async function exportEmployeeDocx(employee: Employee, rows: ScheduleRow[]) {
  const docxLib = await import('docx')
  const { Document, Packer } = docxLib
  const section = await buildDocxSection(employee, rows, docxLib)
  const doc = new Document({ sections: [section] })
  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `جدول_${employee.name}.docx`)
}

// Export ALL employees as one .docx (each employee = separate page)
export async function exportAllDocx(
  employees: Employee[],
  allRows: Map<string, ScheduleRow[]>
) {
  const docxLib = await import('docx')
  const { Document, Packer } = docxLib

  const sections = []
  for (const emp of employees) {
    const rows = allRows.get(emp.id) || []
    if (rows.length === 0) continue
    const section = await buildDocxSection(emp, rows, docxLib)
    sections.push(section)
  }

  if (sections.length === 0) return

  const doc = new Document({ sections })
  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, 'جدول_توزيع_الملاحظين.docx')
}

