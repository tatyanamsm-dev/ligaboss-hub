'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/dateUtils'
import type { MopName, UserRole, Installment } from '@/types'

const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']

interface Props { userRole: UserRole; userMopName: MopName | null }

export default function InstallmentsView({ userRole, userMopName }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    let q = supabase.from('installments').select('*').order('created_at', { ascending: false })
    if (userRole === 'mop' && userMopName) q = q.eq('mop_name', userMopName)
    const { data } = await q
    setItems((data as Installment[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalDebt = items.reduce((s, i) => s + (i.total_amount - i.paid_amount), 0)

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Внутренние рассрочки</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--navy)' }}>
          <Plus size={16} /> Добавить
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm" style={{ borderLeft: '4px solid var(--gold)' }}>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Всего рассрочек</p>
          <p className="text-3xl font-bold mt-1" style={{ color: 'var(--navy)' }}>{items.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm" style={{ borderLeft: '4px solid var(--gold)' }}>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Долг по рассрочкам</p>
          <p className="text-2xl font-bold mt-1 text-red-500">{totalDebt.toLocaleString('ru-RU')} ₽</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Загружаем...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          Нет активных рассрочек
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[640px]">
            <thead style={{ backgroundColor: 'var(--cream)' }}>
              <tr>
                {['Менеджер', 'Клиент', 'Телефон', 'Сумма', 'Оплачено', 'Остаток', 'Следующий платёж', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const remaining = item.total_amount - item.paid_amount
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--navy)' }}>{item.mop_name}</td>
                    <td className="px-4 py-3 font-semibold">{item.client_name}</td>
                    <td className="px-4 py-3 text-gray-500">{item.client_phone ?? '—'}</td>
                    <td className="px-4 py-3">{Number(item.total_amount).toLocaleString('ru-RU')} ₽</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">{Number(item.paid_amount).toLocaleString('ru-RU')} ₽</td>
                    <td className="px-4 py-3 text-red-500 font-semibold">{remaining.toLocaleString('ru-RU')} ₽</td>
                    <td className="px-4 py-3 text-gray-500">{item.next_payment_date ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={async () => {
                        if (!confirm('Удалить рассрочку?')) return
                        await supabase.from('installments').delete().eq('id', item.id)
                        load()
                      }} className="text-gray-300 hover:text-red-500 transition">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <InstallmentForm mops={userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])}
        onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  )
}

function InstallmentForm({ mops, onClose, onSaved }: { mops: MopName[]; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    mop_name: mops[0] ?? 'Владимир',
    client_name: '', client_phone: '', client_email: '',
    total_amount: '', paid_amount: '0', installment_count: '2',
    next_payment_date: '', bitrix_link: '', comment: '',
  })
  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await supabase.from('installments').insert({
      mop_name: form.mop_name, client_name: form.client_name,
      client_phone: form.client_phone || null, client_email: form.client_email || null,
      total_amount: parseFloat(form.total_amount), paid_amount: parseFloat(form.paid_amount) || 0,
      installment_count: parseInt(form.installment_count) || 2,
      next_payment_date: form.next_payment_date || null,
      bitrix_link: form.bitrix_link || null, comment: form.comment || null,
    })
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b"
          style={{ background: 'linear-gradient(135deg, var(--navy), var(--navy-light))' }}>
          <h3 className="font-bold text-white">Новая рассрочка</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="label">Менеджер</label>
            <select className="input" value={form.mop_name} onChange={e => set('mop_name', e.target.value)}>
              {mops.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Клиент *</label>
            <input className="input" required value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Иванов Иван" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Телефон</label>
              <input className="input" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} placeholder="+7 900..." />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="mail@..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Полная сумма *</label>
              <input className="input" required type="number" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} placeholder="60000" />
            </div>
            <div>
              <label className="label">Уже оплачено</label>
              <input className="input" type="number" value={form.paid_amount} onChange={e => set('paid_amount', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Кол-во платежей</label>
              <input className="input" type="number" value={form.installment_count} onChange={e => set('installment_count', e.target.value)} />
            </div>
            <div>
              <label className="label">Следующий платёж</label>
              <input className="input" type="date" value={form.next_payment_date} onChange={e => set('next_payment_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Bitrix24</label>
            <input className="input" value={form.bitrix_link} onChange={e => set('bitrix_link', e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="label">Комментарий</label>
            <textarea className="input resize-none" rows={2} value={form.comment} onChange={e => set('comment', e.target.value)} />
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl font-bold text-white"
            style={{ backgroundColor: 'var(--navy)' }}>
            {saving ? 'Сохраняем...' : 'Добавить рассрочку'}
          </button>
        </form>
      </div>
    </div>
  )
}
