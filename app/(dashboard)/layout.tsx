'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/ui/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userName="Тест РОП"
        userRole="rop"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: 'var(--cream)' }}>
        {/* Мобильная шапка */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            style={{ color: 'var(--navy)' }}
          >
            <Menu size={22} />
          </button>
          <span className="font-bold text-lg">
            Liga<span style={{ color: 'var(--gold)' }}>Boss</span>
            <span className="text-gray-400 font-normal text-sm ml-1">Hub</span>
          </span>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
