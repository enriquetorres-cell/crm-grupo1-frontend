import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, mensajeError, paginaCursor } from '../api'
import { Alerta, Cargando, Encabezado, Insignia, Tarjeta, Vacio, fmt } from '../components/ui'
import { useSesion } from '../sesion'
import type { Actividad, Etapa, Lead, PaginaSql } from '../tipos'

interface Pronostico {
  items: { propietario: string; mes: string | null; oportunidades: number; monto: number; monto_ponderado: number }[]
  total_ponderado: number
}

const ABIERTAS: Etapa[] = ['prospeccion', 'calificacion', 'propuesta', 'negociacion']

export default function Panel() {
  const { sesion, tieneRol } = useSesion()
  const [datos, setDatos] = useState<{
    cuentas?: number
    clientes?: number
    porEtapa?: Record<string, number>
    pronostico?: Pronostico
    actividades?: Actividad[]
    calientes?: Lead[]
  }>({})
  const [errores, setErrores] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)
  const esGerente = tieneRol('gerente', 'admin')

  useEffect(() => {
    let vivo = true
    const total = (estado?: string) =>
      api<PaginaSql<unknown>>('ms2', '/ms2/cuentas', { query: { limit: 1, estado } }).then((p) => p.total)
    const etapa = (e: Etapa) =>
      api<PaginaSql<unknown>>('ms4', '/ms4/oportunidades', { query: { limit: 1, etapa: e } }).then((p) => [e, p.total] as const)

    const tareas = {
      cuentas: total(),
      clientes: total('cliente'),
      porEtapa: Promise.all([...ABIERTAS, 'ganada' as Etapa].map(etapa)).then(Object.fromEntries),
      pronostico: esGerente ? api<Pronostico>('ms4', '/ms4/pronostico') : Promise.resolve(undefined),
      actividades: paginaCursor<Actividad>('ms5', '/ms5/actividades', { estado: 'pendiente' }, null, 6).then((p) =>
        p.items.sort((a, b) => (a.vence_en || '').localeCompare(b.vence_en || '')).slice(0, 6),
      ),
      calientes: paginaCursor<Lead>('ms3', '/ms3/leads', { temperatura: 'caliente', estado: 'nuevo' }, null, 6).then((p) =>
        p.items.slice(0, 6),
      ),
    }
    Promise.allSettled(Object.values(tareas)).then((resultados) => {
      if (!vivo) return
      const nuevo: Record<string, unknown> = {}
      const fallos: string[] = []
      Object.keys(tareas).forEach((clave, i) => {
        const r = resultados[i]
        if (r.status === 'fulfilled') nuevo[clave] = r.value
        else fallos.push(`${clave}: ${mensajeError(r.reason)}`)
      })
      setDatos(nuevo)
      setErrores(fallos)
      setCargando(false)
    })
    return () => {
      vivo = false
    }
  }, [esGerente])

  if (cargando) return <Cargando texto="Cargando el panel…" />

  const abiertas = ABIERTAS.reduce((s, e) => s + (datos.porEtapa?.[e] || 0), 0)
  const kpis = [
    { titulo: 'Cuentas', valor: datos.cuentas, detalle: `${fmt.numero(datos.clientes || 0)} clientes`, ruta: '/cuentas' },
    { titulo: 'Oportunidades abiertas', valor: abiertas, detalle: `${fmt.numero(datos.porEtapa?.ganada || 0)} ganadas`, ruta: '/oportunidades' },
    ...(datos.pronostico
      ? [{ titulo: 'Pronóstico ponderado', valor: undefined, texto: fmt.soles(datos.pronostico.total_ponderado), detalle: 'Monto × probabilidad de la etapa', ruta: '/oportunidades' }]
      : []),
    { titulo: 'Tareas pendientes', valor: datos.actividades?.length, detalle: 'próximas en tu agenda', ruta: '/agenda' },
  ]

  return (
    <>
      <Encabezado titulo={`Hola, ${sesion?.usuario.nombre.split(' ')[0]}`} subtitulo={`Resumen de ${sesion?.tenant_nombre}${esGerente ? '' : ' · solo tus registros'}`} />
      {errores.length > 0 && (
        <div className="mb-4">
          <Alerta>No se pudo cargar: {errores.join(' · ')}</Alerta>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.titulo} to={k.ruta}>
            <Tarjeta className="h-full p-4 transition hover:border-marca-500">
              <div className="text-sm text-slate-500">{k.titulo}</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{'texto' in k ? k.texto : fmt.numero(k.valor || 0)}</div>
              <div className="mt-1 text-xs text-slate-500">{k.detalle}</div>
            </Tarjeta>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Tarjeta>
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Pipeline por etapa</div>
          <div className="space-y-3 p-4">
            {[...ABIERTAS, 'ganada' as Etapa].map((e) => {
              const n = datos.porEtapa?.[e] || 0
              const max = Math.max(1, ...Object.values(datos.porEtapa || {}))
              return (
                <div key={e} className="flex items-center gap-3 text-sm">
                  <div className="w-28 shrink-0 capitalize text-slate-600">{e}</div>
                  <div className="h-3 flex-1 rounded-full bg-slate-100">
                    <div className={`h-3 rounded-full ${e === 'ganada' ? 'bg-green-500' : 'bg-marca-500'}`} style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <div className="w-14 text-right tabular-nums text-slate-700">{fmt.numero(n)}</div>
                </div>
              )
            })}
          </div>
        </Tarjeta>

        <Tarjeta>
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-semibold">Leads calientes sin contactar</span>
            <Link to="/leads" className="text-xs text-marca-600 hover:underline">
              Ver leads
            </Link>
          </div>
          {datos.calientes?.length ? (
            <ul className="divide-y divide-slate-100">
              {datos.calientes.map((l) => (
                <li key={l.lead_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{l.empresa}</div>
                    <div className="truncate text-xs text-slate-500">
                      {[l.nombre, l.apellido].filter(Boolean).join(' ')} · {l.cargo || 'sin cargo'}
                    </div>
                  </div>
                  <Insignia valor={l.temperatura} texto={`${l.puntaje} pts`} />
                </li>
              ))}
            </ul>
          ) : (
            <Vacio texto="No hay leads calientes nuevos" />
          )}
        </Tarjeta>

        <Tarjeta>
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-semibold">Próximas actividades</span>
            <Link to="/agenda" className="text-xs text-marca-600 hover:underline">
              Ver agenda
            </Link>
          </div>
          {datos.actividades?.length ? (
            <ul className="divide-y divide-slate-100">
              {datos.actividades.map((a) => (
                <li key={a.actividad_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{a.titulo}</div>
                    <div className="text-xs capitalize text-slate-500">
                      {a.tipo} · {a.vendedor}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-slate-500">{fmt.fechaHora(a.vence_en)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio texto="No tienes actividades pendientes" />
          )}
        </Tarjeta>

        {datos.pronostico && (
          <Tarjeta>
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Pronóstico por mes de cierre</div>
            <div className="space-y-2 p-4 text-sm">
              {Object.entries(
                datos.pronostico.items.reduce<Record<string, number>>((acc, f) => {
                  const mes = f.mes || 'sin fecha'
                  acc[mes] = (acc[mes] || 0) + Number(f.monto_ponderado)
                  return acc
                }, {}),
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(0, 8)
                .map(([mes, monto]) => (
                  <div key={mes} className="flex justify-between border-b border-slate-100 pb-1.5 last:border-0">
                    <span className="text-slate-600">{mes}</span>
                    <span className="tabular-nums font-medium">{fmt.soles(monto)}</span>
                  </div>
                ))}
            </div>
          </Tarjeta>
        )}
      </div>
    </>
  )
}
