import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, mensajeError, paginaCursor } from '../api'
import { Alerta, Boton, Campo, Cargando, Encabezado, Insignia, Modal, Selector, Tarjeta, Vacio, fmt } from '../components/ui'
import { useSesion } from '../sesion'
import type { Actividad, TipoActividad } from '../tipos'

const ICONOS: Record<TipoActividad, string> = { llamada: '☎', reunion: '◷', tarea: '✓', email: '✉', nota: '✎' }

export default function Agenda() {
  const [estado, setEstado] = useState('pendiente')
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [siguiente, setSiguiente] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [nueva, setNueva] = useState(false)

  const cargar = useCallback(
    async (desde: string | null = null) => {
      setCargando(true)
      setError('')
      try {
        const p = await paginaCursor<Actividad>('ms5', '/ms5/actividades', { estado }, desde, 30)
        setActividades((a) => (desde ? [...a, ...p.items] : p.items))
        setSiguiente(p.siguiente)
      } catch (e) {
        setError(mensajeError(e))
      } finally {
        setCargando(false)
      }
    },
    [estado],
  )
  useEffect(() => {
    cargar()
  }, [cargar])

  const cerrar = async (a: Actividad, nuevo: 'completada' | 'cancelada') => {
    setError('')
    try {
      const r = await api<Actividad>('ms5', `/ms5/actividades/${a.actividad_id}/estado`, { metodo: 'PATCH', cuerpo: { estado: nuevo } })
      setActividades((xs) => (estado ? xs.filter((x) => x.actividad_id !== a.actividad_id) : xs.map((x) => (x.actividad_id === a.actividad_id ? r : x))))
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  const eliminar = async (a: Actividad) => {
    if (!confirm(`¿Eliminar "${a.titulo}"?`)) return
    setError('')
    try {
      await api('ms5', `/ms5/actividades/${a.actividad_id}`, { metodo: 'DELETE' })
      setActividades((xs) => xs.filter((x) => x.actividad_id !== a.actividad_id))
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  const ordenadas = [...actividades].sort((a, b) => {
    const fa = a.inicio || a.vence_en || ''
    const fb = b.inicio || b.vence_en || ''
    return estado === 'pendiente' ? fa.localeCompare(fb) : fb.localeCompare(fa)
  })

  return (
    <>
      <Encabezado titulo="Agenda" subtitulo="Llamadas, reuniones y tareas · las reuniones no pueden cruzarse">
        <Selector
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          opciones={[['pendiente', 'Pendientes'], ['vencida', 'Vencidas'], ['completada', 'Completadas'], ['cancelada', 'Canceladas'], ['', 'Todas']]}
        />
        <Boton onClick={() => setNueva(true)}>+ Nueva actividad</Boton>
      </Encabezado>
      {error && (
        <div className="mb-4">
          <Alerta>{error}</Alerta>
        </div>
      )}
      <Tarjeta>
        {ordenadas.length === 0 && !cargando ? (
          <Vacio texto="No hay actividades con ese estado" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {ordenadas.map((a) => (
              <li key={a.actividad_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca-50 text-marca-700">{ICONOS[a.tipo]}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{a.titulo}</div>
                  <div className="truncate text-xs text-slate-500">
                    {a.tipo === 'reunion' ? `${fmt.fechaHora(a.inicio)} – ${fmt.fechaHora(a.fin)}` : `vence ${fmt.fechaHora(a.vence_en)}`} · {a.vendedor}
                    {a.ref ? ` · ${a.ref}` : ''}
                  </div>
                </div>
                <Insignia valor={a.estado} />
                {(a.estado === 'pendiente' || a.estado === 'vencida') && (
                  <div className="flex gap-1">
                    <Boton variante="secundario" className="px-2 py-1 text-xs" onClick={() => cerrar(a, 'completada')}>
                      Completar
                    </Boton>
                    <Boton variante="fantasma" className="px-2 py-1 text-xs" onClick={() => cerrar(a, 'cancelada')}>
                      Cancelar
                    </Boton>
                  </div>
                )}
                {a.estado !== 'completada' && (
                  <button onClick={() => eliminar(a)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Eliminar" aria-label="Eliminar">
                    🗑
                  </button>
                )}
              </li>
            ))}
          </ul>
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
      <NuevaActividad abierto={nueva} onCerrar={() => setNueva(false)} onCreada={() => cargar()} />
    </>
  )
}

function aIso(local: string) {
  return local ? new Date(local).toISOString() : undefined
}

function NuevaActividad({ abierto, onCerrar, onCreada }: { abierto: boolean; onCerrar: () => void; onCreada: () => void }) {
  const { tieneRol } = useSesion()
  const vacio = { tipo: 'llamada', titulo: '', vence_en: '', inicio: '', fin: '', ref: '', notas: '', vendedor: '' }
  const [f, setF] = useState(vacio)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const cambiar = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const reunion = f.tipo === 'reunion'

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await api('ms5', '/ms5/actividades', {
        metodo: 'POST',
        cuerpo: {
          tipo: f.tipo,
          titulo: f.titulo,
          ref: f.ref || undefined,
          notas: f.notas || undefined,
          vendedor: f.vendedor || undefined,
          ...(reunion ? { inicio: aIso(f.inicio), fin: aIso(f.fin) } : { vence_en: aIso(f.vence_en) }),
        },
      })
      setF(vacio)
      onCreada()
      onCerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal titulo="Nueva actividad" abierto={abierto} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="space-y-3">
        {error && <Alerta>{error}</Alerta>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Selector
            etiqueta="Tipo"
            value={f.tipo}
            onChange={cambiar('tipo')}
            opciones={[['llamada', 'Llamada'], ['reunion', 'Reunión'], ['tarea', 'Tarea'], ['email', 'Email'], ['nota', 'Nota']]}
          />
          <Campo etiqueta="Ficha (opcional)" placeholder="lead-L…  o  cuenta-12" value={f.ref} onChange={cambiar('ref')} />
        </div>
        <Campo etiqueta="Título" value={f.titulo} onChange={cambiar('titulo')} required />
        {reunion ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Inicio" type="datetime-local" value={f.inicio} onChange={cambiar('inicio')} required />
            <Campo etiqueta="Fin" type="datetime-local" value={f.fin} onChange={cambiar('fin')} required ayuda="Máximo 8 horas" />
          </div>
        ) : (
          <Campo etiqueta="Vence" type="datetime-local" value={f.vence_en} onChange={cambiar('vence_en')} />
        )}
        {tieneRol('gerente', 'admin') && (
          <Campo etiqueta="Asignar a (email del vendedor)" type="email" value={f.vendedor} onChange={cambiar('vendedor')} ayuda="Vacío = tú" />
        )}
        <Campo etiqueta="Notas" value={f.notas} onChange={cambiar('notas')} />
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
