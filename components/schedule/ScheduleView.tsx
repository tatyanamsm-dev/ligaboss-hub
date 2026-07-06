'use client'

import { useState } from 'react'
import type { MopName, UserRole } from '@/types'
import WorkDaysCalendar from './WorkDaysCalendar'
import WorkHoursSchedule from './WorkHoursSchedule'
import ExtraSlotsSchedule from './ExtraSlotsSchedule'

const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']

interface Props {
  userRole: UserRole
  userMopName: MopName | null
}

export default function ScheduleView({ userRole, userMopName }: Props) {
  const [tab, setTab] = useState<'days' | 'hours' | 'extra'>('days')
  const [selectedMop, setSelectedMop] = useState<MopName>(
    userRole === 'mop' && userMopName ? userMopName : MOPS[0]
  )

  return (
    <div>
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-6 py-4 gap-3 bg-white border-b border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>Расписание менеджеров</h2>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={() => setTab('days')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={tab === 'days'
              ? { backgroundColor: 'var(--navy)', color: 'white' }
              : { backgroundColor: '#f3f4f6', color: '#374151' }}>
            Календарь рабочих дней
          </button>
          <button onClick={() => setTab('hours')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={tab === 'hours'
              ? { backgroundColor: 'var(--gold)', color: 'white' }
              : { backgroundColor: '#f3f4f6', color: '#374151' }}>
            Расписание рабочего дня
          </button>
          <button onClick={() => setTab('extra')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={tab === 'extra'
              ? { backgroundColor: '#d97706', color: 'white' }
              : { backgroundColor: '#f3f4f6', color: '#374151' }}>
            Подработка на дату
          </button>
        </div>
      </div>

      <div className="p-3 md:p-6">
        {tab === 'days' ? (
          <WorkDaysCalendar mops={userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])} />
        ) : tab === 'hours' ? (
          <WorkHoursSchedule
            mops={userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])}
            selectedMop={selectedMop}
            onSelectMop={setSelectedMop}
            readonly={false}
          />
        ) : (
          <ExtraSlotsSchedule
            mops={userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])}
            selectedMop={selectedMop}
            onSelectMop={setSelectedMop}
          />
        )}
      </div>
    </div>
  )
}
