export const arabicDays: Record<string, string> = {
  Sunday: 'الأحد',
  Monday: 'الاثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
  Friday: 'الجمعة',
  Saturday: 'السبت',
}

export function getArabicDay(dateStr: string): string {
  const date = new Date(dateStr)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  return arabicDays[dayName] || dayName
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatTime(timeStr: string): string {
  const [hStr, mStr] = timeStr.slice(0, 5).split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${ampm}`
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`
}

/**
 * Parse a date value from an Excel cell into YYYY-MM-DD format.
 * Handles:
 *  - null / undefined / empty string → null
 *  - Excel serial numbers (e.g. 46175 → 2026-06-01)
 *  - JS Date objects (from xlsx library with cellDates option)
 *  - ISO strings (2026-06-01T00:00:00.000Z)
 *  - YYYY-MM-DD strings
 *  - DD/MM/YYYY strings
 *  - MM/DD/YYYY strings (fallback when DD > 12 disambiguates)
 */
export function parseExcelDate(value: any): string | null {
  // Handle null / undefined / empty
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string' && value.trim() === '') return null

  // Handle JS Date objects
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null
    return formatDateToISO(value)
  }

  // Handle Excel serial number (a finite number, typically 1–2958465)
  if (typeof value === 'number' && isFinite(value)) {
    return excelSerialToDate(value)
  }

  const str = String(value).trim()

  // Check if it's a numeric string (Excel serial as string)
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10)
    if (num > 0 && num < 2958466) { // max Excel date serial
      return excelSerialToDate(num)
    }
  }

  // Try YYYY-MM-DD (ISO format)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str)
    if (!isNaN(d.getTime())) return formatDateToISO(d)
  }

  // Try DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (slashMatch) {
    const a = parseInt(slashMatch[1], 10)
    const b = parseInt(slashMatch[2], 10)
    const year = parseInt(slashMatch[3], 10)

    // If first part > 12, it must be DD/MM/YYYY
    if (a > 12 && b <= 12) {
      return buildDateString(year, b, a)
    }
    // If second part > 12, it must be MM/DD/YYYY
    if (b > 12 && a <= 12) {
      return buildDateString(year, a, b)
    }
    // Ambiguous — assume DD/MM/YYYY (more common in Arabic-locale contexts)
    if (a <= 12 && b <= 12) {
      return buildDateString(year, b, a)
    }
  }

  // Last resort: try native Date parsing
  const fallback = new Date(str)
  if (!isNaN(fallback.getTime())) return formatDateToISO(fallback)

  return null
}

/** Convert Excel serial number to YYYY-MM-DD. Accounts for the Lotus 1-2-3 leap year bug. */
function excelSerialToDate(serial: number): string | null {
  if (serial < 1) return null
  // Excel incorrectly treats 1900 as a leap year (Lotus 1-2-3 bug).
  // Serial 60 = Feb 29, 1900 (doesn't exist). Serials > 60 are off by 1 day.
  const adjusted = serial > 59 ? serial - 1 : serial
  // Excel epoch: Jan 1 1900 = serial 1 → JS Date for Dec 31 1899
  const epoch = new Date(Date.UTC(1899, 11, 31))
  const date = new Date(epoch.getTime() + adjusted * 86400000)
  if (isNaN(date.getTime())) return null
  return formatDateToISO(date)
}

/** Format a Date to YYYY-MM-DD string */
function formatDateToISO(d: Date): string {
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Build a YYYY-MM-DD string from parts, with validation */
function buildDateString(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Parse a time value from an Excel cell into HH:MM format.
 * Handles:
 *  - Excel serial time fractions (e.g. 0.458333 → "11:00", 0.75 → "18:00")
 *  - HH:MM or HH:MM:SS strings already in correct format
 *  - Date objects with time component
 *  - Numeric strings representing serial fractions
 *  - null/undefined → returns the provided fallback
 */
export function parseExcelTime(value: any, fallback: string = '10:00'): string {
  if (value === null || value === undefined || value === '') return fallback

  // Handle JS Date objects (xlsx library may return these)
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return fallback
    const h = String(value.getHours()).padStart(2, '0')
    const m = String(value.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }

  // Handle numbers — Excel stores time as a fraction of 24 hours
  if (typeof value === 'number' && isFinite(value)) {
    return excelSerialToTime(value)
  }

  const str = String(value).trim()

  // If it's already in HH:MM or HH:MM:SS format, return as-is (first 5 chars)
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const parts = str.split(':')
    const h = String(parseInt(parts[0], 10)).padStart(2, '0')
    const m = parts[1].padStart(2, '0')
    return `${h}:${m}`
  }

  // If it's a numeric string (decimal fraction), parse as Excel serial time
  const num = parseFloat(str)
  if (!isNaN(num) && isFinite(num)) {
    return excelSerialToTime(num)
  }

  // Fallback: try to extract time from a date-time string
  const dateAttempt = new Date(str)
  if (!isNaN(dateAttempt.getTime())) {
    const h = String(dateAttempt.getHours()).padStart(2, '0')
    const m = String(dateAttempt.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }

  return fallback
}

/** Convert an Excel serial time fraction to HH:MM string */
function excelSerialToTime(serial: number): string {
  // For date+time serials (e.g. 46175.458333), extract only the fractional part
  const fraction = serial % 1
  const totalMinutes = Math.round(fraction * 24 * 60)
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
