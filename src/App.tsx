import { useState } from 'react'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import MembershipsPage from './pages/MembershipsPage'
import MetricsPage from './pages/MetricsPage'
import SessionsPage from './pages/SessionsPage'
import SettingsPage from './pages/SettingsPage'

type PageId = 'dashboard' | 'sessions' | 'memberships' | 'inventory' | 'metrics' | 'settings'

const PAGES: Array<{ id: PageId; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Panel', icon: '▦' },
  { id: 'sessions', label: 'Sesiones', icon: '↯' },
  { id: 'memberships', label: 'Mensualidades', icon: '◈' },
  { id: 'inventory', label: 'Inventario', icon: '▤' },
  { id: 'metrics', label: 'Métricas', icon: '◔' },
  { id: 'settings', label: 'Respaldos', icon: '⭳' }
]

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const current = PAGES.find((item) => item.id === page) ?? PAGES[0]
  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">RF</span>
          <div>
            <strong>Rutina Fit</strong>
            <small>Recepción</small>
          </div>
        </div>

        <nav className="nav" aria-label="Secciones">
          {PAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={page === item.id ? 'active' : ''}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          Base local · SQLite
          <br />
          Uso interno del administrador
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Administración</p>
            <h1>{current.label}</h1>
          </div>
          <span className="topbar-date">{today}</span>
        </header>

        {page === 'dashboard' && <DashboardPage />}
        {page === 'sessions' && <SessionsPage />}
        {page === 'memberships' && <MembershipsPage />}
        {page === 'inventory' && <InventoryPage />}
        {page === 'metrics' && <MetricsPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
