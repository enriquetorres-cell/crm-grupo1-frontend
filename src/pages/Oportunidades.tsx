import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { api, mensajeError } from '../api'
import { Alerta, Boton, Campo, Cargando, Encabezado, Insignia, Modal, Selector, fmt } from '../components/ui'
import { useSesion } from '../sesion'
import type { Cotizacion, EstadoCotizacion, Etapa, Oportunidad, PaginaSql, Producto } from '../tipos'

const ETAPAS: { etapa: Etapa; texto: string; color: string }[] = [
  { etapa: 'prospeccion', texto: 'Prospección', color: 'bg-slate-400' },
  { etapa: 'calificacion', texto: 'Calificación', color: 'bg-sky-500' },
  { etapa: 'propuesta', texto: 'Propuesta', color: 'bg-indigo-500' },
  { etapa: 'negociacion', texto: 'Negociación', color: 'bg-violet-500' },
  { etapa: 'ganada', texto: 'Ganada', color: 'bg-green-500' },
  { etapa: 'perdida', texto: 'Perdida', color: 'bg-red-400' },
]
const ORDEN = ETAPAS.map((e) => e.etapa)
const POR_COLUMNA = 15

type Columna = { total: number; page: number; items: Oportunidad[] }

export default function Oportunidades() {
  const [columnas, setColumnas] = useState<Partial<Record<Etapa, Columna>>>({})
  const [error, setError] = useState('')
  const [arrastrando, setArrastrando] = useState<Oportunidad | null>(null)
  const [sobre, setSobre] = useState<Etapa | null>(null)
  const [elegida, setElegida] = useState<number | null>(null)
  const [nueva, setNueva] = useState(false)
  const [perdida, setPerdida] = useState<Oportunidad | null>(null)

  const cargarColumna = useCallback(async (etapa: Etapa, page = 1) => {
    const p = await api<PaginaSql<Oportunidad>>('ms4', '/ms4/oportunidades', { query: { etapa, page, limit: POR_COLUMNA } })
    setColumnas((c) => ({
      ...c,
      [etapa]: { total: p.total, page, items: page === 1 ? p.items : [...(c[etapa]?.items || []), ...p.items] },
    }))
  }, [])

  const cargarTodo = useCallback(() => {
    setError('')
    Promise.all(ORDEN.map((e) => cargarColumna(e))).catch((e) => setError(mensajeError(e)))
  }, [cargarColumna])

  useEffect(cargarTodo, [cargarTodo])

  const mover = async (o: Oportunidad, etapa: Etapa, motivo?: string) => {
    if (o.etapa === etapa) return
    if (etapa === 'perdida' && !motivo) {
      setPerdida(o)
      return
    }
    setError('')
    try {
      await api('ms4', `/ms4/oportunidades/${o.id}/etapa`, { metodo: 'PATCH', cuerpo: { etapa, motivo } })
      await Promise.all([cargarColumna(o.etapa), cargarColumna(etapa)])
    } catch (e) {
      setError(`No se pudo mover "${o.titulo}" a ${etapa}: ${mensajeError(e)}`)
    }
  }

  const soltar = (etapa: Etapa) => (e: DragEvent) => {
    e.preventDefault()
    setSobre(null)
    if (arrastrando) mover(arrastrando, etapa)
    setArrastrando(null)
  }

  const cargado = ORDEN.every((e) => columnas[e])

  return (
    <>
      <Encabezado titulo="Oportunidades" subtitulo="Arrastra una tarjeta para cambiar de etapa · el backend valida cada regla">
        <Boton onClick={() => setNueva(true)}>+ Nueva oportunidad</Boton>
      </Encabezado>
      {error && (
        <div className="mb-4">
          <Alerta>{error}</Alerta>
        </div>
      )}
      {!cargado ? (
        <Cargando />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
          <div className="flex min-w-max gap-3">
            {ETAPAS.map(({ etapa, texto, color }) => {
              const col = columnas[etapa]!
              const suma = col.items.reduce((s, o) => s + Number(o.monto_ponderado), 0)
              return (
                <div
                  key={etapa}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setSobre(etapa)
                  }}
                  onDragLeave={() => setSobre((s) => (s === etapa ? null : s))}
                  onDrop={soltar(etapa)}
                  className={`flex w-64 shrink-0 flex-col rounded-xl border bg-slate-100/70 transition ${sobre === etapa ? 'border-marca-500 bg-marca-50' : 'border-transparent'}`}
                >
                  <div className="px-3 pb-2 pt-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                      {texto}
                      <span className="ml-auto rounded-full bg-white px-2 text-xs font-medium text-slate-600">{fmt.numero(col.total)}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">Ponderado visible: {fmt.soles(suma)}</div>
                  </div>
                  <div className="flex max-h-[65vh] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                    {col.items.map((o) => (
                      <button
                        key={o.id}
                        draggable={etapa !== 'ganada' && etapa !== 'perdida'}
                        onDragStart={() => setArrastrando(o)}
                        onDragEnd={() => setArrastrando(null)}
                        onClick={() => setElegida(o.id)}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-left text-sm shadow-sm transition hover:border-marca-500"
                      >
                        <div className="line-clamp-2 font-medium leading-snug">{o.titulo}</div>
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{fmt.soles(o.monto)}</span>
                          <span className="text-slate-500">{Math.round(Number(o.probabilidad) * 100)} %</span>
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">{o.propietario}</div>
                      </button>
                    ))}
                    {col.items.length < col.total && (
                      <Boton variante="fantasma" className="text-xs" onClick={() => cargarColumna(etapa, col.page + 1).catch((e) => setError(mensajeError(e)))}>
                        Ver más ({fmt.numero(col.total - col.items.length)})
                      </Boton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <NuevaOportunidad abierto={nueva} onCerrar={() => setNueva(false)} onCreada={() => cargarColumna('prospeccion')} />
      <MotivoPerdida
        oportunidad={perdida}
        onCerrar={() => setPerdida(null)}
        onConfirmar={(motivo) => {
          if (perdida) mover(perdida, 'perdida', motivo)
          setPerdida(null)
        }}
      />
      {elegida !== null && (
        <DetalleOportunidad
          id={elegida}
          onCerrar={() => setElegida(null)}
          onCambio={cargarTodo}
          onMover={(o, etapa) => mover(o, etapa)}
        />
      )}
    </>
  )
}

function MotivoPerdida({ oportunidad, onCerrar, onConfirmar }: { oportunidad: Oportunidad | null; onCerrar: () => void; onConfirmar: (m: string) => void }) {
  const [motivo, setMotivo] = useState('')
  return (
    <Modal titulo="Marcar como perdida" abierto={!!oportunidad} onCerrar={onCerrar}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onConfirmar(motivo)
          setMotivo('')
        }}
        className="space-y-3"
      >
        <p className="text-sm text-slate-600">{oportunidad?.titulo}</p>
        <Campo etiqueta="Motivo de la pérdida" value={motivo} onChange={(e) => setMotivo(e.target.value)} required autoFocus />
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="peligro">
            Marcar perdida
          </Boton>
        </div>
      </form>
    </Modal>
  )
}

function NuevaOportunidad({ abierto, onCerrar, onCreada }: { abierto: boolean; onCerrar: () => void; onCreada: () => void }) {
  const [f, setF] = useState({ titulo: '', monto: '', fecha_cierre_estimada: '', cuenta_id: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const cambiar = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await api('ms4', '/ms4/oportunidades', {
        metodo: 'POST',
        cuerpo: {
          titulo: f.titulo,
          monto: Number(f.monto || 0),
          fecha_cierre_estimada: f.fecha_cierre_estimada || null,
          cuenta_id: f.cuenta_id ? Number(f.cuenta_id) : null,
        },
      })
      onCreada()
      setF({ titulo: '', monto: '', fecha_cierre_estimada: '', cuenta_id: '' })
      onCerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal titulo="Nueva oportunidad" abierto={abierto} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="space-y-3">
        {error && <Alerta>{error}</Alerta>}
        <Campo etiqueta="Título" value={f.titulo} onChange={cambiar('titulo')} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Monto (S/)" type="number" min={0} value={f.monto} onChange={cambiar('monto')} />
          <Campo etiqueta="Cierre estimado" type="date" value={f.fecha_cierre_estimada} onChange={cambiar('fecha_cierre_estimada')} />
        </div>
        <Campo etiqueta="ID de cuenta (opcional)" type="number" min={1} value={f.cuenta_id} onChange={cambiar('cuenta_id')} />
        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={cargando}>
            Crear
          </Boton>
        </div>
      </form>
    </Modal>
  )
}

const SIGUIENTE_COTIZACION: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  borrador: ['enviada'],
  enviada: ['aceptada', 'rechazada'],
  aceptada: [],
  rechazada: [],
}

function DetalleOportunidad({
  id,
  onCerrar,
  onCambio,
  onMover,
}: {
  id: number
  onCerrar: () => void
  onCambio: () => void
  onMover: (o: Oportunidad, e: Etapa) => Promise<void>
}) {
  const { tieneRol } = useSesion()
  const [o, setO] = useState<Oportunidad | null>(null)
  const [error, setError] = useState('')
  const [cotizar, setCotizar] = useState(false)
  const [documentos, setDocumentos] = useState<Record<number, string>>({})

  const cargar = useCallback(() => {
    api<Oportunidad>('ms4', `/ms4/oportunidades/${id}`)
      .then(setO)
      .catch((e) => setError(mensajeError(e)))
  }, [id])
  useEffect(cargar, [cargar])

  const cambiarCotizacion = async (c: Cotizacion, estado: EstadoCotizacion) => {
    setError('')
    try {
      await api('ms4', `/ms4/cotizaciones/${c.id}/estado`, { metodo: 'PATCH', cuerpo: { estado } })
      cargar()
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  const moverYRecargar = async (etapa: Etapa) => {
    if (!o) return
    await onMover(o, etapa)
    cargar()
  }

  if (!o) {
    return (
      <Modal titulo="Oportunidad" abierto onCerrar={onCerrar}>
        {error ? <Alerta>{error}</Alerta> : <Cargando />}
      </Modal>
    )
  }

  const i = ORDEN.indexOf(o.etapa)
  const abierta = i < 4
  return (
    <Modal titulo={o.titulo} abierto onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Insignia valor={o.etapa} texto={ETAPAS[i].texto} />
          <span className="text-slate-500">
            {fmt.solesExactos(o.monto)} · {Math.round(Number(o.probabilidad) * 100)} % → ponderado {fmt.solesExactos(o.monto_ponderado)}
          </span>
        </div>
        {error && <Alerta>{error}</Alerta>}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Propietario</dt>
            <dd className="truncate">{o.propietario}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Cierre estimado</dt>
            <dd>{fmt.fecha(o.fecha_cierre_estimada)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Cuenta / lead</dt>
            <dd className="truncate">{o.cuenta_id ? `cuenta ${o.cuenta_id}` : o.lead_id || '—'}</dd>
          </div>
        </dl>
        {o.motivo_perdida && <Alerta tipo="info">Perdida: {o.motivo_perdida}</Alerta>}

        {abierta && (
          <div className="flex flex-wrap gap-2 rounded-lg bg-slate-50 p-3">
            {i > 0 && tieneRol('gerente', 'admin') && (
              <Boton variante="secundario" onClick={() => moverYRecargar(ORDEN[i - 1])}>
                ← {ETAPAS[i - 1].texto}
              </Boton>
            )}
            <Boton onClick={() => moverYRecargar(ORDEN[i + 1])}>{ETAPAS[i + 1].texto} →</Boton>
            <Boton variante="peligro" onClick={() => moverYRecargar('perdida')}>
              Perdida
            </Boton>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Cotizaciones</span>
            {abierta && (
              <Boton variante="fantasma" className="text-xs" onClick={() => setCotizar(true)}>
                + Nueva cotización
              </Boton>
            )}
          </div>
          {o.cotizaciones?.length ? (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {o.cotizaciones.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div>
                    <div className="font-medium">
                      N.º {c.id} · {fmt.solesExactos(c.total)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Subtotal {fmt.solesExactos(c.subtotal)} − {c.descuento_pct} % + IGV {fmt.solesExactos(c.igv)} · vence {fmt.fecha(c.vence_en)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Insignia valor={c.estado} />
                    {(c.documento_url || documentos[c.id]) && (
                      <a href={c.documento_url || documentos[c.id]} target="_blank" rel="noreferrer" className="text-xs text-marca-600 hover:underline">
                        Ver documento
                      </a>
                    )}
                    {SIGUIENTE_COTIZACION[c.estado].map((e) => (
                      <Boton key={e} variante="secundario" className="px-2 py-1 text-xs" onClick={() => cambiarCotizacion(c, e)}>
                        {e === 'enviada' ? 'Enviar' : e === 'aceptada' ? 'Aceptar' : 'Rechazar'}
                      </Boton>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Sin cotizaciones. Para pasar a Propuesta se necesita al menos una.</p>
          )}
        </div>
      </div>
      {cotizar && (
        <NuevaCotizacion
          oportunidad={o}
          onCerrar={() => setCotizar(false)}
          onCreada={(c) => {
            if (c.documento_url) setDocumentos((d) => ({ ...d, [c.id]: c.documento_url! }))
            setCotizar(false)
            cargar()
            onCambio()
          }}
        />
      )}
    </Modal>
  )
}

function NuevaCotizacion({ oportunidad, onCerrar, onCreada }: { oportunidad: Oportunidad; onCerrar: () => void; onCreada: (c: Cotizacion) => void }) {
  const { sesion } = useSesion()
  const [productos, setProductos] = useState<Producto[]>([])
  const [lineas, setLineas] = useState<{ producto_id: number; cantidad: number }[]>([])
  const [descuento, setDescuento] = useState('0')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const maximo = { vendedor: 10, gerente: 25, admin: 100 }[sesion?.usuario.rol || 'vendedor']

  useEffect(() => {
    api<{ items: Producto[] }>('ms4', '/ms4/productos')
      .then((r) => {
        setProductos(r.items)
        if (r.items[0]) setLineas([{ producto_id: r.items[0].id, cantidad: 1 }])
      })
      .catch((e) => setError(mensajeError(e)))
  }, [])

  const precio = (id: number) => Number(productos.find((p) => p.id === id)?.precio || 0)
  const subtotal = lineas.reduce((s, l) => s + precio(l.producto_id) * l.cantidad, 0)
  const base = subtotal * (1 - Number(descuento || 0) / 100)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      onCreada(
        await api<Cotizacion>('ms4', '/ms4/cotizaciones', {
          metodo: 'POST',
          cuerpo: { oportunidad_id: oportunidad.id, items: lineas, descuento_pct: Number(descuento || 0) },
        }),
      )
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal titulo={`Cotización · ${oportunidad.titulo}`} abierto onCerrar={onCerrar}>
      <form onSubmit={enviar} className="space-y-3">
        {error && <Alerta>{error}</Alerta>}
        {lineas.map((l, i) => (
          <div key={i} className="flex items-end gap-2">
            <Selector
              etiqueta={i === 0 ? 'Producto' : undefined}
              className="flex-1"
              value={String(l.producto_id)}
              onChange={(e) => setLineas(lineas.map((x, j) => (j === i ? { ...x, producto_id: Number(e.target.value) } : x)))}
              opciones={productos.map((p) => [String(p.id), `${p.nombre} · ${fmt.solesExactos(p.precio)}`])}
            />
            <Campo
              etiqueta={i === 0 ? 'Cant.' : ''}
              type="number"
              min={1}
              className="w-20"
              value={l.cantidad}
              onChange={(e) => setLineas(lineas.map((x, j) => (j === i ? { ...x, cantidad: Math.max(1, Number(e.target.value)) } : x)))}
            />
            {lineas.length > 1 && (
              <button type="button" className="mb-2 text-slate-400 hover:text-red-600" onClick={() => setLineas(lineas.filter((_, j) => j !== i))} aria-label="Quitar">
                ✕
              </button>
            )}
          </div>
        ))}
        <Boton type="button" variante="fantasma" className="text-xs" onClick={() => productos[0] && setLineas([...lineas, { producto_id: productos[0].id, cantidad: 1 }])}>
          + Agregar producto
        </Boton>
        <Campo etiqueta="Descuento (%)" type="number" min={0} max={100} value={descuento} onChange={(e) => setDescuento(e.target.value)} ayuda={`Tu rol permite hasta ${maximo} %`} />
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{fmt.solesExactos(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Base imponible</span>
            <span>{fmt.solesExactos(base)}</span>
          </div>
          <div className="flex justify-between">
            <span>IGV 18 %</span>
            <span>{fmt.solesExactos(base * 0.18)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold">
            <span>Total (estimado)</span>
            <span>{fmt.solesExactos(base * 1.18)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={cargando} disabled={!lineas.length}>
            Crear cotización
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
