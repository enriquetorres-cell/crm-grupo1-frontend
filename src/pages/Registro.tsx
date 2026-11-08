import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, mensajeError } from '../api'
import { Alerta, Boton, Campo, Selector } from '../components/ui'
import { useSesion } from '../sesion'

export default function Registro() {
  const { entrar } = useSesion()
  const navegar = useNavigate()
  const [f, setF] = useState({ tenant_id: 'tenant_', nombre: '', plan: 'basico', adminNombre: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const cambiar = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await api('ms1', '/ms1/tenants', {
        metodo: 'POST',
        cuerpo: {
          tenant_id: f.tenant_id.trim().toLowerCase(),
          nombre: f.nombre,
          plan: f.plan,
          admin: { nombre: f.adminNombre, email: f.email, password: f.password },
        },
      })
      // tenant.creado viaja por SNS -> SQS y MS2/MS4 crean el schema del tenant solos.
      await entrar(f.tenant_id, f.email, f.password)
      navegar('/', { replace: true })
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-marca-900 to-marca-700 p-4">
      <form onSubmit={enviar} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h1 className="text-lg font-semibold">Registrar empresa</h1>
          <p className="text-sm text-slate-500">Crea tu tenant y su primer usuario administrador.</p>
        </div>
        {error && <Alerta>{error}</Alerta>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="ID del tenant" value={f.tenant_id} onChange={cambiar('tenant_id')} required pattern="tenant_[a-z0-9]{3,30}" ayuda="tenant_ + 3 a 30 minúsculas o dígitos" />
          <Selector etiqueta="Plan" value={f.plan} onChange={cambiar('plan')} opciones={[['basico', 'Básico · 5 usuarios'], ['pro', 'Pro · 20 usuarios'], ['enterprise', 'Enterprise · ilimitado']]} />
        </div>
        <Campo etiqueta="Nombre de la empresa" value={f.nombre} onChange={cambiar('nombre')} required />
        <hr className="border-slate-200" />
        <Campo etiqueta="Nombre del administrador" value={f.adminNombre} onChange={cambiar('adminNombre')} required />
        <Campo etiqueta="Email del administrador" type="email" value={f.email} onChange={cambiar('email')} required />
        <Campo etiqueta="Contraseña" type="password" value={f.password} onChange={cambiar('password')} required minLength={8} ayuda="Mínimo 8 caracteres, con letras y números" />
        <Boton type="submit" cargando={cargando} className="w-full">
          Crear empresa
        </Boton>
        <p className="text-center text-sm text-slate-500">
          <Link to="/login" className="font-medium text-marca-600 hover:underline">
            Ya tengo cuenta
          </Link>
        </p>
      </form>
    </div>
  )
}
