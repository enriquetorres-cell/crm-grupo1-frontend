import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, sesionGuardada } from './api'
import type { Rol, Sesion } from './tipos'

interface ContextoSesion {
  sesion: Sesion | null
  entrar: (tenant_id: string, email: string, password: string) => Promise<void>
  salir: () => void
  tieneRol: (...roles: Rol[]) => boolean
}

const Contexto = createContext<ContextoSesion | null>(null)

function vigente(s: Sesion | null): Sesion | null {
  return s && s.expira_en * 1000 > Date.now() ? s : null
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => vigente(sesionGuardada.leer()))

  const salir = useCallback(() => {
    sesionGuardada.borrar()
    setSesion(null)
  }, [])

  useEffect(() => {
    window.addEventListener('crm:sesion-expirada', salir)
    return () => window.removeEventListener('crm:sesion-expirada', salir)
  }, [salir])

  const entrar = async (tenant_id: string, email: string, password: string) => {
    const s = await api<Sesion>('ms1', '/ms1/login', {
      metodo: 'POST',
      cuerpo: { tenant_id: tenant_id.trim().toLowerCase(), email: email.trim(), password },
    })
    sesionGuardada.guardar(s)
    setSesion(s)
  }

  const tieneRol = (...roles: Rol[]) => !!sesion && roles.includes(sesion.usuario.rol)

  return <Contexto.Provider value={{ sesion, entrar, salir, tieneRol }}>{children}</Contexto.Provider>
}

export function useSesion() {
  const c = useContext(Contexto)
  if (!c) throw new Error('useSesion fuera de ProveedorSesion')
  return c
}
