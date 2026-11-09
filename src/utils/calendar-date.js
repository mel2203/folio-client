export function formatCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  if (!match) return '—'

  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

export function getTodayCalendarDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function getFirstDayOfMonth(date) {
  return `${date.slice(0, 7)}-01`
}
