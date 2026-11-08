import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

// ---------- Formato ----------

const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const solesExactos = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })

export const fmt = {
  soles: (n: number | null | undefined) => soles.format(Number(n || 0)),
  solesExactos: (n: number | null | undefined) => solesExactos.format(Number(n || 0)),
  fecha: (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  fechaHora: (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '—',
  numero: (n: number) => n.toLocaleString('es-PE'),
}

// ---------- Componentes ----------

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca-600 text-white hover:bg-marca-700 disabled:bg-marca-500/50',
  secundario: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50',
  peligro: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
  fantasma: 'text-marca-700 hover:bg-marca-50 disabled:opacity-50',
}

export function Boton({
  variante = 'primario',
  className = '',
  cargando,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${VARIANTES[variante]} ${className}`}
    >
      {cargando && <Spinner pequeno />}
      {children}
    </button>
  )
}

export function Campo({
  etiqueta,
  ayuda,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-slate-700">{etiqueta}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-100"
      />
      {ayuda && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}
    </label>
  )
}

export function Selector({
  etiqueta,
  opciones,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta?: string; opciones: [string, string][] }) {
  const select = (
    <select
      {...props}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-100"
    >
      {opciones.map(([valor, texto]) => (
        <option key={valor} value={valor}>
          {texto}
        </option>
      ))}
    </select>
  )
  if (!etiqueta) return <div className={className}>{select}</div>
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-slate-700">{etiqueta}</span>
      {select}
    </label>
  )
}

export function Spinner({ pequeno }: { pequeno?: boolean }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${pequeno ? 'h-3.5 w-3.5' : 'h-6 w-6 text-marca-600'}`}
      role="status"
      aria-label="Cargando"
    />
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
      <Spinner /> {texto}
    </div>
  )
}

export function Alerta({ children, tipo = 'error' }: { children: ReactNode; tipo?: 'error' | 'ok' | 'info' }) {
  const estilos = {
    error: 'border-red-200 bg-red-50 text-red-800',
    ok: 'border-green-200 bg-green-50 text-green-800',
    info: 'border-marca-100 bg-marca-50 text-marca-900',
  }
  return <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${estilos[tipo]}`}>{children}</div>
}

const COLORES_INSIGNIA: Record<string, string> = {
  caliente: 'bg-red-100 text-red-700',
  tibio: 'bg-amber-100 text-amber-800',
  frio: 'bg-sky-100 text-sky-700',
  nuevo: 'bg-slate-100 text-slate-700',
  contactado: 'bg-indigo-100 text-indigo-700',
  calificado: 'bg-violet-100 text-violet-700',
  convertido: 'bg-green-100 text-green-700',
  descartado: 'bg-zinc-200 text-zinc-600',
  prospecto: 'bg-slate-100 text-slate-700',
  cliente: 'bg-green-100 text-green-700',
  inactivo: 'bg-zinc-200 text-zinc-600',
  A: 'bg-green-100 text-green-800',
  B: 'bg-amber-100 text-amber-800',
  C: 'bg-slate-100 text-slate-700',
  pendiente: 'bg-amber-100 text-amber-800',
  completada: 'bg-green-100 text-green-700',
  cancelada: 'bg-zinc-200 text-zinc-600',
  vencida: 'bg-red-100 text-red-700',
  borrador: 'bg-slate-100 text-slate-700',
  enviada: 'bg-indigo-100 text-indigo-700',
  aceptada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
  admin: 'bg-violet-100 text-violet-700',
  gerente: 'bg-indigo-100 text-indigo-700',
  vendedor: 'bg-slate-100 text-slate-700',
}

export function Insignia({ valor, texto }: { valor: string; texto?: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLORES_INSIGNIA[valor] || 'bg-slate-100 text-slate-700'}`}>
      {texto ?? valor}
    </span>
  )
}

export function Modal({
  titulo,
  abierto,
  onCerrar,
  children,
  ancho = 'max-w-lg',
}: {
  titulo: string
  abierto: boolean
  onCerrar: () => void
  children: ReactNode
  ancho?: string
}) {
  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [abierto, onCerrar])
  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-10" onMouseDown={onCerrar}>
      <div className={`w-full ${ancho} rounded-xl bg-white shadow-xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold">{titulo}</h2>
          <button onClick={onCerrar} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white ${className}`}>{children}</div>
}

export function Encabezado({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function Vacio({ texto }: { texto: string }) {
  return <div className="py-12 text-center text-sm text-slate-500">{texto}</div>
}

/** Tabla con scroll horizontal en pantallas chicas. */
export function Tabla({ cabeceras, children }: { cabeceras: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {cabeceras.map((c) => (
              <th key={c} className="whitespace-nowrap px-4 py-2.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}
