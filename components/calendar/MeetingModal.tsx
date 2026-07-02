'use client'

import { useState } from 'react'
import { X, Trash2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Meeting, MopName, MeetingStatus, MeetingResult } from '@/types'

const STATUSES: MeetingStatus[] = ['Занято', 'Проведено', 'Не пришёл', 'Отмена', 'Перенос']
const RESULTS: MeetingResult[] = ['Продажа', 'Отказ', 'Думает']

interface Props {
  meeting?: Meeting
  date: string
  time: string
  mop: MopName
  onClose: () => void
  onSaved: () => void
}

export default function MeetingModal({ meeting, date, time, mop, onClose, onSaved }: Props) {
  const supabase = createClient()
  const isEdit = !!meeting

  const [form, setForm] = useState({
    client_name: meeting?.client_name ?? '',
    client_phone: meeting?.client_phone ?? '',
    client_telegram: meeting?.client_telegram ?? '',
    bitrix_link: meeting?.bitrix_link ?? '',
    status: meeting?.status ?? 'Занято' as MeetingStatus,
    result: meeting?.result ?? null as MeetingResult,
    comment: meeting?.comment ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string | null) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      mop_name: mop, date, time_slot: time + ':00',
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_telegram: form.client_telegram || null,
      bitrix_link: form.bitrix_link || null,
      status: form.status,
      result: form.result,
      comment: form.comment || null,
    }

    let err
    if (isEdit) {
      const res = await supabase.from('meetings').update(payload).eq('id', meeting.id)
      err = res.error
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? '00000000-0000-0000-0000-000000000000'
      const res = await supabase.from('meetings').insert({ ...payload, created_by: uid })
      err = res.error
    }

    if (err) { setError('Ошибка: ' + err.message); setSaving(false) }
    else { onSaved(); onClose() }
  }

  async function handleDelete() {
    if (!meeting || !confirm('Удалить встречу?')) return
    await supabase.from('meetings').delete().eq('id', meeting.id)
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Шапка */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100"
          style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)' }}>
          <div>
            <h3 className="font-bold text-white">{isEdit ? 'Редактировать встречу' : 'Новая встреча'}</h3>
            <p className="text-white/60 text-sm mt-0.5">{mop} · {date} · {time}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Клиент *</label>
              <input className="input" value={form.client_name}
                onChange={e => set('client_name', e.target.value)} required placeholder="Иванов Иван" />
            </div>
            <div>
              <label className="label">Телефон *</label>
              <input className="input" value={form.client_phone}
                onChange={e => set('client_phone', e.target.value)} required placeholder="+7 900 000 00 00" />
            </div>
            <div>
              <label className="label">Telegram</label>
              <input className="input" value={form.client_telegram}
                onChange={e => set('client_telegram', e.target.value)} placeholder="@username" />
            </div>
            <div className="col-span-2">
              <label className="label">Ссылка на сделку Bitrix24</label>
              <div className="relative">
                <input className="input pr-9" value={form.bitrix_link}
                  onChange={e => set('bitrix_link', e.target.value)} placeholder="https://..." />
                {form.bitrix_link && (
                  <a href={form.bitrix_link} target="_blank" rel="noopener noreferrer"
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-blue-500">
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Статус</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Результат</label>
              <select className="input" value={form.result ?? ''} onChange={e => set('result', e.target.value || null)}>
                <option value="">—</option>
                {RESULTS.map(r => <option key={r!}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Комментарий</label>
            <textarea className="input resize-none" rows={3} value={form.comment}
              onChange={e => set('comment', e.target.value)} placeholder="Дополнительная информация..." />
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1"
              style={{ backgroundColor: 'var(--navy)' }}>
              {saving ? 'Сохраняем...' : isEdit ? 'Сохранить' : 'Записать'}
            </button>
            {isEdit && (
              <button type="button" onClick={handleDelete}
                className="p-2.5 text-red-400 hover:bg-red-50 rounded-lg transition border border-red-200">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
