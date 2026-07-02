const RU_DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function formatDisplay(d: Date): string {
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`
}

export function formatDayShort(d: Date): string {
  return `${RU_DAYS[d.getDay()]} ${d.getDate()}`
}

export function formatYear(d: Date): string {
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function startOfWeekMon(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const result = new Date(d)
  result.setDate(d.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(d.getDate() + n)
  return result
}

export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7)
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function endOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}
