'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
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

const STATUS_CONFIG: Record<string, { dot: string; bg: string; border: string; text: string }> = {
  'Назначен':                 { dot: 'bg-yellow-400',  bg: 'bg-yellow-50',  border: 'border-yellow-300',  text: 'text-yellow-700' },
  'Подтвердил':               { dot: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  'Перенос в день встречи':   { dot: 'bg-orange-400',  bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700' },
  'Перенос до дня встречи':   { dot: 'bg-orange-300',  bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-600' },
  'Игнор в день встречи':     { dot: 'bg-red-400',     bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700' },
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

  const loadData = useCallback(async () => {
    setLoading(true)
    const [mRes, wRes, sRes] = await Promise.all([
      supabase.from('meetings').select('*').gte('date', formatDate(monthStart)).lte('date', formatDate(monthEnd)),
      supabase.from('mop_work_days').select('*').gte('date', formatDate(monthStart)).lte('date', formatDate(monthEnd)),
      supabase.from('mop_time_slots').select('*').in('mop_name', visibleMops),
    ])
    setMeetings((mRes.data as Meeting[]) ?? [])
    setWorkDays((wRes.data as MopWorkDay[]) ?? [])
    setTimeSlots((sRes.data as MopTimeSlot[]) ?? [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDate])

  useEffect(() => { loadData() }, [loadData])

  function getWorkDayStatus(mop: MopName, dateStr: string): WorkDayStatus {
    const found = workDays.find(w => w.mop_name === mop && w.date === dateStr)
    if (found) return found.status
    const dow = new Date(dateStr + 'T00:00:00').getDay()
    return dow === 0 || dow === 6 ? 'day_off' : 'working'
  }

  function getActiveSlots(mop: MopName, dateStr: string): string[] {
    const dow = new Date(dateStr + 'T00:00:00').getDay()
    const dayOfWeek = dow === 0 ? 7 : dow
    return timeSlots
      .filter(s => s.mop_name === mop && s.day_of_week === dayOfWeek && s.active)
      .map(s => s.time_start.slice(0, 5))
      .sort()
  }

  function getMeeting(mop: MopName, date: string, time: string) {
    return meetings.find(m =>
      m.mop_name === mop && m.date === date && m.time_slot === time + ':00'
      && !m.is_transferred
      && !meetings.some(m2 => m2.original_meeting_id === m.id)
    )
  }

  function getTransferredMeeting(mop: MopName, date: string, time: string) {
    return meetings.find(m =>
      m.mop_name === mop && m.date === date && m.time_slot === time + ':00'
      && (m.is_transferred || meetings.some(m2 => m2.original_meeting_id === m.id))
    )
  }

  function getMeetingCount(dateStr: string) {
    return meetings.filter(m => m.date === dateStr && !m.is_transferred).length
  }

  function getAllSlotsForDay(dateStr: string): string[] {
    const all = visibleMops.flatMap(mop => getActiveSlots(mop, dateStr))
    return [...new Set(all)].sort()
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
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
                    {/* Заголовки МОПов */}
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

                    {/* Слоты */}
                    {slots.map((time, idx) => (
                      <div
                        key={time}
                        className={`grid ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-100 last:border-0`}
                        style={{ gridTemplateColumns: `72px repeat(${visibleMops.length}, 1fr)` }}
                      >
                        <div className="flex items-center justify-center border-r border-gray-100 py-2.5">
                          <span className="text-xs font-mono font-semibold text-gray-500">{time}</span>
                        </div>
                        {visibleMops.map(mop => {
                          const wdStatus = getWorkDayStatus(mop, expandedDay)
                          const hasSlot = getActiveSlots(mop, expandedDay).includes(time)
                          const meeting = getMeeting(mop, expandedDay, time)
                          const transferred = getTransferredMeeting(mop, expandedDay, time)

                          return (
                            <div key={mop} className="p-2 border-r border-gray-100 last:border-0 space-y-1.5">
                              {wdStatus !== 'working' ? (
                                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-2.5 text-center">
                                  <span className="text-xs text-gray-400 italic">{WORKDAY_LABEL[wdStatus]}</span>
                                </div>
                              ) : !hasSlot ? (
                                <div className="rounded-lg py-2.5" />
                              ) : meeting ? (
                                <div
                                  onClick={() => setModal({ open: true, meeting, date: expandedDay, time, mop })}
                                  className={`rounded-xl border-l-4 border cursor-pointer hover:shadow-md transition shadow-sm overflow-hidden ${STATUS_CONFIG[meeting.status]?.bg ?? 'bg-white'} ${STATUS_CONFIG[meeting.status]?.border ?? 'border-gray-200'}`}
                                >
                                  {/* Дата + время */}
                                  <div className="px-3 pt-2.5 pb-1">
                                    <div className="text-[11px] text-gray-400 font-medium mb-1">
                                      {expandedDay.split('-').reverse().join('.')}, {time}
                                      {meeting.is_repeated && (
                                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-semibold">
                                          Повторная
                                        </span>
                                      )}
                                    </div>
                                    {/* Имя клиента */}
                                    <div className="font-bold text-sm leading-tight mb-2" style={{ color: 'var(--navy)' }}>
                                      {meeting.client_name}
                                    </div>
                                    {/* Статус + результат */}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CONFIG[meeting.status]?.text ?? 'text-gray-500'} bg-white/70 border ${STATUS_CONFIG[meeting.status]?.border ?? 'border-gray-200'}`}>
                                        {meeting.status}
                                      </span>
                                      {meeting.result && (
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                          meeting.result === 'Купил во время встречи' || meeting.result === 'Купил после встречи'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : meeting.result === 'Отказался'
                                            ? 'bg-red-100 text-red-600'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {meeting.result}
                                        </span>
                                      )}
                                    </div>
                                    {/* Телефон */}
                                    <div className="text-xs text-gray-500">{meeting.client_phone}</div>
                                    {/* Комментарий МОПа */}
                                    {meeting.comment_mop && (
                                      <div className="text-[11px] text-gray-400 mt-1 truncate">
                                        МОП: {meeting.comment_mop}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Серая карточка перенесённой встречи */}
                                  {transferred && (
                                    <div
                                      onClick={() => setModal({ open: true, meeting: transferred, date: expandedDay, time, mop })}
                                      className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-2.5 cursor-pointer hover:bg-gray-100 transition opacity-60"
                                    >
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="text-xs font-semibold text-gray-500 truncate line-through">
                                          {transferred.client_name}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500 flex-shrink-0">
                                          Перенесён
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-gray-400">{transferred.client_phone}</div>
                                    </div>
                                  )}
                                  {/* Кнопка записи */}
                                  <button
                                    onClick={() => setModal({ open: true, date: expandedDay, time, mop })}
                                    className={`w-full rounded-xl border-2 border-dashed py-3 flex items-center justify-center gap-1.5 transition text-xs font-medium ${MOP_COLORS[mop].slot}`}
                                  >
                                    <Plus size={13} />
                                    Записать
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
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
