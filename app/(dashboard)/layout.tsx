import Sidebar from '@/components/ui/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar userName="Тест РОП" userRole="rop" />
      <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--cream)' }}>
        {children}
      </main>
    </div>
  )
}
