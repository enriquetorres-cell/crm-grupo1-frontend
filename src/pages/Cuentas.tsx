import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, mensajeError } from '../api'
import { Alerta, Boton, Campo, Cargando, Encabezado, Insignia, Modal, Selector, Tabla, Tarjeta, Vacio, fmt } from '../components/ui'
import type { Cuenta, PaginaSql } from '../tipos'

const LIMITE = 20

export default function Cuentas() {
  const navegar = useNavigate()
  const [filtro, setFiltro] = useState({ estado: '', segmento: '', q: '' })
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [pagina, setPagina] = useState<PaginaSql<Cuenta> | null>(null)
  const [error, setError] = useState('')
  const [nueva, setNueva] = useState(false)

  const cargar = useCallback(() => {
    setError('')
    api<PaginaSql<Cuenta>>('ms2', '/ms2/cuentas', { query: { ...filtro, page, limit: LIMITE } })
      .then(setPagina)
      .catch((e) => setError(mensajeError(e)))
  }, [filtro, page])

  useEffect(cargar, [cargar])

  const paginas = pagina ? Math.max(1, Math.ceil(pagina.total / LIMITE)) : 1

  return (
    <>
      <Encabezado titulo="Cuentas" subtitulo={pagina ? `${fmt.numero(pagina.total)} cuentas · PostgreSQL, schema de tu empresa` : undefined}>
        <Boton onClick={() => setNueva(true)}>+ Nueva cuenta</Boton>
      </Encabezado>
      <Tarjeta>
        <form
          className="flex flex-wrap gap-3 border-b border-slate-200 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            setPage(1)
            setFiltro({ ...filtro, q: busqueda })
          }}
        >
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por razón social…"
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-marca-500"
          />
          <Selector
            value={filtro.estado}
            onChange={(e) => {
              setPage(1)
              setFiltro({ ...filtro, estado: e.target.value })
            }}
            opciones={[['', 'Todos los estados'], ['prospecto', 'Prospecto'], ['cliente', 'Cliente'], ['inactivo', 'Inactivo']]}
          />
          <Selector
            value={filtro.segmento}
            onChange={(e) => {
              setPage(1)
              setFiltro({ ...filtro, segmento: e.target.value })
            }}
            opciones={[['', 'Todos los segmentos'], ['A', 'Segmento A'], ['B', 'Segmento B'], ['C', 'Segmento C']]}
          />
          <Boton type="submit" variante="secundario">
            Buscar
          </Boton>
        </form>
        {error && (
          <div className="p-3">
            <Alerta>{error}</Alerta>
          </div>
        )}
        {!pagina ? (
          <Cargando />
        ) : pagina.items.length === 0 ? (
          <Vacio texto="No hay cuentas con esos filtros" />
        ) : (
          <Tabla cabeceras={['Razón social', 'RUC', 'Estado', 'Segmento', 'Ganado 12 m', 'Propietario']}>
            {pagina.items.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navegar(`/cuentas/${c.id}`)}>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{c.razon_social}</div>
                  <div className="text-xs text-slate-500">
                    {[c.industria, c.distrito].filter(Boolean).join(' · ') || '—'}
                  </div>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-slate-600">{c.ruc || '—'}</td>
                <td className="px-4 py-2.5">
                  <Insignia valor={c.estado} />
                </td>
                <td className="px-4 py-2.5">
                  <Insignia valor={c.segmento} />
                </td>
                <td className="px-4 py-2.5 tabular-nums">{fmt.soles(c.monto_ganado_12m)}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{c.propietario}</td>
              </tr>
            ))}
          </Tabla>
        )}
        {pagina && pagina.total > LIMITE && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-500">
              Página {page} de {fmt.numero(paginas)}
            </span>
            <div className="flex gap-2">
              <Boton variante="secundario" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Boton>
              <Boton variante="secundario" disabled={page >= paginas} onClick={() => setPage(page + 1)}>
                Siguiente
              </Boton>
            </div>
          </div>
        )}
      </Tarjeta>
      <NuevaCuenta abierto={nueva} onCerrar={() => setNueva(false)} onCreada={(c) => navegar(`/cuentas/${c.id}`)} />
    </>
  )
}

function NuevaCuenta({ abierto, onCerrar, onCreada }: { abierto: boolean; onCerrar: () => void; onCreada: (c: Cuenta) => void }) {
  const [f, setF] = useState({ razon_social: '', ruc: '', email: '', industria: '', distrito: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const cambiar = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      onCreada(await api<Cuenta>('ms2', '/ms2/cuentas', { metodo: 'POST', cuerpo: f }))
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal titulo="Nueva cuenta" abierto={abierto} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="space-y-3">
        {error && <Alerta>{error}</Alerta>}
        <Campo etiqueta="Razón social" value={f.razon_social} onChange={cambiar('razon_social')} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="RUC" value={f.ruc} onChange={cambiar('ruc')} ayuda="11 dígitos, se valida con SUNAT" />
          <Campo etiqueta="Email corporativo" type="email" value={f.email} onChange={cambiar('email')} ayuda="Su dominio detecta duplicados" />
          <Campo etiqueta="Industria" value={f.industria} onChange={cambiar('industria')} />
          <Campo etiqueta="Distrito" value={f.distrito} onChange={cambiar('distrito')} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={cargando}>
            Crear cuenta
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
