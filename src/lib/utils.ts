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
  // Convert "10:00:00" -> "10"
  return timeStr.slice(0, 5).replace(':00', '')
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`
}
