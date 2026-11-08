import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, mensajeError } from '../api'
import { Alerta, Boton, Campo, Cargando, Encabezado, Insignia, Tarjeta, fmt } from '../components/ui'
import type { Contacto, Cuenta, EntradaHistorial, PaginaCursor } from '../tipos'

export default function CuentaDetalle() {
  const { id } = useParams()
  const [cuenta, setCuenta] = useState<Cuenta | null>(null)
  const [historial, setHistorial] = useState<EntradaHistorial[]>([])
  const [error, setError] = useState('')

  const cargar = useCallback(() => {
    api<Cuenta>('ms2', `/ms2/cuentas/${id}`)
      .then((c) => {
        setCuenta(c)
        const refs = [`cuenta-${c.id}`, ...(c.lead_id ? [`lead-${c.lead_id}`] : [])]
        Promise.all(refs.map((r) => api<PaginaCursor<EntradaHistorial>>('ms5', `/ms5/historial/${r}`).catch(() => ({ items: [] }))))
          .then((ps) => setHistorial(ps.flatMap((p) => p.items).sort((a, b) => b.ocurrido_en.localeCompare(a.ocurrido_en))))
      })
      .catch((e) => setError(mensajeError(e)))
  }, [id])
  useEffect(cargar, [cargar])

  const hacerPrincipal = async (c: Contacto) => {
    setError('')
    try {
      await api('ms2', `/ms2/contactos/${c.id}`, { metodo: 'PATCH', cuerpo: { es_principal: true } })
      cargar()
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  if (!cuenta) return error ? <Alerta>{error}</Alerta> : <Cargando />

  return (
    <>
      <Link to="/cuentas" className="mb-3 inline-block text-sm text-marca-600 hover:underline">
        ← Cuentas
      </Link>
      <Encabezado titulo={cuenta.razon_social} subtitulo={[cuenta.ruc && `RUC ${cuenta.ruc}`, cuenta.industria, cuenta.distrito].filter(Boolean).join(' · ')}>
        <Insignia valor={cuenta.estado} />
        <Insignia valor={cuenta.segmento} texto={`Segmento ${cuenta.segmento}`} />
      </Encabezado>
      {error && (
        <div className="mb-4">
          <Alerta>{error}</Alerta>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tarjeta className="grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-slate-500">Ganado 12 meses</div>
              <div className="font-semibold">{fmt.soles(cuenta.monto_ganado_12m)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Propietario</div>
              <div className="truncate">{cuenta.propietario || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Última actividad</div>
              <div>{fmt.fecha(cuenta.ultima_actividad_en)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Origen</div>
              <div className="truncate">{cuenta.lead_id ? `lead ${cuenta.lead_id}` : 'manual'}</div>
            </div>
          </Tarjeta>

          <Tarjeta>
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Contactos</div>
            <ul className="divide-y divide-slate-100">
              {cuenta.contactos?.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">
                      {c.nombre} {c.apellido} {c.es_principal && <Insignia valor="cliente" texto="principal" />}
                    </div>
                    <div className="text-xs text-slate-500">{[c.cargo, c.email, c.telefono].filter(Boolean).join(' · ')}</div>
                  </div>
                  {!c.es_principal && (
                    <Boton variante="fantasma" className="text-xs" onClick={() => hacerPrincipal(c)}>
                      Hacer principal
                    </Boton>
                  )}
                </li>
              ))}
              {!cuenta.contactos?.length && <li className="px-4 py-6 text-center text-sm text-slate-500">Sin contactos.</li>}
            </ul>
            <NuevoContacto cuentaId={cuenta.id} onCreado={cargar} />
          </Tarjeta>
        </div>

        <Tarjeta>
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Historial (MS5)</div>
          {historial.length ? (
            <ol className="space-y-2 p-4 text-sm">
              {historial.map((h) => (
                <li key={h.orden} className="border-l-2 border-marca-100 pl-3">
                  <div>{h.titulo}</div>
                  <div className="text-xs text-slate-500">{fmt.fechaHora(h.ocurrido_en)}</div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="p-4 text-sm text-slate-500">Sin eventos registrados.</p>
          )}
        </Tarjeta>
      </div>
    </>
  )
}

function NuevoContacto({ cuentaId, onCreado }: { cuentaId: number; onCreado: () => void }) {
  const vacio = { nombre: '', apellido: '', email: '', telefono: '', cargo: '' }
  const [f, setF] = useState(vacio)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const cambiar = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await api('ms2', `/ms2/cuentas/${cuentaId}/contactos`, { metodo: 'POST', cuerpo: f })
      setF(vacio)
      onCreado()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3 border-t border-slate-200 bg-slate-50/60 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Agregar contacto</div>
      {error && <Alerta>{error}</Alerta>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo etiqueta="Nombre" value={f.nombre} onChange={cambiar('nombre')} required />
        <Campo etiqueta="Apellido" value={f.apellido} onChange={cambiar('apellido')} />
        <Campo etiqueta="Cargo" value={f.cargo} onChange={cambiar('cargo')} />
        <Campo etiqueta="Email" type="email" value={f.email} onChange={cambiar('email')} />
        <Campo etiqueta="Teléfono" value={f.telefono} onChange={cambiar('telefono')} />
        <div className="flex items-end">
          <Boton type="submit" cargando={cargando} className="w-full">
            Agregar
          </Boton>
        </div>
      </div>
    </form>
  )
}
