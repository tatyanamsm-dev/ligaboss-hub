'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, ExternalLink, ArrowRightLeft, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Meeting, MopName, MeetingStatus, MeetingResult, ZoomSendTo } from '@/types'
import PaymentFormModal from '@/components/payments/PaymentFormModal'

const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']

const STATUSES: MeetingStatus[] = [
  'Назначен',
  'Подтвердил',
  'Произошёл',
  'Пообщались по телефону',
  'Перенос в день встречи',
  'Перенос до дня встречи',
  'Игнор в день встречи',
  'Отменил',
  'Отменил (в день встречи)',
  'Отменил (до дня встречи)',
  'По нашей причине',
]

const RESULTS: MeetingResult[] = [
  'Купил во время встречи',
  'Купил после встречи',
  'Отказался',
  'Отказы всех банков',
  'Думает',
  'Ожидает КП',
]

const ZOOM_OPTIONS: { value: ZoomSendTo; label: string }[] = [
  { value: 'whatsapp', label: 'Макс' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'sms', label: 'SMS' },
]

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
    zoom_send_to: meeting?.zoom_send_to ?? null as ZoomSendTo | null,
    telegram_username: meeting?.telegram_username ?? '',
    bitrix_link: meeting?.bitrix_link ?? '',
    status: meeting?.status ?? 'Назначен' as MeetingStatus,
    result: meeting?.result ?? null as MeetingResult,
    comment_lidorub: meeting?.comment_lidorub ?? '',
    comment_mop: meeting?.comment_mop ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPayment, setShowPayment] = useState(false)

  const isBought = form.result === 'Купил во время встречи' || form.result === 'Купил после встречи'

  // Перенос
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferMop, setTransferMop] = useState<MopName>(mop)
  const [transferDate, setTransferDate] = useState(date)
  const [transferTime, setTransferTime] = useState('')
  const [transferSlots, setTransferSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [transferring, setTransferring] = useState(false)

  function set(field: string, value: string | null) {
    setForm(f => ({ ...f, [field]: value }))
  }

  useEffect(() => {
    if (!showTransfer || !transferDate) return
    setLoadingSlots(true)
    const dow = new Date(transferDate + 'T00:00:00').getDay()
    const dayOfWeek = dow === 0 ? 7 : dow
    Promise.all([
      supabase.from('mop_time_slots').select('time_start').eq('mop_name', transferMop).eq('day_of_week', dayOfWeek).eq('active', true),
      supabase.from('mop_extra_slots').select('time_start').eq('mop_name', transferMop).eq('date', transferDate),
    ]).then(([regular, extra]) => {
      const regularTimes = (regular.data ?? []).map((s: { time_start: string }) => s.time_start.slice(0, 5))
      const extraTimes = (extra.data ?? []).map((s: { time_start: string }) => s.time_start.slice(0, 5))
      const slots = [...new Set([...regularTimes, ...extraTimes])].sort()
      setTransferSlots(slots)
      setTransferTime(slots[0] ?? '')
      setLoadingSlots(false)
    })
  }, [showTransfer, transferMop, transferDate]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      mop_name: mop,
      date,
      time_slot: time + ':00',
      client_name: form.client_name,
      client_phone: form.client_phone,
      zoom_send_to: form.zoom_send_to,
      telegram_username: form.zoom_send_to === 'telegram' ? (form.telegram_username || null) : null,
      bitrix_link: form.bitrix_link || null,
      status: form.status,
      result: form.result,
      comment_lidorub: form.comment_lidorub || null,
      comment_mop: form.comment_mop || null,
    }

    let err
    if (isEdit) {
      const res = await supabase.from('meetings').update(payload).eq('id', meeting.id)
      err = res.error
    } else {
      const res = await supabase.from('meetings').insert({
        ...payload,
        is_repeated: false,
        original_meeting_id: null,
      })
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

  async function handleTransfer() {
    if (!meeting || !transferDate || !transferTime) return
    setTransferring(true)
    setError('')

    await supabase.from('meetings')
      .update({ status: 'Перенос до дня встречи', is_transferred: true })
      .eq('id', meeting.id)

    const { error: err } = await supabase.from('meetings').insert({
      mop_name: transferMop,
      date: transferDate,
      time_slot: transferTime + ':00',
      client_name: meeting.client_name,
      client_phone: meeting.client_phone,
      zoom_send_to: meeting.zoom_send_to,
      telegram_username: meeting.telegram_username,
      bitrix_link: meeting.bitrix_link,
      status: 'Назначен' as MeetingStatus,
      result: null,
      comment_lidorub: meeting.comment_lidorub,
      comment_mop: null,
      is_repeated: true,
      original_meeting_id: meeting.id,
    })

    if (err) { setError('Ошибка переноса: ' + err.message); setTransferring(false) }
    else { onSaved(); onClose() }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Шапка */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100"
          style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)' }}>
          <div>
            <h3 className="font-bold text-white">
              {isEdit ? 'Редактировать встречу' : 'Новая встреча'}
              {meeting?.is_repeated && (
                <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                  Повторная
                </span>
              )}
            </h3>
            <p className="text-white/60 text-sm mt-0.5">{mop} · {date} · {time}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Клиент */}
          <div>
            <label className="label">Имя клиента *</label>
            <input className="input" value={form.client_name}
              onChange={e => set('client_name', e.target.value)} required placeholder="Иванов Иван" />
          </div>

          {/* Телефон */}
          <div>
            <label className="label">Телефон *</label>
            <input className="input" value={form.client_phone}
              onChange={e => set('client_phone', e.target.value)} required placeholder="+7 900 000 00 00" />
          </div>

          {/* Куда отправить ссылку на Zoom */}
          <div>
            <label className="label">Куда отправить ссылку на Zoom</label>
            <div className="flex gap-2 flex-wrap">
              {ZOOM_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('zoom_send_to', form.zoom_send_to === opt.value ? null : opt.value)}
                  className="px-3 py-1.5 rounded-lg border text-sm font-medium transition"
                  style={form.zoom_send_to === opt.value
                    ? { backgroundColor: 'var(--navy)', color: 'white', borderColor: 'var(--navy)' }
                    : { backgroundColor: 'white', color: '#6b7280', borderColor: '#d1d5db' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {form.zoom_send_to === 'telegram' && (
              <input
                className="input mt-2"
                value={form.telegram_username}
                onChange={e => set('telegram_username', e.target.value)}
                placeholder="@username"
              />
            )}
          </div>

          {/* Битрикс */}
          <div>
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

          {/* Статус и результат */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Комментарии */}
          <div>
            <label className="label">Комментарий лидоруба</label>
            <textarea className="input resize-none" rows={2} value={form.comment_lidorub}
              onChange={e => set('comment_lidorub', e.target.value)}
              placeholder="Комментарий от лидоруба..." />
          </div>
          <div>
            <label className="label">Комментарий МОПа</label>
            <textarea className="input resize-none" rows={2} value={form.comment_mop}
              onChange={e => set('comment_mop', e.target.value)}
              placeholder="Комментарий менеджера..." />
          </div>

          {/* Кнопка оплаты */}
          {isBought && (
            <button
              type="button"
              onClick={() => setShowPayment(true)}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition"
              style={{ backgroundColor: 'var(--gold)' }}
            >
              <CreditCard size={16} />
              Оформить оплату
            </button>
          )}

          {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {/* Кнопки */}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-semibold text-white transition"
              style={{ backgroundColor: 'var(--navy)' }}>
              {saving ? 'Сохраняем...' : isEdit ? 'Сохранить' : 'Записать'}
            </button>
            {isEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setShowTransfer(v => !v)}
                  className="px-3 rounded-xl border-2 transition flex items-center gap-1.5 text-sm font-medium"
                  style={showTransfer
                    ? { backgroundColor: 'var(--gold)', color: 'white', borderColor: 'var(--gold)' }
                    : { borderColor: 'var(--gold)', color: 'var(--gold)' }}
                >
                  <ArrowRightLeft size={16} />
                  Перенос
                </button>
                <button type="button" onClick={handleDelete}
                  className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition border border-red-200">
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </form>

        {/* Форма оплаты */}
        {showPayment && (
          <PaymentFormModal
            meeting={meeting}
            prefillMop={mop}
            prefillName={form.client_name}
            prefillPhone={form.client_phone}
            prefillBitrix={form.bitrix_link}
            onClose={() => setShowPayment(false)}
            onSaved={onSaved}
          />
        )}

        {/* Блок переноса */}
        {showTransfer && isEdit && (
          <div className="mx-5 mb-5 p-4 rounded-xl border-2 space-y-3"
            style={{ borderColor: 'var(--gold)', backgroundColor: '#fffbf0' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>Перенос встречи</p>
            <p className="text-xs text-gray-500">
              Текущая встреча получит статус «Перенос до дня встречи». Новая встреча будет помечена как повторная и не войдёт в счётчик назначений лидоруба.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">МОП</label>
                <select className="input" value={transferMop}
                  onChange={e => setTransferMop(e.target.value as MopName)}>
                  {MOPS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Дата</label>
                <input type="date" className="input" value={transferDate}
                  onChange={e => setTransferDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Слот</label>
                {loadingSlots ? (
                  <div className="input text-gray-400 text-sm">Загружаем...</div>
                ) : transferSlots.length === 0 ? (
                  <div className="input text-gray-400 text-sm">Нет слотов</div>
                ) : (
                  <select className="input" value={transferTime}
                    onChange={e => setTransferTime(e.target.value)}>
                    {transferSlots.map(s => <option key={s}>{s}</option>)}
                  </select>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTransfer}
              disabled={transferring || !transferTime}
              className="w-full py-2.5 rounded-xl font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: 'var(--gold)' }}
            >
              {transferring ? 'Переносим...' : 'Подтвердить перенос'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
