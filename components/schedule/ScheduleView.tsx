'use client'

import { useState } from 'react'
import type { MopName, UserRole } from '@/types'
import WorkDaysCalendar from './WorkDaysCalendar'
import WorkHoursSchedule from './WorkHoursSchedule'

const MOPS: MopName[] = ['Владимир', 'Анастасия', 'Ксения']

interface Props {
  userRole: UserRole
  userMopName: MopName | null
}

export default function ScheduleView({ userRole, userMopName }: Props) {
  const [tab, setTab] = useState<'days' | 'hours'>('days')
  const [selectedMop, setSelectedMop] = useState<MopName>(
    userRole === 'mop' && userMopName ? userMopName : MOPS[0]
  )

  return (
    <div>
      {/* Шапка */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>Расписание менеджеров</h2>
        <div className="flex gap-2">
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
        </div>
      </div>

      <div className="p-6">
        {tab === 'days' ? (
          <WorkDaysCalendar mops={userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])} />
        ) : (
          <WorkHoursSchedule
            mops={userRole === 'rop' ? MOPS : (userMopName ? [userMopName] : [])}
            selectedMop={selectedMop}
            onSelectMop={setSelectedMop}
            readonly={false}
          />
        )}
      </div>
    </div>
  )
}
