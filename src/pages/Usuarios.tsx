import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, mensajeError } from '../api'
import { Alerta, Boton, Campo, Cargando, Encabezado, Insignia, Modal, Selector, Tabla, Tarjeta, fmt } from '../components/ui'
import { useSesion } from '../sesion'
import type { PaginaCursor, Usuario } from '../tipos'

export default function Usuarios() {
  const { sesion, tieneRol } = useSesion()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [siguiente, setSiguiente] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [nuevo, setNuevo] = useState(false)
  const esAdmin = tieneRol('admin')

  const cargar = useCallback(async (desde: string | null = null) => {
    setCargando(true)
    setError('')
    try {
      const p = await api<PaginaCursor<Usuario>>('ms1', '/ms1/usuarios', { query: { limit: 50, siguiente: desde } })
      setUsuarios((u) => (desde ? [...u, ...p.items] : p.items))
      setSiguiente(p.siguiente)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [])
  useEffect(() => {
    cargar()
  }, [cargar])

  const suspender = async (u: Usuario) => {
    if (!confirm(`¿Suspender a ${u.email}? No podrá iniciar sesión.`)) return
    setError('')
    try {
      await api('ms1', `/ms1/usuarios/${encodeURIComponent(u.email)}/suspender`, { metodo: 'POST' })
      setUsuarios((us) => us.map((x) => (x.email === u.email ? { ...x, activo: false } : x)))
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  return (
    <>
      <Encabezado titulo="Usuarios" subtitulo={`Equipo de ${sesion?.tenant_nombre} · plan ${sesion?.plan}`}>
        {esAdmin && <Boton onClick={() => setNuevo(true)}>+ Nuevo usuario</Boton>}
      </Encabezado>
      {error && (
        <div className="mb-4">
          <Alerta>{error}</Alerta>
        </div>
      )}
      <Tarjeta>
        <Tabla cabeceras={['Nombre', 'Email', 'Rol', 'Estado', 'Alta', '']}>
          {usuarios.map((u) => (
            <tr key={u.email}>
              <td className="px-4 py-2.5 font-medium">{u.nombre}</td>
              <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
              <td className="px-4 py-2.5">
                <Insignia valor={u.rol} />
              </td>
              <td className="px-4 py-2.5">
                <Insignia valor={u.activo ? 'completada' : 'cancelada'} texto={u.activo ? 'activo' : 'suspendido'} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{fmt.fecha(u.creado_en)}</td>
              <td className="px-4 py-2.5 text-right">
                {esAdmin && u.activo && u.email !== sesion?.usuario.email && (
                  <Boton variante="fantasma" className="px-2 py-1 text-xs" onClick={() => suspender(u)}>
                    Suspender
                  </Boton>
                )}
              </td>
            </tr>
          ))}
        </Tabla>
        {cargando && <Cargando />}
        {siguiente && !cargando && (
          <div className="border-t border-slate-200 p-3 text-center">
            <Boton variante="fantasma" onClick={() => cargar(siguiente)}>
              Cargar más
            </Boton>
          </div>
        )}
      </Tarjeta>
      <NuevoUsuario abierto={nuevo} onCerrar={() => setNuevo(false)} onCreado={(u) => setUsuarios((us) => [u, ...us])} />
    </>
  )
}

function NuevoUsuario({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: (u: Usuario) => void }) {
  const vacio = { nombre: '', email: '', password: '', rol: 'vendedor' }
  const [f, setF] = useState(vacio)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const cambiar = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      onCreado(await api<Usuario>('ms1', '/ms1/usuarios', { metodo: 'POST', cuerpo: f }))
      setF(vacio)
      onCerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal titulo="Nuevo usuario" abierto={abierto} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="space-y-3">
        {error && <Alerta>{error}</Alerta>}
        <Campo etiqueta="Nombre" value={f.nombre} onChange={cambiar('nombre')} required />
        <Campo etiqueta="Email" type="email" value={f.email} onChange={cambiar('email')} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Contraseña" type="password" value={f.password} onChange={cambiar('password')} required minLength={8} ayuda="Letras y números" />
          <Selector etiqueta="Rol" value={f.rol} onChange={cambiar('rol')} opciones={[['vendedor', 'Vendedor'], ['gerente', 'Gerente'], ['admin', 'Admin']]} />
        </div>
        <p className="text-xs text-slate-500">Al crearlo se publica usuario.creado: si es vendedor, MS3 lo suma al reparto de leads.</p>
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
