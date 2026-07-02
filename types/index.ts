export type UserRole = 'rop' | 'mop'
export type MopName = 'Владимир' | 'Анастасия' | 'Ксения'

export type MeetingStatus = 'Занято' | 'Проведено' | 'Не пришёл' | 'Отмена' | 'Перенос'
export type MeetingResult = 'Продажа' | 'Отказ' | 'Думает' | null

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
  client_telegram: string | null
  bitrix_link: string | null
  status: MeetingStatus
  result: MeetingResult
  comment: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  meeting_id: string | null
  mop_name: MopName
  client_name: string
  tariff: string
  amount: number
  payment_method: PaymentMethod
  bitrix_link: string | null
  payment_date: string
  comment: string | null
  created_by: string
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
