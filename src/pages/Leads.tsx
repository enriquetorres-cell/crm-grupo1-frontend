import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, mensajeError, paginaCursor } from '../api'
import { Alerta, Boton, Campo, Cargando, Encabezado, Insignia, Modal, Selector, Tabla, Tarjeta, Vacio, fmt } from '../components/ui'
import type { EntradaHistorial, EstadoLead, Lead, PaginaCursor } from '../tipos'

// Mismas transiciones que ms3-leads/src/reglas.py ('convertido' solo con el botón Convertir).
const TRANSICIONES: Record<EstadoLead, EstadoLead[]> = {
  nuevo: ['contactado', 'descartado'],
  contactado: ['calificado', 'descartado'],
  calificado: ['descartado'],
  convertido: [],
  descartado: [],
}

export default function Leads() {
  const [filtro, setFiltro] = useState({ estado: '', temperatura: '' })
  const [leads, setLeads] = useState<Lead[]>([])
  const [siguiente, setSiguiente] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [nuevo, setNuevo] = useState(false)
  const [importar, setImportar] = useState(false)
  const [elegido, setElegido] = useState<Lead | null>(null)

  const cargar = useCallback(
    async (desde: string | null = null) => {
      setCargando(true)
      setError('')
      try {
        const p = await paginaCursor<Lead>('ms3', '/ms3/leads', filtro, desde, 25)
        setLeads((actuales) => (desde ? [...actuales, ...p.items] : p.items))
        setSiguiente(p.siguiente)
      } catch (e) {
        setError(mensajeError(e))
      } finally {
        setCargando(false)
      }
    },
    [filtro],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  const actualizado = (l: Lead) => {
    setLeads((ls) => ls.map((x) => (x.lead_id === l.lead_id ? l : x)))
    setElegido(l)
  }

  return (
    <>
      <Encabezado titulo="Leads" subtitulo="Se puntúan y se asignan solos al vendedor con menos carga">
        <Boton variante="secundario" onClick={() => setImportar(true)}>
          Importar CSV
        </Boton>
        <Boton onClick={() => setNuevo(true)}>+ Nuevo lead</Boton>
      </Encabezado>

      <Tarjeta>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-3">
          <Selector
            value={filtro.estado}
            onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}
            opciones={[['', 'Todos los estados'], ['nuevo', 'Nuevo'], ['contactado', 'Contactado'], ['calificado', 'Calificado'], ['convertido', 'Convertido'], ['descartado', 'Descartado']]}
          />
          <Selector
            value={filtro.temperatura}
            onChange={(e) => setFiltro({ ...filtro, temperatura: e.target.value })}
            opciones={[['', 'Todas las temperaturas'], ['caliente', 'Caliente'], ['tibio', 'Tibio'], ['frio', 'Frío']]}
          />
        </div>
        {error && (
          <div className="p-3">
            <Alerta>{error}</Alerta>
          </div>
        )}
        {leads.length === 0 && !cargando ? (
          <Vacio texto="No hay leads con esos filtros" />
        ) : (
          <Tabla cabeceras={['Empresa', 'Contacto', 'Puntaje', 'Estado', 'Propietario', 'Creado']}>
            {leads.map((l) => (
              <tr key={l.lead_id} className="cursor-pointer hover:bg-slate-50" onClick={() => setElegido(l)}>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{l.empresa}</div>
                  <div className="text-xs text-slate-500">{l.fuente}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div>{[l.nombre, l.apellido].filter(Boolean).join(' ') || '—'}</div>
                  <div className="text-xs text-slate-500">{l.email || l.telefono}</div>
                </td>
                <td className="px-4 py-2.5">
                  <Insignia valor={l.temperatura} texto={`${l.puntaje} · ${l.temperatura}`} />
                </td>
                <td className="px-4 py-2.5">
                  <Insignia valor={l.estado} />
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{l.propietario || 'sin asignar'}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{fmt.fecha(l.creado_en)}</td>
              </tr>
            ))}
          </Tabla>
        )}
        {cargando && <Cargando />}
        {siguiente && !cargando && (
          <div className="border-t border-slate-200 p-3 text-center">
            <Boton variante="fantasma" onClick={() => cargar(siguiente)}>
              Cargar más
            </Boton>
          </div>
        )}
      </Tarjeta>

      <NuevoLead abierto={nuevo} onCerrar={() => setNuevo(false)} onCreado={(l) => setLeads((ls) => [l, ...ls])} />
      <ImportarCsv abierto={importar} onCerrar={() => setImportar(false)} onTerminado={() => cargar()} />
      {elegido && <DetalleLead lead={elegido} onCerrar={() => setElegido(null)} onCambio={actualizado} />}
    </>
  )
}

