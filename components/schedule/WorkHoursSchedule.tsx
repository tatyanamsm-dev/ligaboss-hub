'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MopName, MopTimeSlot } from '@/types'

const DAYS = [
  { label: 'Пн', dow: 1 },
  { label: 'Вт', dow: 2 },
  { label: 'Ср', dow: 3 },
  { label: 'Чт', dow: 4 },
  { label: 'Пт', dow: 5 },
  { label: 'Сб', dow: 6 },
  { label: 'Вс', dow: 7 },
]

const ALL_SLOTS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00','18:00',
]

interface Props {
  mops: MopName[]
  selectedMop: MopName
  onSelectMop: (mop: MopName) => void
  readonly: boolean
}

export default function WorkHoursSchedule({ mops, selectedMop, onSelectMop }: Props) {
  const [slots, setSlots] = useState<MopTimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => { load() }, [selectedMop]) // eslint-disable-line

  async function load() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('mop_time_slots')
      .select('*')
      .eq('mop_name', selectedMop)
      .order('day_of_week')
      .order('time_start')
    if (error) setError('Ошибка загрузки: ' + error.message)
    else setSlots((data as MopTimeSlot[]) ?? [])
    setLoading(false)
  }

  function findSlot(dow: number, time: string) {
    return slots.find(s => s.day_of_week === dow && s.time_start.slice(0, 5) === time)
  }

  async function toggleSlot(dow: number, time: string) {
    setBusy(true)
    setError('')
    try {
      const existing = findSlot(dow, time)

      if (existing) {
        const newActive = !existing.active
        const { error } = await supabase
          .from('mop_time_slots')
          .update({ active: newActive })
          .eq('id', existing.id)

        if (error) {
          setError('Ошибка сохранения: ' + error.message)
        } else {
          setSlots(prev =>
            prev.map(s => s.id === existing.id ? { ...s, active: newActive } : s)
          )
        }
      } else {
        const { data, error } = await supabase
          .from('mop_time_slots')
          .insert({
            mop_name: selectedMop,
            day_of_week: dow,
            time_start: time + ':00',
            active: true,
          })
          .select()
          .single()

        if (error) setError('Ошибка создания слота: ' + error.message)
        else if (data) setSlots(prev => [...prev, data as MopTimeSlot])
      }
    } finally {
      setBusy(false)
    }
  }

  const activeCount = slots.filter(s => s.active).length

  return (
    <div>
      {mops.length > 1 && (
        <div className="mb-5 flex items-center gap-4">
          <select
            value={selectedMop}
            onChange={e => onSelectMop(e.target.value as MopName)}
            className="input max-w-xs"
          >
            {mops.map(m => <option key={m}>{m}</option>)}
          </select>
          {!loading && (
            <span className="text-sm text-gray-400">{activeCount} активных слотов</span>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Загружаем расписание...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Рабочие слоты — {selectedMop}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Отметьте в какие часы принимаете встречи по каждому дню недели
              </p>
            </div>
            {busy && <span className="text-xs text-blue-500 animate-pulse">Сохраняем...</span>}
          </div>

          <div className="p-5 overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-400 font-normal pb-3 pr-6 w-16">Время</th>
                  {DAYS.map(({ label, dow }) => (
                    <th key={dow} className={`text-center text-sm font-semibold pb-3 px-4 min-w-[60px] ${dow >= 6 ? 'text-red-400' : 'text-gray-700'}`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_SLOTS.map(time => (
                  <tr key={time} className="border-t border-gray-100">
                    <td className="py-2 pr-6 text-xs font-mono text-gray-500 whitespace-nowrap">{time}–{String(parseInt(time) + 1).padStart(2,'0')}:00</td>
                    {DAYS.map(({ dow }) => {
                      const slot = findSlot(dow, time)
                      const active = slot?.active ?? false
                      return (
                        <td key={dow} className="text-center py-2 px-4">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleSlot(dow, time)}
                            disabled={busy}
                            className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-wait"
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
