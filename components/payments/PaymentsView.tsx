'use client'

import { useState, useEffect } from 'react'
import { Plus, ExternalLink, Trash2, Download, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, startOfWeekMon, addDays, startOfMonth, endOfMonth } from '@/lib/dateUtils'
import type { Payment, MopName, UserRole } from '@/types'
import PaymentFormModal from './PaymentFormModal'
import PeriodFilter, { type PeriodValue } from '@/components/ui/PeriodFilter'

function exportToExcel(payments: Payment[]) {
  const headers = ['Дата','Менеджер','Клиент','Телефон','Email','Тариф','Сумма','Способ оплаты','Регион','Форма орг.','Лицензирование','Bitrix','Комментарий']
  const rows = payments.map(p => [
    p.payment_date, p.mop_name, p.client_name,
    p.client_phone ?? '', p.email ?? '',
    p.tariff ?? '', Number(p.amount), p.payment_method,
    p.region ?? '', p.legal_form ?? '', p.licensing ?? '',
    p.bitrix_link ?? '', p.comment ?? '',
  ])
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const BOM = '﻿'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `оплаты_${formatDate(new Date())}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']

interface Props {
  userRole: UserRole
  userMopName: MopName | null
}

export default function PaymentsView({ userRole, userMopName }: Props) {
  const [period, setPeriod] = useState<PeriodValue>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const now = new Date()
  const weekStart = startOfWeekMon(now)

  function getRange() {
    switch (period) {
      case 'today': return { from: formatDate(now), to: formatDate(now) }
      case 'week': return { from: formatDate(weekStart), to: formatDate(addDays(weekStart, 6)) }
      case 'month': return { from: formatDate(startOfMonth(now)), to: formatDate(endOfMonth(now)) }
      case 'custom': return { from: customFrom, to: customTo }
      default: return {}
    }
  }

  async function load() {
    setLoading(true)
    let q = supabase.from('payments').select('*').order('payment_date', { ascending: false })
    const { from, to } = getRange()
    if (from) q = q.gte('payment_date', from)
    if (to) q = q.lte('payment_date', to)
    const { data } = await q
    setPayments((data as Payment[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [period, customFrom, customTo]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePeriodChange(p: PeriodValue, from?: string, to?: string) {
    setPeriod(p)
    if (from) setCustomFrom(from)
    if (to) setCustomTo(to)
  }

  const filtered = search.trim()
    ? payments.filter(p => {
        const q = search.toLowerCase()
        return (p.client_phone ?? '').includes(q) || (p.email ?? '').toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q)
      })
    : payments

  const totalRevenue = filtered.reduce((s, p) => s + Number(p.amount), 0)

  async function handleDelete(id: string) {
    if (!confirm('Удалить запись об оплате?')) return
    await supabase.from('payments').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Оплаты</h2>
        <div className="flex flex-wrap gap-2">
          <PeriodFilter period={period} onChange={handlePeriodChange} options={['week', 'month', 'all', 'custom']} />
          <button
            onClick={() => exportToExcel(filtered)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 transition text-gray-700"
          >
            <Download size={16} />
            Excel
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ backgroundColor: 'var(--navy)' }}
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          placeholder="Поиск по телефону, email или имени..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 mb-5"
        style={{ borderLeft: '4px solid var(--gold)' }}>
        <p className="text-sm text-gray-500">Итого за период</p>
        <p className="text-3xl font-bold" style={{ color: 'var(--navy)' }}>{totalRevenue.toLocaleString('ru-RU')} ₽</p>
        <p className="text-sm text-gray-400 mt-1">{filtered.length} платежей</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Загружаем данные...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50">
              <tr>
                {['Дата', 'Менеджер', 'Клиент', 'Тариф', 'Сумма', 'Способ', 'Bitrix', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Нет данных</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{p.payment_date}</td>
                  <td className="px-4 py-3 font-medium">{p.mop_name}</td>
                  <td className="px-4 py-3">{p.client_name}</td>
                  <td className="px-4 py-3">{p.tariff}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{Number(p.amount).toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{p.payment_method}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.bitrix_link && (
                      <a href={p.bitrix_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {userRole === 'rop' && (
                      <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PaymentFormModal
          prefillMop={userRole === 'mop' ? (userMopName ?? undefined) : undefined}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
