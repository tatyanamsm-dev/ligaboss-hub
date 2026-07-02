'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, addDays } from '@/lib/dateUtils'
import type { MopName, WorkDayStatus, MopWorkDay } from '@/types'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAY_NAMES = ['пн','вт','ср','чт','пт','сб','вс']

type StatusConfig = {
  label: string
  color: string
  bg: string
  border: string
  icon: string
}

const STATUS_CONFIG: Record<WorkDayStatus, StatusConfig> = {
  working:  { label: 'Рабочий день', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-400', icon: '✓' },
  day_off:  { label: 'Выходной',     color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-300',  icon: '—' },
  sick:     { label: 'Больничный',   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-400',   icon: '✕' },
  vacation: { label: 'Отпуск',       color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-400',  icon: '+' },
  partial:  { label: 'Частичный день',color: 'text-yellow-600',bg: 'bg-yellow-50', border: 'border-yellow-400',icon: '◐' },
}

const STATUS_CYCLE: WorkDayStatus[] = ['working', 'day_off', 'sick', 'vacation', 'partial']

interface Props {
  mops: MopName[]
}

export default function WorkDaysCalendar({ mops }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [workDays, setWorkDays] = useState<MopWorkDay[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  // Смещение: первый день недели — Пн (0), остальные...
  const startOffset = (firstDay.getDay() + 6) % 7

  useEffect(() => {
    async function load() {
      const from = formatDate(firstDay)
      const to = formatDate(lastDay)
      const { data } = await supabase
        .from('mop_work_days')
        .select('*')
        .gte('date', from)
        .lte('date', to)
      setWorkDays((data as MopWorkDay[]) ?? [])
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  function getStatus(mop: MopName, day: number): WorkDayStatus {
    const dateStr = formatDate(new Date(year, month, day))
    const found = workDays.find(w => w.mop_name === mop && w.date === dateStr)
    if (found) return found.status
    // По умолчанию: Пн-Пт рабочий, Сб-Вс выходной
    const dow = new Date(year, month, day).getDay()
    return dow === 0 || dow === 6 ? 'day_off' : 'working'
  }

  async function toggleDay(mop: MopName, day: number) {
    const dateStr = formatDate(new Date(year, month, day))
    const current = getStatus(mop, day)
    const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length
    const next = STATUS_CYCLE[nextIdx]

    const key = `${mop}-${dateStr}`
    setSaving(key)

    await supabase.from('mop_work_days').upsert(
      { mop_name: mop, date: dateStr, status: next },
      { onConflict: 'mop_name,date' }
    )

    setWorkDays(prev => {
      const filtered = prev.filter(w => !(w.mop_name === mop && w.date === dateStr))
      return [...filtered, { id: key, mop_name: mop, date: dateStr, status: next }]
    })
    setSaving(null)
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div>
      {/* Легенда */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <span className="text-sm text-gray-500">Кликните по дню, чтобы переключить статус:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold ${cfg.bg} ${cfg.border} ${cfg.color}`}>
              {cfg.icon}
            </span>
            <span className="text-xs text-gray-600">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Навигация по месяцу */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500">‹</button>
          <h3 className="font-semibold text-gray-900">{MONTHS[month]} {year}</h3>
          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500">›</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 w-28">Менеджер</th>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = new Date(year, month, i + 1)
                  const dow = (d.getDay() + 6) % 7
                  const isToday = formatDate(d) === formatDate(new Date())
                  return (
                    <th key={i} className={`text-center text-xs w-9 py-2 ${dow >= 5 ? 'text-red-400' : 'text-gray-500'}`}>
                      <div className={`font-normal ${isToday ? 'text-blue-600 font-bold' : ''}`}>{DAY_NAMES[dow]}</div>
                      <div className={`font-semibold ${isToday ? 'text-blue-600' : ''}`}>{i + 1}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mops.map(mop => (
                <tr key={mop} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2 font-medium text-gray-800">{mop}</td>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1
                    const dateStr = formatDate(new Date(year, month, day))
                    const key = `${mop}-${dateStr}`
                    const status = getStatus(mop, day)
                    const cfg = STATUS_CONFIG[status]
                    const isSaving = saving === key
                    return (
                      <td key={i} className="text-center py-1.5">
                        <button
                          onClick={() => toggleDay(mop, day)}
                          disabled={!!saving}
                          title={cfg.label}
                          className={`w-7 h-7 rounded border-2 flex items-center justify-center mx-auto text-xs font-bold transition hover:opacity-80 ${cfg.bg} ${cfg.border} ${cfg.color} ${isSaving ? 'opacity-50' : ''}`}
                        >
                          {cfg.icon}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