function NuevoLead({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: (l: Lead) => void }) {
  const vacio = { empresa: '', nombre: '', apellido: '', cargo: '', email: '', telefono: '', fuente: 'web', ruc: '', empleados: '', monto_estimado: '' }
  const [f, setF] = useState(vacio)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const cambiar = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const lead = await api<Lead>('ms3', '/ms3/leads', {
        metodo: 'POST',
        cuerpo: { ...f, empleados: Number(f.empleados || 0), monto_estimado: Number(f.monto_estimado || 0) },
      })
      onCreado(lead)
      setF(vacio)
      onCerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal titulo="Nuevo lead" abierto={abierto} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="space-y-3">
        {error && <Alerta>{error}</Alerta>}
        <Campo etiqueta="Empresa" value={f.empresa} onChange={cambiar('empresa')} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre" value={f.nombre} onChange={cambiar('nombre')} />
          <Campo etiqueta="Apellido" value={f.apellido} onChange={cambiar('apellido')} />
          <Campo etiqueta="Cargo" value={f.cargo} onChange={cambiar('cargo')} ayuda="Gerente, director, CEO… suman puntaje" />
          <Selector etiqueta="Fuente" value={f.fuente} onChange={cambiar('fuente')} opciones={[['referido', 'Referido'], ['web', 'Web'], ['evento', 'Evento'], ['llamada_fria', 'Llamada fría']]} />
          <Campo etiqueta="Email" type="email" value={f.email} onChange={cambiar('email')} />
          <Campo etiqueta="Teléfono" value={f.telefono} onChange={cambiar('telefono')} />
          <Campo etiqueta="Empleados" type="number" min={0} value={f.empleados} onChange={cambiar('empleados')} />
          <Campo etiqueta="Monto estimado (S/)" type="number" min={0} value={f.monto_estimado} onChange={cambiar('monto_estimado')} />
        </div>
        <Campo etiqueta="RUC (opcional)" value={f.ruc} onChange={cambiar('ruc')} />
        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={cargando}>
            Crear lead
          </Boton>
        </div>
      </form>
    </Modal>
  )
}

