'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, BarChart3, CreditCard, X } from 'lucide-react'

const nav = [
  {
    label: 'Календарь',
    icon: CalendarDays,
    children: [
      { href: '/calendar', label: 'Общий календарь' },
      { href: '/schedule', label: 'Расписание МОПов' },
    ],
  },
  { href: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { href: '/payments', label: 'Оплаты', icon: CreditCard },
]

interface SidebarProps {
  userName: string
  userRole: string
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ userName, userRole, open, onClose }: SidebarProps) {
  const pathname = usePathname()

  const content = (
    <aside className="w-60 min-h-screen flex flex-col h-full" style={{ backgroundColor: 'var(--navy)' }}>
      {/* Логотип */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white border border-white/20"
            style={{ backgroundColor: 'var(--navy-light)' }}>
            LB
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-none">
              Liga<span style={{ color: 'var(--gold)' }}>Boss</span>
            </span>
            <p className="text-white/40 text-xs mt-0.5">Hub</p>
          </div>
        </div>
        {/* Закрыть на мобильном */}
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 md:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Навигация */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          if ('children' in item) {
            const isActive = item.children.some(c => pathname.startsWith(c.href))
            return (
              <div key={item.label}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
                  <item.icon size={17} />
                  {item.label}
                </div>
                <div className="ml-8 space-y-0.5">
                  {item.children.map(child => {
                    const active = pathname.startsWith(child.href)
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={`block px-3 py-1.5 rounded-lg text-sm transition ${
                          active ? 'text-white font-medium' : 'text-white/50 hover:text-white/80'
                        }`}
                        style={active ? { backgroundColor: 'var(--gold)', color: 'white' } : {}}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
              style={active ? { backgroundColor: 'var(--gold)' } : {}}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Пользователь */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--gold)' }}>
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium leading-none truncate">{userName}</p>
            <p className="text-white/40 text-xs mt-0.5">{userRole === 'rop' ? 'Руководитель' : 'Менеджер'}</p>
          </div>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Десктоп — всегда видно */}
      <div className="hidden md:block w-60 flex-shrink-0">
        {content}
      </div>

      {/* Мобильный — drawer */}
      {open && (
        <>
          {/* Затемнение */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onClose}
          />
          {/* Панель */}
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            {content}
          </div>
        </>
      )}
    </>
  )
}
