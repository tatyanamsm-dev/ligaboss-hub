export type UserRole = 'rop' | 'mop'
export type MopName = 'Владимир' | 'Анастасия' | 'Ксения'

export type MeetingStatus =
  | 'Назначен'
  | 'Подтвердил'
  | 'Перенос в день встречи'
  | 'Перенос до дня встречи'
  | 'Игнор в день встречи'

export type MeetingResult =
  | 'Купил во время встречи'
  | 'Купил после встречи'
  | 'Отказался'
  | 'Думает'
  | 'Ожидает КП'
  | null

export type ZoomSendTo = 'whatsapp' | 'telegram' | 'sms'
export type PaymentMethod = 'Карта' | 'Наличные' | 'Расчётный счёт' | 'Рассрочка'
export type WorkDayStatus = 'working' | 'day_off' | 'sick' | 'vacation' | 'partial'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  mop_name: MopName | null
  created_at: string
}

export interface Meeting {
  id: string
  mop_name: MopName
  date: string
  time_slot: string
  client_name: string
  client_phone: string
  zoom_send_to: ZoomSendTo | null
  telegram_username: string | null
  bitrix_link: string | null
  status: MeetingStatus
  result: MeetingResult
  comment_lidorub: string | null
  comment_mop: string | null
  is_repeated: boolean
  is_transferred: boolean
  original_meeting_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  meeting_ref_id: string | null
  mop_name: MopName
  client_name: string
  email: string | null
  client_phone: string | null
  messenger_type: string | null
  messenger_value: string | null
  region: string | null
  timezone: string | null
  tariff: string
  product: string | null
  legal_form: string | null
  licensing: string | null
  certificate_type: string | null
  course_status: string | null
  floor_type: string | null
  alcohol_nearby: string | null
  network_contract: boolean
  amount: number
  payment_method: PaymentMethod
  bitrix_link: string | null
  payment_date: string
  comment: string | null
  created_by: string | null
  created_at: string
}

export interface Installment {
  id: string
  mop_name: MopName
  client_name: string
  client_phone: string | null
  client_email: string | null
  total_amount: number
  paid_amount: number
  installment_count: number
  next_payment_date: string | null
  bitrix_link: string | null
  comment: string | null
  created_at: string
}

export interface MopWorkDay {
  id: string
  mop_name: MopName
  date: string
  status: WorkDayStatus
}

export interface MopTimeSlot {
  id: string
  mop_name: MopName
  day_of_week: number
  time_start: string
  active: boolean
}
