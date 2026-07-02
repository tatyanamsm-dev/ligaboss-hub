'use client'

import { useState, useEffect } from 'react'
import { Plus, ExternalLink, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, startOfWeekMon, addDays, startOfMonth, endOfMonth } from '@/lib/dateUtils'
import type { Payment, MopName, UserRole, PaymentMethod } from '@/types'

type Period = 'week' | 'month' | 'all'
const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']
const METHODS: PaymentMethod[] = ['Карта', 'Наличные', 'Расчётный счёт', 'Рассрочка']

interface Props {
  userRole: UserRole
  userMopName: MopName | null
}

export default function PaymentsView({ userRole, userMopName }: Props) {
  const [period, setPeriod] = useState<Period>('month')
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  const now = new Date()
  const weekStart = startOfWeekMon(now)

  const ranges: Record<Period, { from?: string; to?: string }> = {
    week: { from: formatDate(weekStart), to: formatDate(addDays(weekStart, 6)) },
    month: { from: formatDate(startOfMonth(now)), to: formatDate(endOfMonth(now)) },
    all: {},
  }

  async function load() {
    setLoading(true)
    let q = supabase.from('payments').select('*').order('payment_date', { ascending: false })
    const { from, to } = ranges[period]
    if (from) q = q.gte('payment_date', from)
    if (to) q = q.lte('payment_date', to)
    const { data } = await q
    setPayments((data as Payment[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)

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
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['week', 'month', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${period === p ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Все'}
              </button>
            ))}
          </div>
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

      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 mb-5"
        style={{ borderLeft: '4px solid var(--gold)' }}>
        <p className="text-sm text-gray-500">Итого за период</p>
        <p className="text-3xl font-bold" style={{ color: 'var(--navy)' }}>{totalRevenue.toLocaleString('ru-RU')} ₽</p>
        <p className="text-sm text-gray-400 mt-1">{payments.length} платежей</p>
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
              {payments.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Нет данных за период</td></tr>
              ) : payments.map(p => (
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
        <PaymentForm
          userRole={userRole}
          userMopName={userMopName}
          mops={MOPS}
          methods={METHODS}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}

function PaymentForm({
  userRole,
  userMopName,
  mops,
  methods,
  onClose,
  onSaved,
}: {
  userRole: UserRole
  userMopName: MopName | null
  mops: MopName[]
  methods: PaymentMethod[]
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    mop_name: userRole === 'mop' ? (userMopName ?? mops[0]) : mops[0],
    client_name: '',
    tariff: '',
    amount: '',
    payment_method: methods[0] as PaymentMethod,
    bitrix_link: '',
    payment_date: formatDate(new Date()),
    comment: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('payments').insert({
      ...form,
      amount: parseFloat(form.amount),
      bitrix_link: form.bitrix_link || null,
      comment: form.comment || null,
      created_by: user!.id,
    })
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold">Новая оплата</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {userRole === 'rop' && (
            <div>
              <label className="label">Менеджер</label>
              <select className="input" value={form.mop_name} onChange={e => set('mop_name', e.target.value)}>
                {mops.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Клиент *</label>
            <input className="input" required value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Иванов Иван" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Тариф *</label>
              <input className="input" required value={form.tariff} onChange={e => set('tariff', e.target.value)} placeholder="Базовый" />
            </div>
            <div>
              <label className="label">Сумма, ₽ *</label>
              <input className="input" required type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="50000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Способ оплаты</label>
              <select className="input" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                {methods.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Дата</label>
              <input className="input" type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Ссылка Bitrix24</label>
            <input className="input" value={form.bitrix_link} onChange={e => set('bitrix_link', e.target.value)} placeholder="https://..." />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </form>
      </div>
    </div>
  )
}
