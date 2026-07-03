'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/dateUtils'
import { RUSSIA_REGIONS, RUSSIA_TIMEZONES } from '@/lib/russiaData'
import type { MopName, PaymentMethod, Meeting } from '@/types'

const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']
const METHODS: PaymentMethod[] = ['Карта', 'Наличные', 'Расчётный счёт', 'Рассрочка']

function RadioGroup({ label, options, value, onChange }: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="label mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="px-3 py-1.5 rounded-lg border text-sm transition"
            style={value === opt
              ? { backgroundColor: 'var(--navy)', color: 'white', borderColor: 'var(--navy)' }
              : { backgroundColor: 'white', color: '#374151', borderColor: '#d1d5db' }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

interface Props {
  meeting?: Meeting
  prefillMop?: MopName
  prefillName?: string
  prefillPhone?: string
  prefillBitrix?: string
  onClose: () => void
  onSaved: () => void
}

export default function PaymentFormModal({ meeting, prefillMop, prefillName, prefillPhone, prefillBitrix, onClose, onSaved }: Props) {
  const supabase = createClient()

  const now = new Date()
  const [form, setForm] = useState({
    mop_name: prefillMop ?? meeting?.mop_name ?? MOPS[0],
    client_name: prefillName ?? meeting?.client_name ?? '',
    email: '',
    client_phone: prefillPhone ?? meeting?.client_phone ?? '',
    messenger_type: meeting?.zoom_send_to ?? '',
    messenger_value: meeting?.telegram_username ?? '',
    region: '',
    timezone: 'МСК (UTC+3) — Москва, европейская часть',
    product: '',
    legal_form: '',
    licensing: '',
    certificate_type: '',
    course_status: '',
    floor_type: '',
    alcohol_nearby: '',
    network_contract: false,
    amount: '',
    payment_method: 'Карта' as PaymentMethod,
    bitrix_link: prefillBitrix ?? meeting?.bitrix_link ?? '',
    comment: '',
    payment_date: formatDate(now),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const isOffline = form.licensing === 'Офлайн' || form.licensing === 'Онлайн+Офлайн'
  const isDpo = form.certificate_type === 'Диплом/удостоверение с присвоением квалификации'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('payments').insert({
      meeting_ref_id: meeting?.id ?? null,
      mop_name: form.mop_name,
      client_name: form.client_name,
      email: form.email || null,
      client_phone: form.client_phone || null,
      messenger_type: form.messenger_type || null,
      messenger_value: form.messenger_type === 'telegram' ? (form.messenger_value || null) : null,
      region: form.region || null,
      timezone: form.timezone || null,
      tariff: form.product || '—',
      product: form.product || null,
      legal_form: form.legal_form || null,
      licensing: form.licensing || null,
      certificate_type: form.certificate_type || null,
      course_status: form.course_status || null,
      floor_type: isOffline ? (form.floor_type || null) : null,
      alcohol_nearby: isOffline ? (form.alcohol_nearby || null) : null,
      network_contract: isDpo ? form.network_contract : false,
      amount: parseFloat(form.amount) || 0,
      payment_method: form.payment_method,
      bitrix_link: form.bitrix_link || null,
      payment_date: form.payment_date,
      comment: form.comment || null,
    })

    if (err) { setError('Ошибка: ' + err.message); setSaving(false) }
    else { onSaved(); onClose() }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Шапка */}
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-gray-100 bg-white z-10"
          style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)' }}>
          <div>
            <h3 className="font-bold text-white text-lg">Оформление оплаты</h3>
            <p className="text-white/60 text-sm mt-0.5">
              {now.toLocaleDateString('ru-RU')} {now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-6">
          {/* Контактные данные */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--gold)' }}>
              Контактные данные
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Менеджер</label>
                <select className="input" value={form.mop_name} onChange={e => set('mop_name', e.target.value)}>
                  {MOPS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Имя клиента *</label>
                <input className="input" required value={form.client_name}
                  onChange={e => set('client_name', e.target.value)} placeholder="Иванов Иван" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="client@mail.ru" />
              </div>
              <div>
                <label className="label">Телефон</label>
                <input className="input" value={form.client_phone}
                  onChange={e => set('client_phone', e.target.value)} placeholder="+7 900 000 00 00" />
              </div>
            </div>

            {/* Мессенджер */}
            <div className="mt-4">
              <label className="label mb-2">Мессенджер для связи</label>
              <div className="flex gap-2 flex-wrap">
                {[{ v: 'whatsapp', l: 'Макс' }, { v: 'telegram', l: 'Telegram' }, { v: 'sms', l: 'SMS' }].map(opt => (
                  <button key={opt.v} type="button"
                    onClick={() => set('messenger_type', form.messenger_type === opt.v ? '' : opt.v)}
                    className="px-3 py-1.5 rounded-lg border text-sm transition"
                    style={form.messenger_type === opt.v
                      ? { backgroundColor: 'var(--navy)', color: 'white', borderColor: 'var(--navy)' }
                      : { backgroundColor: 'white', color: '#374151', borderColor: '#d1d5db' }}>
                    {opt.l}
                  </button>
                ))}
              </div>
              {form.messenger_type === 'telegram' && (
                <input className="input mt-2" value={form.messenger_value}
                  onChange={e => set('messenger_value', e.target.value)} placeholder="@username" />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label">Регион</label>
                <select className="input" value={form.region} onChange={e => set('region', e.target.value)}>
                  <option value="">— выберите регион —</option>
                  {RUSSIA_REGIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Часовой пояс</label>
                <select className="input" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                  {RUSSIA_TIMEZONES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Что купил */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--gold)' }}>
              Что купил клиент
            </h4>
            <div>
              <label className="label">Продукт / тариф *</label>
              <input className="input" required value={form.product}
                onChange={e => set('product', e.target.value)} placeholder="Название курса или тарифа" />
            </div>

            <div className="mt-4 space-y-4">
              <RadioGroup
                label="Форма организации"
                options={['ИП', 'ООО / АНО (юр. лицо)', 'Самозанятый', 'Ничего не оформлено']}
                value={form.legal_form}
                onChange={v => set('legal_form', v)}
              />
              <RadioGroup
                label="Лицензирование"
                options={['Онлайн', 'Офлайн', 'Онлайн+Офлайн']}
                value={form.licensing}
                onChange={v => set('licensing', v)}
              />
              <RadioGroup
                label="Что выдавать ученикам"
                options={['Сертификат / диплом о прохождении курса', 'Диплом/удостоверение с присвоением квалификации', 'Пока не уверен']}
                value={form.certificate_type}
                onChange={v => set('certificate_type', v)}
              />
              <RadioGroup
                label="Уже есть записанный курс?"
                options={['Да, есть готовые уроки', 'Есть записи созвонов / эфиров', 'Пока ничего нет']}
                value={form.course_status}
                onChange={v => set('course_status', v)}
              />

              {isOffline && (
                <>
                  <RadioGroup
                    label="На каком этаже находится помещение"
                    options={['1–3 этаж или отдельное здание', 'Выше 3 этажа', 'Цоколь или подвал']}
                    value={form.floor_type}
                    onChange={v => set('floor_type', v)}
                  />
                  <RadioGroup
                    label="Точки продажи алкоголя рядом"
                    options={['Нет, рядом ничего нет', 'Да, есть', 'Не уверен, проверяю']}
                    value={form.alcohol_nearby}
                    onChange={v => set('alcohol_nearby', v)}
                  />
                </>
              )}

              {isDpo && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.network_contract}
                    onChange={e => set('network_contract', e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--navy)' }}
                  />
                  <span className="text-sm text-gray-700">Нужен сетевой договор (для оформления ДПО)</span>
                </label>
              )}
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Оплата */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--gold)' }}>
              Оплата
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Сумма (за вычетом комиссии) *</label>
                <input className="input" required type="number" value={form.amount}
                  onChange={e => set('amount', e.target.value)} placeholder="50000" />
              </div>
              <div>
                <label className="label">Способ оплаты</label>
                <select className="input" value={form.payment_method}
                  onChange={e => set('payment_method', e.target.value as PaymentMethod)}>
                  {METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Дата оплаты</label>
                <input className="input" type="date" value={form.payment_date}
                  onChange={e => set('payment_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Ссылка Bitrix24</label>
                <input className="input" value={form.bitrix_link}
                  onChange={e => set('bitrix_link', e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Комментарий</label>
              <textarea className="input resize-none" rows={2} value={form.comment}
                onChange={e => set('comment', e.target.value)} placeholder="Дополнительная информация..." />
            </div>
          </section>

          {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl font-bold text-white transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--navy)' }}>
            {saving ? 'Сохраняем...' : 'Сохранить оплату'}
          </button>
        </form>
      </div>
    </div>
  )
}
