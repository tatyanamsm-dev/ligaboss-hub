'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Pencil, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, startOfMonth, endOfMonth } from '@/lib/dateUtils'
import type { Meeting, MopName, UserRole, MopWorkDay, MopTimeSlot, WorkDayStatus } from '@/types'
import MeetingModal from './MeetingModal'

const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']

const MOP_COLORS: Record<MopName, { badge: string; slot: string; dot: string }> = {
  'Владимир': {
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    slot: 'border-blue-300 bg-blue-50/80 hover:bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  'Анастасия': {
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    slot: 'border-purple-300 bg-purple-50/80 hover:bg-purple-100 text-purple-700',
    dot: 'bg-purple-500',
  },
  'Ксения': {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    slot: 'border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
}

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  'Назначен':                   { dot: 'bg-gray-400',    label: 'text-gray-600' },
  'Подтвердил':                 { dot: 'bg-blue-500',    label: 'text-blue-700' },
  'Произошёл':                  { dot: 'bg-emerald-500', label: 'text-emerald-700' },
  'Пообщались по телефону':     { dot: 'bg-emerald-400', label: 'text-emerald-600' },
  'Перенос в день встречи':     { dot: 'bg-orange-400',  label: 'text-orange-700' },
  'Перенос до дня встречи':     { dot: 'bg-orange-300',  label: 'text-orange-600' },
  'Игнор в день встречи':       { dot: 'bg-red-400',     label: 'text-red-700' },
  'Отменил':                    { dot: 'bg-red-500',     label: 'text-red-700' },
  'Отменил (в день встречи)':   { dot: 'bg-red-500',     label: 'text-red-700' },
  'Отменил (до дня встречи)':   { dot: 'bg-red-400',     label: 'text-red-700' },
  'По нашей причине':           { dot: 'bg-red-600',     label: 'text-red-800' },
}

function getCardColor(meeting: Meeting): { bg: string; border: string; bar: string } {
  const r = meeting.result
  const s = meeting.status
  if (r === 'Купил во время встречи' || r === 'Купил после встречи')
    return { bg: '#f0fdf4', border: '#86efac', bar: '#22c55e' }
  if (r === 'Отказался')
    return { bg: '#fff1f2', border: '#fca5a5', bar: '#ef4444' }
  if (r === 'Думает' || r === 'Ожидает КП')
    return { bg: '#fefce8', border: '#fde047', bar: '#eab308' }
  if (s === 'Перенос в день встречи' || s === 'Перенос до дня встречи')
    return { bg: '#fff7ed', border: '#fdba74', bar: '#f97316' }
  if (s === 'Отменил' || s === 'Отменил (в день встречи)' || s === 'Отменил (до дня встречи)' || s === 'Игнор в день встречи' || s === 'По нашей причине')
    return { bg: '#fff1f2', border: '#fca5a5', bar: '#ef4444' }
  if (s === 'Пообщались по телефону' || s === 'Произошёл')
    return { bg: '#fefce8', border: '#fde047', bar: '#eab308' }
  return { bg: '#ffffff', border: '#e5e7eb', bar: '#d1d5db' }
}

function getResultStyle(result: string | null): React.CSSProperties {
  if (!result) return {}
  if (result.startsWith('Купил')) return { background: '#dcfce7', color: '#15803d' }
  if (result === 'Отказался') return { background: '#fee2e2', color: '#dc2626' }
  return { background: '#fef9c3', color: '#a16207' }
}

function getStatusStyle(status: string): React.CSSProperties {
  if (status === 'Произошёл' || status === 'Пообщались по телефону') return { background: '#d1fae5', color: '#065f46' }
  if (status.startsWith('Перенос')) return { background: '#ffedd5', color: '#c2410c' }
  if (status === 'Отменил' || status === 'Отменил (в день встречи)' || status === 'Отменил (до дня встречи)' || status === 'Игнор в день встречи' || status === 'По нашей причине') return { background: '#fee2e2', color: '#dc2626' }
  if (status === 'Подтвердил') return { background: '#dbeafe', color: '#1d4ed8' }
  return { background: '#f3f4f6', color: '#6b7280' }
}