function DetalleLead({ lead, onCerrar, onCambio }: { lead: Lead; onCerrar: () => void; onCambio: (l: Lead) => void }) {
  const [historial, setHistorial] = useState<EntradaHistorial[] | null>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [ocupado, setOcupado] = useState('')

  useEffect(() => {
    api<PaginaCursor<EntradaHistorial>>('ms5', `/ms5/historial/lead-${lead.lead_id}`)
      .then((p) => setHistorial(p.items))
      .catch(() => setHistorial([]))
  }, [lead.lead_id, lead.estado])

  const accion = async (nombre: string, llamada: () => Promise<Lead>, mensaje: string) => {
    setError('')
    setOk('')
    setOcupado(nombre)
    try {
      onCambio(await llamada())
      setOk(mensaje)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setOcupado('')
    }
  }

  const cambiarEstado = (estado: EstadoLead) =>
    accion(estado, () => api<Lead>('ms3', `/ms3/leads/${lead.lead_id}/estado`, { metodo: 'PATCH', cuerpo: { estado, motivo } }), `Lead ${estado}`)

  const convertir = () =>
    accion(
      'convertir',
      () => api<Lead>('ms3', `/ms3/leads/${lead.lead_id}/convertir`, { metodo: 'POST' }),
      'Lead convertido: el evento lead.convertido crea la cuenta (MS2), la oportunidad (MS4) y el historial (MS5) en unos segundos.',
    )

  const datos: [string, string][] = [
    ['Contacto', [lead.nombre, lead.apellido].filter(Boolean).join(' ') || '—'],
    ['Cargo', lead.cargo || '—'],
    ['Email', lead.email || '—'],
    ['Teléfono', lead.telefono || '—'],
    ['Fuente', lead.fuente],
    ['Empleados', String(lead.empleados)],
    ['Monto estimado', fmt.soles(lead.monto_estimado)],
    ['Propietario', lead.propietario || 'sin asignar'],
    ['RUC', lead.ruc || '—'],
    ['Creado', fmt.fechaHora(lead.creado_en)],
  ]

  return (
    <Modal titulo={lead.empresa} abierto onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Insignia valor={lead.estado} />
          <Insignia valor={lead.temperatura} texto={`${lead.puntaje} pts · ${lead.temperatura}`} />
          <span className="text-xs text-slate-400">{lead.lead_id}</span>
        </div>
        {error && <Alerta>{error}</Alerta>}
        {ok && <Alerta tipo="ok">{ok}</Alerta>}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          {datos.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="truncate">{v}</dd>
            </div>
          ))}
        </dl>
        {lead.motivo_descarte && <Alerta tipo="info">Descartado: {lead.motivo_descarte}</Alerta>}

        {(TRANSICIONES[lead.estado].length > 0 || lead.estado === 'calificado') && (
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Avanzar</div>
            <div className="flex flex-wrap items-end gap-2">
              {TRANSICIONES[lead.estado]
                .filter((e) => e !== 'descartado')
                .map((e) => (
                  <Boton key={e} variante="secundario" cargando={ocupado === e} onClick={() => cambiarEstado(e)}>
                    Marcar {e}
                  </Boton>
                ))}
              {lead.estado === 'calificado' && (
                <Boton cargando={ocupado === 'convertir'} onClick={convertir}>
                  Convertir en cliente
                </Boton>
              )}
            </div>
            {TRANSICIONES[lead.estado].includes('descartado') && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Campo etiqueta="Motivo del descarte" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="min-w-[14rem] flex-1" />
                <Boton variante="peligro" cargando={ocupado === 'descartado'} onClick={() => cambiarEstado('descartado')}>
                  Descartar
                </Boton>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Historial (MS5)</div>
          {historial === null ? (
            <Cargando />
          ) : historial.length === 0 ? (
            <p className="text-sm text-slate-500">Sin eventos todavía.</p>
          ) : (
            <ol className="space-y-1.5 border-l-2 border-marca-100 pl-4 text-sm">
              {historial.map((h) => (
                <li key={h.orden}>
                  <span className="text-xs text-slate-500">{fmt.fechaHora(h.ocurrido_en)}</span> · {h.titulo}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ImportarCsv({ abierto, onCerrar, onTerminado }: { abierto: boolean; onCerrar: () => void; onTerminado: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<{ creados: number; rechazados: number } | null>(null)

  const subir = async () => {
    if (!archivo) return
    setError('')
    setResultado(null)
    try {
      setEstado('Pidiendo URL firmada a MS3…')
      const pedido = await api<{ importacion_id: string; url: string; cabeceras: Record<string, string> }>('ms3', '/ms3/importaciones', { metodo: 'POST' })
      setEstado('Subiendo el CSV directo a S3…')
      const subida = await fetch(pedido.url, { method: 'PUT', headers: pedido.cabeceras, body: archivo })
      if (!subida.ok) throw new Error(`S3 respondió ${subida.status}`)
      setEstado('S3 disparó la Lambda de importación: procesando…')
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const r = await api<{ estado: string; creados?: number; rechazados?: number }>('ms3', `/ms3/importaciones/${pedido.importacion_id}`)
        if (r.estado === 'terminada') {
          setResultado({ creados: r.creados || 0, rechazados: r.rechazados || 0 })
          setEstado('')
          onTerminado()
          return
        }
      }
      throw new Error('La importación tarda más de lo normal; revisa más tarde.')
    } catch (e) {
      setError(mensajeError(e))
      setEstado('')
    }
  }

  return (
    <Modal titulo="Importar leads desde CSV" abierto={abierto} onCerrar={onCerrar}>
      <div className="space-y-3 text-sm">
        <p className="text-slate-600">
          Columnas: <code className="text-xs">empresa, nombre, apellido, cargo, email, telefono, fuente, ruc, empleados, monto_estimado</code>.
          El archivo va directo a S3 y una Lambda lo procesa.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="block w-full text-sm" />
        {estado && (
          <Alerta tipo="info">
            <span className="inline-flex items-center gap-2">{estado}</span>
          </Alerta>
        )}
        {error && <Alerta>{error}</Alerta>}
        {resultado && (
          <Alerta tipo="ok">
            Importación terminada: {resultado.creados} creados, {resultado.rechazados} rechazados.
          </Alerta>
        )}
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" onClick={onCerrar}>
            Cerrar
          </Boton>
          <Boton onClick={subir} disabled={!archivo} cargando={!!estado}>
            Subir
          </Boton>
        </div>
      </div>
    </Modal>
  )
}
