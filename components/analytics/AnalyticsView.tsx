'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, startOfWeekMon, addDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from '@/lib/dateUtils'
import type { Meeting, Payment, MopName, UserRole } from '@/types'

type Period = 'day' | 'week' | 'month'
const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']

interface Props { userRole: UserRole; userMopName: MopName | null }

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
      style={accent ? { borderLeft: '4px solid var(--gold)' } : {}}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: 'var(--navy)' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsView({ userRole, userMopName }: Props) {
  const [period, setPeriod] = useState<Period>('week')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const now = new Date()
  const weekStart = startOfWeekMon(now)
  const ranges: Record<Period, { from: string; to: string }> = {
    day:   { from: formatDate(startOfDay(now)), to: formatDate(endOfDay(now)) },
    week:  { from: formatDate(weekStart), to: formatDate(addDays(weekStart, 6)) },
    month: { from: formatDate(startOfMonth(now)), to: formatDate(endOfMonth(now)) },
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { from, to } = ranges[period]
      const [mRes, pRes] = await Promise.all([
        supabase.from('meetings').select('*').gte('date', from).lte('date', to).eq('is_repeated', false),
        supabase.from('payments').select('*').gte('payment_date', from).lte('payment_date', to),
      ])
      setMeetings((mRes.data as Meeting[]) ?? [])
      setPayments((pRes.data as Payment[]) ?? [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const visibleMops = userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])
  const total = meetings.length
  const conducted = meetings.filter(m => m.status === 'Проведено').length
  const sales = meetings.filter(m => m.result === 'Продажа').length
  const revenue = payments.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-6 py-4 gap-3 bg-white border-b border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>Аналитика</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
          {(['day', 'week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition"
              style={period === p ? { backgroundColor: 'var(--navy)', color: 'white' } : { color: '#6b7280' }}>
              {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Загружаем данные...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
              <KpiCard label="Всего встреч" value={total} />
              <KpiCard label="Проведено" value={conducted}
                sub={total ? `${Math.round(conducted / total * 100)}% от всех` : ''} />
              <KpiCard label="Продажи" value={sales} accent
                sub={conducted ? `конверсия ${Math.round(sales / conducted * 100)}%` : ''} />
              <KpiCard label="Выручка" value={`${revenue.toLocaleString('ru-RU')} ₽`} accent />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold" style={{ color: 'var(--navy)' }}>Конверсии по менеджерам</h3>
              </div>
              <table className="w-full text-sm min-w-[600px]">
                <thead style={{ backgroundColor: 'var(--cream)' }}>
                  <tr>
                    {['Менеджер', 'Встреч', 'Проведено', 'Не пришёл', 'Продажи', 'Конверсия', 'Выручка'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleMops.map(mop => {
                    const mm = meetings.filter(m => m.mop_name === mop)
                    const pp = payments.filter(p => p.mop_name === mop)
                    const mConducted = mm.filter(m => m.status === 'Проведено').length
                    const mSales = mm.filter(m => m.result === 'Продажа').length
                    const mRevenue = pp.reduce((s, p) => s + Number(p.amount), 0)
                    const conv = mConducted ? Math.round(mSales / mConducted * 100) : 0
                    return (
                      <tr key={mop} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--navy)' }}>{mop}</td>
                        <td className="px-4 py-3 text-gray-600">{mm.length}</td>
                        <td className="px-4 py-3 text-gray-600">{mConducted}</td>
                        <td className="px-4 py-3 text-red-500">{mm.filter(m => m.status === 'Не пришёл').length}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">{mSales}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${conv >= 50 ? 'bg-emerald-100 text-emerald-700' : conv >= 25 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                            {conv}%
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--gold)' }}>
                          {mRevenue.toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