const WORKDAY_LABEL: Record<WorkDayStatus, string> = {
  working:  '',
  day_off:  'Выходной',
  sick:     'Больничный',
  vacation: 'Отпуск',
  partial:  'Частичный',
}

const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const RU_DAYS_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

interface Props {
  userRole: UserRole
  userMopName: MopName | null
}

export default function CalendarView({ userRole, userMopName }: Props) {
  const [baseDate, setBaseDate] = useState(new Date())
  const [expandedDay, setExpandedDay] = useState<string>(formatDate(new Date()))
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [workDays, setWorkDays] = useState<MopWorkDay[]>([])
  const [timeSlots, setTimeSlots] = useState<MopTimeSlot[]>([])
  const [extraSlots, setExtraSlots] = useState<{ mop_name: string; date: string; time_start: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{
    open: boolean; meeting?: Meeting; date?: string; time?: string; mop?: MopName
  }>({ open: false })

  const supabase = createClient()
  const visibleMops = userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])

  const monthStart = startOfMonth(baseDate)
  const monthEnd = endOfMonth(baseDate)
  const days: Date[] = []
  let d = new Date(monthStart)
  while (d <= monthEnd) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const from = formatDate(monthStart)
      const to = formatDate(monthEnd)
      const [mRes, wRes, sRes, eRes] = await Promise.all([
        supabase.from('meetings').select('*').gte('date', from).lte('date', to),
        supabase.from('mop_work_days').select('*').gte('date', from).lte('date', to),
        supabase.from('mop_time_slots').select('*').in('mop_name', visibleMops),
        supabase.from('mop_extra_slots').select('*').in('mop_name', visibleMops).gte('date', from).lte('date', to),
      ])
      setMeetings((mRes.data as Meeting[]) ?? [])
      setWorkDays((wRes.data as MopWorkDay[]) ?? [])
      setTimeSlots((sRes.data as MopTimeSlot[]) ?? [])
      setExtraSlots((eRes.data as { mop_name: string; date: string; time_start: string }[]) ?? [])
    } finally {
      if (!silent) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDate])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const interval = setInterval(() => loadData(true), 20000)
    return () => clearInterval(interval)
  }, [loadData])

  function getWorkDayStatus(mop: MopName, dateStr: string): WorkDayStatus {
    const found = workDays.find(w => w.mop_name === mop && w.date === dateStr)
    if (found) return found.status
    const dow = new Date(dateStr + 'T00:00:00').getDay()
    return dow === 0 || dow === 6 ? 'day_off' : 'working'
  }

  function getActiveSlots(mop: MopName, dateStr: string): string[] {
    const dow = new Date(dateStr + 'T00:00:00').getDay()
    const dayOfWeek = dow === 0 ? 7 : dow
    const regular = timeSlots
      .filter(s => s.mop_name === mop && s.day_of_week === dayOfWeek && s.active)
      .map(s => s.time_start.slice(0, 5))
    const extra = extraSlots
      .filter(s => s.mop_name === mop && s.date === dateStr)
      .map(s => s.time_start.slice(0, 5))
    return [...new Set([...regular, ...extra])].sort()
  }

  function isGhost(m: Meeting) {
    return m.is_transferred
      || m.status === 'Игнор в день встречи'
      || m.status === 'Перенос до дня встречи'
      || m.status === 'Перенос в день встречи'
      || m.status === 'Отменил'
      || m.status === 'Отменил (в день встречи)'
      || m.status === 'Отменил (до дня встречи)'
      || m.status === 'По нашей причине'
      || meetings.some(m2 => m2.original_meeting_id === m.id)
  }

  function getActiveMeeting(mop: MopName, date: string, time: string) {
    return meetings.find(m =>
      m.mop_name === mop && m.date === date && m.time_slot === time + ':00' && !isGhost(m)
    ) ?? null
  }

  function getGhostMeetings(mop: MopName, date: string, time: string) {
    return meetings.filter(m =>
      m.mop_name === mop && m.date === date && m.time_slot === time + ':00' && isGhost(m)
    )
  }

  function getMeetingCount(dateStr: string) {
    return meetings.filter(m => m.date === dateStr && !isGhost(m)).length
  }

  function getAllSlotsForDay(dateStr: string): string[] {
    const fromSlots = visibleMops.flatMap(mop => getActiveSlots(mop, dateStr))
    const fromMeetings = meetings
      .filter(m => m.date === dateStr && visibleMops.includes(m.mop_name as MopName))
      .map(m => m.time_slot.slice(0, 5))
    return [...new Set([...fromSlots, ...fromMeetings])].sort()
  }

  const todayStr = formatDate(new Date())

  return (
    <div className="flex flex-col h-full">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 md:px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>Общий календарь встреч</h2>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button onClick={() => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold min-w-[140px] text-center" style={{ color: 'var(--navy)' }}>
            {RU_MONTHS[baseDate.getMonth()]} {baseDate.getFullYear()}
          </span>
          <button onClick={() => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => { setBaseDate(new Date()); setExpandedDay(todayStr) }}
            className="ml-2 px-3 py-1.5 text-sm rounded-lg font-medium transition hover:opacity-80"
            style={{ backgroundColor: 'var(--gold)', color: 'white' }}
          >
            Сегодня
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">Загружаем данные...</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Полоса дней */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm overflow-x-auto">
            <div className="flex">
              {days.map(day => {
                const dateStr = formatDate(day)
                const isToday = dateStr === todayStr
                const isExpanded = dateStr === expandedDay
                const count = getMeetingCount(dateStr)
                const dow = day.getDay()
                const isWeekend = dow === 0 || dow === 6

                return (
                  <button
                    key={dateStr}
                    onClick={() => setExpandedDay(isExpanded ? '' : dateStr)}
                    className="flex flex-col items-center px-3 py-2.5 min-w-[52px] border-r border-gray-100 transition relative"
                    style={isExpanded
                      ? { backgroundColor: 'var(--navy)', color: 'white' }
                      : isToday
                      ? { backgroundColor: 'var(--cream)' }
                      : {}}
                  >
                    <span className={`text-[10px] font-medium ${isExpanded ? 'text-white/60' : isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
                      {RU_DAYS_SHORT[dow]}
                    </span>
                    <span className={`text-lg font-bold leading-none mt-0.5 ${isExpanded ? 'text-white' : isToday ? '' : isWeekend ? 'text-red-500' : 'text-gray-800'}`}
                      style={isToday && !isExpanded ? { color: 'var(--gold)' } : {}}>
                      {day.getDate()}
                    </span>
                    {count > 0 ? (
                      <span className={`text-[10px] mt-1 font-semibold rounded-full px-1.5 py-0.5 ${isExpanded ? 'bg-white/20 text-white' : ''}`}
                        style={!isExpanded ? { backgroundColor: 'var(--gold)', color: 'white' } : {}}>
                        {count}
                      </span>
                    ) : <span className="h-4 mt-1" />}
                    {isExpanded && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: 'var(--gold)' }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Раскрытый день */}
          {expandedDay && (() => {
            const slots = getAllSlotsForDay(expandedDay)
            const dayDate = new Date(expandedDay + 'T00:00:00')
            const dow = dayDate.getDay()
            const dayLabel = `${RU_DAYS_SHORT[dow]}, ${dayDate.getDate()} ${RU_MONTHS[dayDate.getMonth()]}`

            return (
              <div className="p-3 md:p-5">
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--gold)' }}>
                  {dayLabel}
                </h3>

                {slots.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                    Нет активных слотов на этот день.<br />
                    <span className="text-sm">Настройте расписание в разделе &quot;Расписание МОПов&quot;</span>
                  </div>
                ) : (
                  <>
                    {/* МОБИЛЬНЫЙ вид — МОПы вертикально */}
                    <div className="md:hidden space-y-4">
                      {visibleMops.map(mop => {
                        const activeSlots = getActiveSlots(mop, expandedDay)
                        const meetingTimes = meetings
                          .filter(m => m.mop_name === mop && m.date === expandedDay)
                          .map(m => m.time_slot.slice(0, 5))
                        const mopSlots = [...new Set([...activeSlots, ...meetingTimes])].sort()
                        const wdStatus = getWorkDayStatus(mop, expandedDay)
                        const hasAnyExtraSlot = extraSlots.some(s => s.mop_name === mop && s.date === expandedDay)
                        const effectivelyWorking = wdStatus === 'working' || hasAnyExtraSlot
                        return (
                          <div key={mop} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" style={{ backgroundColor: 'var(--cream)' }}>
                              <span className={`w-2.5 h-2.5 rounded-full ${MOP_COLORS[mop].dot}`} />
                              <span className="font-bold text-base" style={{ color: 'var(--navy)' }}>{mop}</span>
                              {wdStatus !== 'working' && (
                                <span className="ml-auto text-xs text-gray-400 italic">{WORKDAY_LABEL[wdStatus]}</span>
                              )}
                            </div>
                            {!effectivelyWorking ? (
                              <div className="px-4 py-6 text-center text-gray-400 text-sm italic">{WORKDAY_LABEL[wdStatus]}</div>
                            ) : mopSlots.length === 0 ? (
                              <div className="px-4 py-6 text-center text-gray-400 text-sm">Нет слотов</div>
                            ) : (
                              <div className="divide-y divide-gray-100">
                                {mopSlots.map(time => {
                                  const activeMeeting = getActiveMeeting(mop, expandedDay, time)
                                  const ghosts = getGhostMeetings(mop, expandedDay, time)
                                  return (
                                    <div key={time} className="flex gap-3 px-4 py-3 items-start">
                                      <span className="text-sm font-mono font-bold text-gray-500 w-12 pt-0.5 flex-shrink-0">{time}</span>
                                      <div className="flex-1 min-w-0 space-y-1.5">
                                        {ghosts.map(g => (
                                          <div key={g.id} onClick={() => setModal({ open: true, meeting: g, date: expandedDay, time, mop })}
                                            className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2 cursor-pointer opacity-60">
                                            <span className="text-xs font-semibold text-gray-500 line-through">{g.client_name}</span>
                                            <span className="ml-2 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
                                              {g.is_transferred ? 'Перенесён' : g.status}
                                            </span>
                                          </div>
                                        ))}
                                        {activeMeeting ? (
                                          (() => { const c = getCardColor(activeMeeting); return (
                                          <div
                                            onClick={() => setModal({ open: true, meeting: activeMeeting, date: expandedDay, time, mop })}
                                            className="rounded-xl border cursor-pointer flex gap-2.5"
                                            style={{ background: c.bg, borderColor: c.border }}
                                          >
                                            <div className="w-1 rounded-l-xl flex-shrink-0 self-stretch" style={{ background: c.bar }} />
                                            <div className="flex-1 min-w-0 py-2.5 pr-2.5 space-y-1.5">
                                              <div>
                                                <div className="font-bold text-sm" style={{ color: 'var(--navy)' }}>
                                                  {activeMeeting.client_name}
                                                  {activeMeeting.is_repeated && <span className="ml-2 text-[9px] px-1 py-0.5 rounded-full font-semibold" style={{ background: '#fef3c7', color: '#92400e' }}>Повторная</span>}
                                                </div>
                                                <div className="text-[11px] text-gray-500">{activeMeeting.client_phone}</div>
                                              </div>
                                              <div>
                                                <span className="text-[10px] text-gray-400">Статус: </span>
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={getStatusStyle(activeMeeting.status)}>
                                                  {activeMeeting.status}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-[10px] text-gray-400">Результат: </span>
                                                {activeMeeting.result ? (
                                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={getResultStyle(activeMeeting.result)}>
                                                    {activeMeeting.result}
                                                  </span>
                                                ) : (
                                                  <span className="text-[11px] text-gray-300 italic">не указан</span>
                                                )}
                                              </div>
                                              <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(0,0,0,0.04)' }}>
                                                <span className="text-[10px] text-gray-400">Комментарий: </span>
                                                <span className="text-[11px] text-gray-500">
                                                  {activeMeeting.comment_mop || <span className="italic text-gray-300">не заполнен</span>}
                                                </span>
                                              </div>
                                              {activeMeeting.bitrix_link && (
                                                <a
                                                  href={activeMeeting.bitrix_link}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={e => e.stopPropagation()}
                                                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg w-fit"
                                                  style={{ background: '#dbeafe', color: '#1d4ed8' }}
                                                >
                                                  <ExternalLink size={10} /> Bitrix24
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                          )})()
                                        ) : (
                                          <button onClick={() => setModal({ open: true, date: expandedDay, time, mop })}
                                            className={`w-full rounded-xl border-2 border-dashed py-3 flex items-center justify-center gap-1.5 text-sm font-medium ${MOP_COLORS[mop].slot}`}>
                                            <Plus size={14} /> Записать
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* ДЕСКТОПНЫЙ вид — таблица */}
                    <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
                      <div className="grid border-b border-gray-100"
                        style={{ gridTemplateColumns: `72px repeat(${visibleMops.length}, 1fr)` }}>
                        <div className="border-r border-gray-100 bg-gray-50" />
                        {visibleMops.map(mop => (
                          <div key={mop} className="px-4 py-3 text-center border-r border-gray-100 last:border-0 bg-gray-50">
                            <div className="flex items-center justify-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${MOP_COLORS[mop].dot}`} />
                              <span className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{mop}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {slots.map((time, idx) => (
                        <div key={time}
                          className={`grid ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-100 last:border-0`}
                          style={{ gridTemplateColumns: `72px repeat(${visibleMops.length}, 1fr)` }}>
                          <div className="flex items-center justify-center border-r border-gray-100 py-2.5">
                            <span className="text-xs font-mono font-semibold text-gray-500">{time}</span>
                          </div>
                          {visibleMops.map(mop => {
                            const wdStatus = getWorkDayStatus(mop, expandedDay)
                            const hasExtraSlot = extraSlots.some(s => s.mop_name === mop && s.date === expandedDay && s.time_start.slice(0,5) === time)
                            const hasSlot = getActiveSlots(mop, expandedDay).includes(time)
                            const activeMeeting = getActiveMeeting(mop, expandedDay, time)
                            const ghosts = getGhostMeetings(mop, expandedDay, time)
                            const isOffWithoutExtra = wdStatus !== 'working' && !hasExtraSlot
                            const forceMajeurMeeting = isOffWithoutExtra
                              ? meetings.find(m => m.mop_name === mop && m.date === expandedDay && m.time_slot === time + ':00' && !isGhost(m))
                              : undefined
                            return (
                              <div key={mop} className="p-2 border-r border-gray-100 last:border-0 space-y-1.5">
                                {isOffWithoutExtra && forceMajeurMeeting ? (
                                  <div
                                    className="rounded-xl border-2 cursor-pointer p-2 space-y-1"
                                    style={{ borderColor: '#ef4444', background: '#fff1f2' }}
                                    onClick={() => setModal({ open: true, meeting: forceMajeurMeeting, date: expandedDay, time, mop })}
                                  >
                                    <div className="text-[10px] font-bold text-red-600 uppercase tracking-wide">⚠ Требует переноса</div>
                                    <div className="text-xs font-semibold text-red-700">{forceMajeurMeeting.client_name}</div>
                                    <div className="text-[10px] text-red-500">{forceMajeurMeeting.client_phone}</div>
                                  </div>
                                ) : isOffWithoutExtra ? (
                                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-2.5 text-center">
                                    <span className="text-xs text-gray-400 italic">{WORKDAY_LABEL[wdStatus]}</span>
                                  </div>
                                ) : !hasSlot ? (
                                  activeMeeting ? (
                                    <div
                                      className="rounded-xl border-2 cursor-pointer p-2 space-y-1"
                                      style={{ borderColor: '#ef4444', background: '#fff1f2' }}
                                      onClick={() => setModal({ open: true, meeting: activeMeeting, date: expandedDay, time, mop })}
                                    >
                                      <div className="text-[10px] font-bold text-red-600 uppercase tracking-wide">⚠ Слот не активен</div>
                                      <div className="text-xs font-semibold text-red-700">{activeMeeting.client_name}</div>
                                    </div>
                                  ) : (
                                    <div className="rounded-lg py-2.5" />
                                  )
                                ) : (
                                  <>
                                    {ghosts.map(g => (
                                      <div key={g.id} onClick={() => setModal({ open: true, meeting: g, date: expandedDay, time, mop })}
                                        className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-2.5 cursor-pointer hover:bg-gray-100 transition opacity-60">
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                          <span className="text-xs font-semibold text-gray-500 truncate line-through">{g.client_name}</span>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500 flex-shrink-0">
                                            {g.is_transferred ? 'Перенесён' : g.status}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-gray-400">{g.client_phone}</div>
                                      </div>
                                    ))}
                                    {activeMeeting ? (
                                      (() => {
                                        const c = getCardColor(activeMeeting)
                                        return (
                                          <div
                                            className="rounded-xl border cursor-pointer hover:shadow-md transition shadow-sm flex"
                                            style={{ background: c.bg, borderColor: c.border }}
                                            onClick={() => setModal({ open: true, meeting: activeMeeting, date: expandedDay, time, mop })}
                                          >
                                            <div className="w-1.5 rounded-l-xl flex-shrink-0" style={{ background: c.bar }} />
                                            <div className="flex-1 min-w-0 px-2.5 py-2.5 space-y-1.5">
                                              <div>
                                                <div className="font-bold text-sm leading-tight truncate" style={{ color: 'var(--navy)' }}>
                                                  {activeMeeting.client_name}
                                                  {activeMeeting.is_repeated && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded-full font-semibold" style={{ background: '#fef3c7', color: '#92400e' }}>Повторная</span>}
                                                </div>
                                                <div className="text-[11px] text-gray-500">{activeMeeting.client_phone}</div>
                                              </div>
                                              <div className="flex flex-wrap gap-1 items-center">
                                                <span className="text-[10px] font-medium text-gray-400 w-full">Статус:</span>
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={getStatusStyle(activeMeeting.status)}>
                                                  {activeMeeting.status}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-[10px] font-medium text-gray-400">Результат:</span>
                                                {activeMeeting.result ? (
                                                  <span className="ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={getResultStyle(activeMeeting.result)}>
                                                    {activeMeeting.result}
                                                  </span>
                                                ) : (
                                                  <span className="ml-1 text-[11px] text-gray-300 italic">не указан</span>
                                                )}
                                              </div>
                                              <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.04)' }}>
                                                <span className="text-[10px] font-medium text-gray-400">Комментарий МОП: </span>
                                                <span className="text-[11px] text-gray-500">
                                                  {activeMeeting.comment_mop || <span className="italic text-gray-300">не заполнен</span>}
                                                </span>
                                              </div>
                                              {activeMeeting.bitrix_link && (
                                                <a
                                                  href={activeMeeting.bitrix_link}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={e => e.stopPropagation()}
                                                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg w-fit"
                                                  style={{ background: '#dbeafe', color: '#1d4ed8' }}
                                                >
                                                  <ExternalLink size={10} /> Bitrix24
                                                </a>
                                              )}
                                            </div>
                                            <button
                                              onClick={e => { e.stopPropagation(); setModal({ open: true, meeting: activeMeeting, date: expandedDay, time, mop }) }}
                                              className="flex-shrink-0 px-1.5 flex items-start pt-2.5 text-gray-300 hover:text-gray-500 transition"
                                            >
                                              <Pencil size={12} />
                                            </button>
                                          </div>
                                        )
                                      })()
                                    ) : (
                                      <button onClick={() => setModal({ open: true, date: expandedDay, time, mop })}
                                        className={`w-full rounded-xl border-2 border-dashed min-h-[96px] flex items-center justify-center gap-1.5 transition text-xs font-medium ${MOP_COLORS[mop].slot}`}>
                                        <Plus size={13} /> Записать
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {modal.open && (
        <MeetingModal
          meeting={modal.meeting}
          date={modal.date!}
          time={modal.time!}
          mop={modal.mop!}
          onClose={() => setModal({ open: false })}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
