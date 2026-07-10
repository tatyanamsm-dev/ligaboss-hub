'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, startOfWeekMon, addDays, startOfMonth, endOfMonth } from '@/lib/dateUtils'
import type { Meeting, Payment, MopName, UserRole, MopTimeSlot } from '@/types'
import PeriodFilter, { type PeriodValue } from '@/components/ui/PeriodFilter'
const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']
const RU_MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: color ?? 'var(--navy)' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ConvCard({ label, pct }: { label: string; pct: number }) {
  const color = pct >= 50 ? '#059669' : pct >= 25 ? '#d97706' : '#dc2626'
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{pct}%</p>
    </div>
  )
}

interface Props { userRole: UserRole; userMopName: MopName | null }

export default function SummaryView({ userRole, userMopName }: Props) {
  const [period, setPeriod] = useState<PeriodValue>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [slots, setSlots] = useState<MopTimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const now = new Date()
  const weekStart = startOfWeekMon(now)

  function getRange() {
    switch (period) {
      case 'today': return { from: formatDate(now), to: formatDate(now) }
      case 'week': return { from: formatDate(weekStart), to: formatDate(addDays(weekStart, 6)) }
      case 'month': return { from: formatDate(startOfMonth(now)), to: formatDate(endOfMonth(now)) }
      case 'custom': return { from: customFrom || '2020-01-01', to: customTo || '2099-12-31' }
      default: return { from: '', to: '' }
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
      const visibleMops = userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])
      const [mRes, pRes, sRes] = await Promise.all([
        (() => {
          let q = supabase.from('meetings').select('*').in('mop_name', visibleMops)
          if (from) q = q.gte('date', from)
          if (to) q = q.lte('date', to)
          return q
        })(),
        (() => {
          let q = supabase.from('payments').select('*').in('mop_name', visibleMops)
          if (from) q = q.gte('payment_date', from)
          if (to) q = q.lte('payment_date', to)
          return q
        })(),
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

  const visibleMops = userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])

  // Считаем слоты за период (приблизительно — активные слоты × дни)
  const { from, to } = getRange()
  let dayCount = 1
  if (from && to) {
    const d1 = new Date(from + 'T00:00:00')
    const d2 = new Date(to + 'T00:00:00')
    dayCount = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1)
  }
  // Среднее кол-во активных слотов в день на всех МОПов
  const totalSlotCount = slots.length > 0 ? Math.round((slots.length / 7) * dayCount) : 0

  const GHOST_STATUSES = ['Отменил','Отменил (в день встречи)','Отменил (до дня встречи)','По нашей причине','Игнор в день встречи','Перенос до дня встречи','Перенос в день встречи']
  const uniqueMeetings = meetings.filter(m => !m.is_repeated && !m.is_transferred && !GHOST_STATUSES.includes(m.status))
  const conductedMeetings = meetings.filter(m => m.status === 'Произошёл' || m.status === 'Пообщались по телефону')
  const salesMeetings = payments
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)
  const avgCheck = payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0

  const pct = (a: number, b: number) => b > 0 ? Math.round(a / b * 100) : 0

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-6 py-4 gap-3 bg-white border-b border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>Итоги отдела продаж</h2>
        <PeriodFilter period={period} onChange={handlePeriodChange} options={['today', 'week', 'month', 'all', 'custom']} />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Загружаем данные...</div>
      ) : (
        <div className="p-4 md:p-6 space-y-6">
          {/* Основные показатели */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Основные показатели</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Свободных слотов" value={totalSlotCount} />
              <StatCard label="Назначено встреч" value={uniqueMeetings.length} />
              <StatCard label="Проведено встреч" value={conductedMeetings.length} />
              <StatCard label="Продаж" value={salesMeetings.length} color="var(--gold)" />
            </div>
          </div>

          {/* Финансы */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Финансовые показатели</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard label="Выручка" value={`${totalRevenue.toLocaleString('ru-RU')} ₽`} color="var(--gold)" />
              <StatCard label="Платежей" value={payments.length} />
              <StatCard label="Средний чек" value={`${avgCheck.toLocaleString('ru-RU')} ₽`} />
            </div>
          </div>

          {/* Конверсии */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Конверсии</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ConvCard label="Слот → Встреча" pct={pct(uniqueMeetings.length, totalSlotCount)} />
              <ConvCard label="Встреча → Проведено" pct={pct(conductedMeetings.length, uniqueMeetings.length)} />
              <ConvCard label="Проведено → Продажа" pct={pct(salesMeetings.length, conductedMeetings.length)} />
              <ConvCard label="Встреча → Продажа" pct={pct(salesMeetings.length, uniqueMeetings.length)} />
            </div>
          </div>

          {/* По менеджерам */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">По менеджерам</p>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead style={{ backgroundColor: 'var(--cream)' }}>
                  <tr>
                    {['Менеджер', 'Назначено', 'Проведено', 'Продажи', 'Конв. встреча→продажа', 'Выручка', 'Ср. чек'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleMops.map(mop => {
                    const mm = meetings.filter(m => m.mop_name === mop && !m.is_repeated && !m.is_transferred && !GHOST_STATUSES.includes(m.status))
                    const conducted = meetings.filter(m => m.mop_name === mop && (m.status === 'Произошёл' || m.status === 'Пообщались по телефону'))
                    const pp = payments.filter(p => p.mop_name === mop)
                    const sales = pp
                    const rev = pp.reduce((s, p) => s + Number(p.amount), 0)
                    const avg = pp.length > 0 ? Math.round(rev / pp.length) : 0
                    const conv = pct(sales.length, conducted.length)
                    return (
                      <tr key={mop} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold" style={{ color: 'var(--navy)' }}>{mop}</td>
                        <td className="px-4 py-3">{mm.length}</td>
                        <td className="px-4 py-3">{conducted.length}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">{sales.length}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${conv >= 50 ? 'bg-emerald-100 text-emerald-700' : conv >= 25 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                            {conv}%
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--gold)' }}>{rev.toLocaleString('ru-RU')} ₽</td>
                        <td className="px-4 py-3 text-gray-600">{avg.toLocaleString('ru-RU')} ₽</td>
                      </tr>
                    )
                  })}
                  {/* Итого */}
                  <tr className="font-bold" style={{ backgroundColor: 'var(--cream)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--navy)' }}>ИТОГО</td>
                    <td className="px-4 py-3">{uniqueMeetings.length}</td>
                    <td className="px-4 py-3">{conductedMeetings.length}</td>
                    <td className="px-4 py-3 text-emerald-600">{salesMeetings.length}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pct(salesMeetings.length, conductedMeetings.length) >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {pct(salesMeetings.length, conductedMeetings.length)}%
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--gold)' }}>{totalRevenue.toLocaleString('ru-RU')} ₽</td>
                    <td className="px-4 py-3 text-gray-600">{avgCheck.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
