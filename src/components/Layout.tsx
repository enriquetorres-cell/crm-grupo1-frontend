import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSesion } from '../sesion'
import type { Rol } from '../tipos'
import { Insignia } from './ui'

const MENU: { ruta: string; texto: string; icono: string; roles?: Rol[] }[] = [
  { ruta: '/', texto: 'Panel', icono: '◧' },
  { ruta: '/leads', texto: 'Leads', icono: '◎' },
  { ruta: '/oportunidades', texto: 'Oportunidades', icono: '▤' },
  { ruta: '/cuentas', texto: 'Cuentas', icono: '▣' },
  { ruta: '/agenda', texto: 'Agenda', icono: '◷' },
  { ruta: '/usuarios', texto: 'Usuarios', icono: '◉', roles: ['admin', 'gerente'] },
]

export default function Layout() {
  const { sesion, salir, tieneRol } = useSesion()
  const [menuAbierto, setMenuAbierto] = useState(false)
  if (!sesion) return null

  const enlaces = MENU.filter((m) => !m.roles || tieneRol(...m.roles))

  const navegacion = (
    <nav className="space-y-0.5">
      {[...enlaces, { ruta: '/docs', texto: 'API (Swagger)', icono: '⌘' }].map((m) => (
        <NavLink
          key={m.ruta}
          to={m.ruta}
          end={m.ruta === '/'}
          onClick={() => setMenuAbierto(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-marca-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <span className="w-4 text-center">{m.icono}</span>
          {m.texto}
        </NavLink>
      ))}
    </nav>
  )

  const marca = (
    <div className="mb-6 flex items-center gap-2.5 px-2">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <div>
        <div className="text-sm font-semibold text-white">CRM SaaS</div>
        <div className="text-xs text-slate-400">Grupo 1 · CS2032</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen md:flex">
      {/* Barra lateral (escritorio) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-marca-900 p-4 md:flex">
        {marca}
        {navegacion}
      </aside>

      {/* Menú móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 md:hidden" onClick={() => setMenuAbierto(false)}>
          <aside className="h-full w-64 bg-marca-900 p-4" onClick={(e) => e.stopPropagation()}>
            {marca}
            {navegacion}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
              ☰
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{sesion.tenant_nombre}</div>
              <div className="truncate text-xs text-slate-500">
                {sesion.tenant_id} · plan {sesion.plan}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm text-slate-800">{sesion.usuario.nombre}</div>
              <div className="text-xs text-slate-500">{sesion.usuario.email}</div>
            </div>
            <Insignia valor={sesion.usuario.rol} />
            <button onClick={salir} className="rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              Salir
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
