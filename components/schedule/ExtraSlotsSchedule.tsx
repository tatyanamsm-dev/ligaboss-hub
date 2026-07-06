'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Save } from 'lucide-react'
import type { MopName } from '@/types'

const ALL_TIMES = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00','18:00',
]

interface ExtraSlot { id: string; mop_name: string; date: string; time_start: string }

interface Props {
  mops: MopName[]
  selectedMop: MopName
  onSelectMop: (mop: MopName) => void
}

function pad(n: number) { return String(n).padStart(2, '0') }
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

const RU_MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const RU_DAYS = ['вс','пн','вт','ср','чт','пт','сб']

export default function ExtraSlotsSchedule({ mops, selectedMop, onSelectMop }: Props) {
  const [date, setDate] = useState(todayStr())
  const [savedSlots, setSavedSlots] = useState<ExtraSlot[]>([])
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('mop_extra_slots')
      .select('*')
      .eq('mop_name', selectedMop)
      .eq('date', date)
      .order('time_start')
    if (error) { setError('Ошибка: ' + error.message); setLoading(false); return }
    const slots = (data as ExtraSlot[]) ?? []
    setSavedSlots(slots)
    setPending(new Set(slots.map(s => s.time_start.slice(0, 5))))
    setLoading(false)
  }, [selectedMop, date]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [load])

  function toggle(time: string) {
    setSaved(false)
    setPending(prev => {
      const next = new Set(prev)
      if (next.has(time)) next.delete(time); else next.add(time)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const savedTimes = new Set(savedSlots.map(s => s.time_start.slice(0, 5)))
      const toDelete = savedSlots.filter(s => !pending.has(s.time_start.slice(0, 5)))
      if (toDelete.length) {
        await supabase.from('mop_extra_slots').delete().in('id', toDelete.map(s => s.id))
      }
      const toAdd = [...pending].filter(t => !savedTimes.has(t))
      if (toAdd.length) {
        await supabase.from('mop_extra_slots').insert(
          toAdd.map(t => ({ mop_name: selectedMop, date, time_start: t + ':00' }))
        )
      }
      setSaved(true)
      await load()
    } catch {
      setError('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  async function clearAll() {
    setSaving(true)
    await supabase.from('mop_extra_slots').delete().eq('mop_name', selectedMop).eq('date', date)
    setSavedSlots([])
    setPending(new Set())
    setSaved(false)
    setSaving(false)
  }

  const isDirty = (() => {
    const s = new Set(savedSlots.map(sl => sl.time_start.slice(0, 5)))
    if (s.size !== pending.size) return true
    for (const t of s) if (!pending.has(t)) return true
    return false
  })()

  function formatDateLabel(d: string) {
    const dt = new Date(d + 'T00:00:00')
    return `${RU_DAYS[dt.getDay()]}, ${dt.getDate()} ${RU_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
  }

  return (
    <div className="space-y-5">
      {mops.length > 1 && (
        <div className="flex items-center gap-3">
          <select value={selectedMop} onChange={e => { onSelectMop(e.target.value as MopName); setSaved(false) }} className="input max-w-xs">
            {mops.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Подработка на дату — {selectedMop}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Разовые слоты, которые не повторяются каждую неделю</p>
          </div>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setSaved(false) }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Загружаем...</div>
        ) : (
          <div className="p-5">
            <p className="text-sm font-semibold text-gray-600 mb-4 capitalize">{formatDateLabel(date)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-5">
              {ALL_TIMES.map(time => {
                const on = pending.has(time)
                const wasSaved = savedSlots.some(s => s.time_start.slice(0,5) === time)
                const isNew = on && !wasSaved
                const isRemoved = !on && wasSaved
                return (
                  <button
                    key={time}
                    onClick={() => toggle(time)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition relative"
                    style={isRemoved
                      ? { background: '#fff1f2', borderColor: '#fca5a5', color: '#ef4444' }
                      : on
                        ? { background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' }
                        : { background: '#f9fafb', borderColor: '#e5e7eb', color: '#6b7280' }}
                  >
                    <span className="w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center"
                      style={on ? { background: '#22c55e', borderColor: '#22c55e' } : { borderColor: '#d1d5db' }}>
                      {on && <span className="text-white text-[8px] font-bold">✓</span>}
                    </span>
                    {time}
                    {isNew && <span className="absolute top-0.5 right-1 text-[9px] text-emerald-500 font-bold">новый</span>}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                {savedSlots.length > 0 && (
                  <button onClick={clearAll} disabled={saving}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition px-2 py-1 rounded hover:bg-red-50">
                    <Trash2 size={12} /> Очистить всё
                  </button>
                )}
                {saved && !isDirty && (
                  <span className="text-xs text-emerald-600 font-medium">✓ Сохранено</span>
                )}
              </div>
              <button
                onClick={save}
                disabled={saving || !isDirty}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition"
                style={isDirty
                  ? { background: 'var(--navy)', color: 'white' }
                  : { background: '#e5e7eb', color: '#9ca3af', cursor: 'default' }}
              >
                <Save size={14} />
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
