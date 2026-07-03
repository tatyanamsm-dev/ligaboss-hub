'use client'

import { useState } from 'react'

export type PeriodValue = 'today' | 'week' | 'month' | 'all' | 'custom'

interface PeriodOption {
  v: PeriodValue
  l: string
}

interface Props {
  period: PeriodValue
  onChange: (period: PeriodValue, from?: string, to?: string) => void
  options?: PeriodValue[]
}

const ALL_OPTIONS: PeriodOption[] = [
  { v: 'today', l: 'Сегодня' },
  { v: 'week', l: 'Неделя' },
  { v: 'month', l: 'Месяц' },
  { v: 'all', l: 'Все' },
  { v: 'custom', l: 'Период' },
]

export default function PeriodFilter({ period, onChange, options = ['week', 'month', 'all', 'custom'] }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)

  const visible = ALL_OPTIONS.filter(o => options.includes(o.v))

  function handlePeriod(v: PeriodValue) {
    if (v === 'custom') {
      onChange('custom', from, to)
    } else {
      onChange(v)
    }
  }

  function handleDateChange(newFrom: string, newTo: string) {
    setFrom(newFrom)
    setTo(newTo)
    if (period === 'custom') onChange('custom', newFrom, newTo)
  }

  return (
    <div className="flex flex-wrap gap-2 items-center self-start sm:self-auto">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {visible.map(o => (
          <button key={o.v} onClick={() => handlePeriod(o.v)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition"
            style={period === o.v
              ? { backgroundColor: 'var(--navy)', color: 'white' }
              : { color: '#6b7280' }}>
            {o.l}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={from}
            onChange={e => handleDateChange(e.target.value, to)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
          <span className="text-gray-400 text-sm">—</span>
          <input type="date" value={to}
            onChange={e => handleDateChange(from, e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
      )}
    </div>
  )
}
