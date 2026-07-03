'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, startOfWeekMon, addDays, startOfMonth, endOfMonth } from '@/lib/dateUtils'
import type { Meeting, Payment, MopName, UserRole, MopTimeSlot } from '@/types'
import PeriodFilter, { type PeriodValue } from '@/components/ui/PeriodFilter'
const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']
const RU_MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const RU_DAYS = ['вс','пн','вт','ср','чт','пт','сб']

interface Props { userRole: UserRole; userMopName: MopName | null }

export default function ReportsView({ userRole, userMopName }: Props) {
  const [period, setPeriod] = useState<PeriodValue>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [slots, setSlots] = useState<MopTimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const visibleMops = userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])

  const now = new Date()
  const weekStart = startOfWeekMon(now)

  function getRange(): { from: string; to: string } {
    switch (period) {
      case 'today': return { from: formatDate(now), to: formatDate(now) }
      case 'week': return { from: formatDate(weekStart), to: formatDate(addDays(weekStart, 6)) }
      case 'month': return { from: formatDate(startOfMonth(now)), to: formatDate(endOfMonth(now)) }
      case 'custom': return { from: customFrom || '2020-01-01', to: customTo || '2099-12-31' }
      default: return { from: '2020-01-01', to: '2099-12-31' }
    }
  }

  function handlePeriodChange(p: PeriodValue, from?: string, to?: string) {
    setPeriod(p)
    if (from) setCustomFrom(from)
    if (to) setCustomTo(to)
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { from, to } = getRange()
      const [mRes, pRes, sRes] = await Promise.all([
        supabase.from('meetings').select('*').in('mop_name', visibleMops).gte('date', from).lte('date', to),
        supabase.from('payments').select('*').in('mop_name', visibleMops).gte('payment_date', from).lte('payment_date', to),
        supabase.from('mop_time_slots').select('*').in('mop_name', visibleMops).eq('active', true),
      ])
      setMeetings((mRes.data as Meeting[]) ?? [])
      setPayments((pRes.data as Payment[]) ?? [])
      setSlots((sRes.data as MopTimeSlot[]) ?? [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo])

  // Группируем встречи по датам
  const dates = [...new Set(meetings.map(m => m.date))].sort((a, b) => b.localeCompare(a))

  // Активных слотов в день для МОПа
  function getSlotsForMopDay(mop: MopName, dateStr: string) {
    const dow = new Date(dateStr + 'T00:00:00').getDay()
    const dayOfWeek = dow === 0 ? 7 : dow
    return slots.filter(s => s.mop_name === mop && s.day_of_week === dayOfWeek).length
  }

  // Итого KPI
  const totalConducted = meetings.filter(m => m.status === 'Подтвердил').length
  const totalSales = meetings.filter(m => m.result === 'Купил во время встречи' || m.result === 'Купил после встречи').length
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)
  const conv = totalConducted > 0 ? Math.round(totalSales / totalConducted * 100) : 0

  function formatDateLabel(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return `${RU_DAYS[d.getDay()]}, ${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()} г.`
  }

  return (
    <div>
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-6 py-4 gap-3 bg-white border-b border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>Ежедневные отчёты ОП</h2>
        <PeriodFilter period={period} onChange={handlePeriodChange} options={['today', 'week', 'month', 'all', 'custom']} />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Загружаем данные...</div>
      ) : (
        <div className="p-4 md:p-6 space-y-6">
          {/* KPI карточки */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Встреч проведено', value: totalConducted },
              { label: 'Продаж', value: totalSales, gold: true },
              { label: 'Выручка', value: `${totalRevenue.toLocaleString('ru-RU')} ₽`, gold: true },
              { label: 'Конверсия', value: `${conv}%` },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
                style={card.gold ? { borderLeft: '4px solid var(--gold)' } : {}}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{card.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: card.gold ? 'var(--gold)' : 'var(--navy)' }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Дни */}
          {dates.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              Нет данных за выбранный период
            </div>
          ) : dates.map(dateStr => {
            const dayMeetings = meetings.filter(m => m.date === dateStr)
            const dayPayments = payments.filter(p => p.payment_date === dateStr)
            const mopsInDay = visibleMops.filter(mop => dayMeetings.some(m => m.mop_name === mop) || getSlotsForMopDay(mop, dateStr) > 0)

            const dayTotalSlots = mopsInDay.reduce((s, mop) => s + getSlotsForMopDay(mop, dateStr), 0)
            const dayTotalBooked = dayMeetings.filter(m => !m.is_transferred).length
            const dayTotalConducted = dayMeetings.filter(m => m.status === 'Подтвердил').length
            const dayTotalSales = dayMeetings.filter(m => m.result === 'Купил во время встречи' || m.result === 'Купил после встречи').length
            const dayTotalRevenue = dayPayments.reduce((s, p) => s + Number(p.amount), 0)

            return (
              <div key={dateStr} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Заголовок дня */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100"
                  style={{ backgroundColor: 'var(--cream)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold capitalize" style={{ color: 'var(--navy)' }}>
                      {formatDateLabel(dateStr)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{mopsInDay.length} менеджера</span>
                </div>

                {/* Таблица */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Менеджер','Слоты','Занято','Встречи','Продажи','Выручка'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mopsInDay.map(mop => {
                        const mm = dayMeetings.filter(m => m.mop_name === mop && !m.is_transferred)
                        const conducted = mm.filter(m => m.status === 'Подтвердил').length
                        const sales = mm.filter(m => m.result === 'Купил во время встречи' || m.result === 'Купил после встречи').length
                        const rev = dayPayments.filter(p => p.mop_name === mop).reduce((s, p) => s + Number(p.amount), 0)
                        const slotCount = getSlotsForMopDay(mop, dateStr)
                        return (
                          <tr key={mop} className="border-b border-gray-50 hover:bg-gray-50 transition">
                            <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--navy)' }}>{mop}</td>
                            <td className="px-4 py-2.5 text-gray-500">{slotCount}</td>
                            <td className="px-4 py-2.5 text-gray-700">{mm.length}</td>
                            <td className="px-4 py-2.5">
                              <span className={conducted > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>{conducted}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={sales > 0 ? 'font-bold text-emerald-600' : 'text-gray-400'}>{sales}</span>
                            </td>
                            <td className="px-4 py-2.5 font-semibold" style={{ color: rev > 0 ? 'var(--gold)' : '#9ca3af' }}>
                              {rev > 0 ? `${rev.toLocaleString('ru-RU')} ₽` : '0 ₽'}
                            </td>
                          </tr>
                        )
                      })}
                      {/* Итого за день */}
                      <tr style={{ backgroundColor: '#f8f7f4' }}>
                        <td className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Итого за день</td>
                        <td className="px-4 py-2.5 font-bold text-gray-700">{dayTotalSlots}</td>
                        <td className="px-4 py-2.5 font-bold text-gray-700">{dayTotalBooked}</td>
                        <td className="px-4 py-2.5 font-bold text-emerald-600">{dayTotalConducted}</td>
                        <td className="px-4 py-2.5 font-bold text-emerald-600">{dayTotalSales}</td>
                        <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--gold)' }}>
                          {dayTotalRevenue.toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
