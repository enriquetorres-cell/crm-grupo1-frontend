// Especificación OpenAPI 3 de las 5 APIs, armada con las MISMAS URLs que usa la app
// (así nunca queda desactualizada después de redesplegar). La muestra la página /docs.
import { URLS, type Ms } from './config'

type Metodo = 'get' | 'post' | 'patch' | 'delete'

interface Endpoint {
  ms: Ms
  metodo: Metodo
  ruta: string
  resumen: string
  descripcion?: string
  publico?: boolean
  query?: [string, string][]
  cuerpo?: Record<string, unknown>
  respuesta?: unknown
  errores?: number[]
}

const TAGS: Record<Ms, string> = {
  ms1: 'MS1 · Usuarios (DynamoDB)',
  ms2: 'MS2 · Clientes (PostgreSQL)',
  ms3: 'MS3 · Leads (DynamoDB + S3)',
  ms4: 'MS4 · Oportunidades (PostgreSQL + S3)',
  ms5: 'MS5 · Actividades (DynamoDB + SNS)',
}

const salud = (ms: Ms): Endpoint => ({ ms, metodo: 'get', ruta: `/${ms}/health`, resumen: 'Estado del servicio', publico: true, respuesta: { status: 'ok', servicio: ms } })
const PAGINA_SQL: [string, string][] = [['page', 'Página (desde 1)'], ['limit', 'Ítems por página (1-100, por defecto 20)']]
const PAGINA_CURSOR: [string, string][] = [['limit', 'Ítems por página (1-100)'], ['siguiente', 'Cursor devuelto por la respuesta anterior']]

const ENDPOINTS: Endpoint[] = [
  // ---------- MS1 ----------
  salud('ms1'),
  {
    ms: 'ms1', metodo: 'post', ruta: '/ms1/tenants', publico: true, resumen: 'Registrar una empresa (tenant) con su admin',
    descripcion: 'Publica `tenant.creado`: MS2 y MS4 crean el schema del tenant en PostgreSQL.',
    cuerpo: { tenant_id: 'tenant_demo', nombre: 'Demo SAC', plan: 'basico', admin: { nombre: 'Ana Admin', email: 'ana@demo.pe', password: 'Clave2026' } },
    errores: [409, 422],
  },
  {
    ms: 'ms1', metodo: 'post', ruta: '/ms1/login', publico: true, resumen: 'Iniciar sesión (devuelve el token Bearer, válido 8 h)',
    cuerpo: { tenant_id: 'tenant_andina', email: 'admin@andina.pe', password: 'DemoAndina2026' },
    respuesta: { token: '…', expira_en: 1762650000, tenant_id: 'tenant_andina', usuario: { email: 'admin@andina.pe', rol: 'admin' }, plan: 'pro' },
    errores: [401, 403],
  },
  { ms: 'ms1', metodo: 'get', ruta: '/ms1/me', resumen: 'Lo que el Authorizer sabe del token (tenant, usuario, rol, plan)', respuesta: { tenant_id: 'tenant_andina', usuario_id: 'admin@andina.pe', rol: 'admin', plan: 'pro' } },
  { ms: 'ms1', metodo: 'get', ruta: '/ms1/usuarios', resumen: 'Usuarios del tenant (admin, gerente)', query: PAGINA_CURSOR, errores: [403] },
  {
    ms: 'ms1', metodo: 'post', ruta: '/ms1/usuarios', resumen: 'Crear usuario (admin; respeta el límite del plan)',
    descripcion: 'Planes: básico 5, pro 20, enterprise ilimitado. Publica `usuario.creado`.',
    cuerpo: { nombre: 'Carlos Vendedor', email: 'carlos@andina.pe', password: 'Clave2026', rol: 'vendedor' }, errores: [403, 409, 422],
  },
  { ms: 'ms1', metodo: 'post', ruta: '/ms1/usuarios/{email}/suspender', resumen: 'Suspender usuario (admin)', errores: [403, 404, 409] },

  // ---------- MS2 ----------
  salud('ms2'),
  { ms: 'ms2', metodo: 'get', ruta: '/ms2/cuentas', resumen: 'Cuentas del tenant', query: [...PAGINA_SQL, ['estado', 'prospecto | cliente | inactivo'], ['segmento', 'A | B | C'], ['q', 'Busca en la razón social']] },
  { ms: 'ms2', metodo: 'get', ruta: '/ms2/cuentas/{id}', resumen: 'Cuenta con sus contactos', errores: [404] },
  {
    ms: 'ms2', metodo: 'post', ruta: '/ms2/cuentas', resumen: 'Crear cuenta (valida RUC SUNAT y duplicados)',
    cuerpo: { razon_social: 'Constructora Lima SAC', ruc: '20131312955', email: 'ventas@constructoralima.pe', industria: 'Construcción', distrito: 'Surco' }, errores: [409, 422],
  },
  { ms: 'ms2', metodo: 'post', ruta: '/ms2/cuentas/{id}/contactos', resumen: 'Agregar contacto (el primero es el principal)', cuerpo: { nombre: 'Lucía', apellido: 'Ramos', email: 'lucia@constructoralima.pe', cargo: 'Gerente' }, errores: [404, 422] },
  { ms: 'ms2', metodo: 'patch', ruta: '/ms2/contactos/{id}', resumen: 'Marcar como contacto principal', cuerpo: { es_principal: true }, errores: [404, 409] },

  // ---------- MS3 ----------
  salud('ms3'),
  { ms: 'ms3', metodo: 'get', ruta: '/ms3/leads', resumen: 'Leads del tenant (el vendedor ve solo los suyos)', query: [...PAGINA_CURSOR, ['estado', 'nuevo | contactado | calificado | convertido | descartado'], ['temperatura', 'caliente | tibio | frio']] },
  { ms: 'ms3', metodo: 'get', ruta: '/ms3/leads/{id}', resumen: 'Detalle de un lead', errores: [404] },
  {
    ms: 'ms3', metodo: 'post', ruta: '/ms3/leads', resumen: '① CREAR lead en DynamoDB (se puntúa y se asigna solo)',
    descripcion: 'Escribe en UNA transacción: el ítem `LEAD#`, las marcas de unicidad `EMAIL#`/`TEL#`, el contador `MES#` del plan y la carga del vendedor. Publica `lead.asignado`.',
    cuerpo: { empresa: 'Constructora Lima', nombre: 'Lucía', apellido: 'Ramos', cargo: 'Gerente de operaciones', email: 'lucia@constructoralima.pe', telefono: '987654321', fuente: 'referido', empleados: 120, monto_estimado: 18000 },
    errores: [409, 422],
  },
  {
    ms: 'ms3', metodo: 'patch', ruta: '/ms3/leads/{id}/estado', resumen: '② MODIFICAR el estado del lead',
    descripcion: 'nuevo → contactado → calificado; descartado exige motivo. Bloqueo optimista.',
    cuerpo: { estado: 'contactado' }, errores: [404, 409, 422],
  },
  {
    ms: 'ms3', metodo: 'delete', ruta: '/ms3/leads/{id}', resumen: '③ ELIMINAR el lead de DynamoDB',
    descripcion: 'Borra en UNA transacción el lead, sus marcas `EMAIL#`/`TEL#` y descuenta la carga del vendedor. Un lead convertido no se elimina (409).',
    respuesta: { lead_id: 'L1a2b3c4d5e6', eliminado: true }, errores: [404, 409],
  },
  { ms: 'ms3', metodo: 'post', ruta: '/ms3/leads/{id}/convertir', resumen: 'Convertir lead (calificado y puntaje ≥ 40)', descripcion: 'Publica `lead.convertido`: MS2 crea la cuenta, MS4 la oportunidad y MS5 el historial.', errores: [404, 409] },
  { ms: 'ms3', metodo: 'post', ruta: '/ms3/importaciones', resumen: 'URL firmada para subir un CSV a S3', respuesta: { importacion_id: '…', url: 'https://…s3…', metodo: 'PUT' } },
  { ms: 'ms3', metodo: 'get', ruta: '/ms3/importaciones/{id}', resumen: 'Resultado de la importación', respuesta: { importacion_id: '…', estado: 'terminada', creados: 98, rechazados: 2 } },

  // ---------- MS4 ----------
  salud('ms4'),
  { ms: 'ms4', metodo: 'get', ruta: '/ms4/oportunidades', resumen: 'Oportunidades (con monto ponderado)', query: [...PAGINA_SQL, ['etapa', 'prospeccion | calificacion | propuesta | negociacion | ganada | perdida']] },
  { ms: 'ms4', metodo: 'get', ruta: '/ms4/oportunidades/{id}', resumen: 'Oportunidad con sus cotizaciones', errores: [404] },
  { ms: 'ms4', metodo: 'post', ruta: '/ms4/oportunidades', resumen: 'Crear oportunidad', cuerpo: { titulo: 'Licencias CRM para Constructora Lima', monto: 25000, fecha_cierre_estimada: '2026-12-15' }, errores: [422] },
  {
    ms: 'ms4', metodo: 'patch', ruta: '/ms4/oportunidades/{id}/etapa', resumen: 'Cambiar etapa',
    descripcion: 'De una en una; propuesta exige cotización, ganada una aceptada, perdida un motivo; solo el gerente retrocede. Publica `oportunidad.etapa_cambiada` (y `oportunidad.ganada`).',
    cuerpo: { etapa: 'calificacion' }, errores: [403, 404, 409],
  },
  { ms: 'ms4', metodo: 'post', ruta: '/ms4/cotizaciones', resumen: 'Crear cotización (IGV 18 %, HTML en S3)', cuerpo: { oportunidad_id: 1, items: [{ producto_id: 2, cantidad: 3 }], descuento_pct: 10 }, errores: [403, 404, 409] },
  { ms: 'ms4', metodo: 'patch', ruta: '/ms4/cotizaciones/{id}/estado', resumen: 'Cambiar estado de cotización', cuerpo: { estado: 'enviada' }, errores: [404, 409] },
  { ms: 'ms4', metodo: 'get', ruta: '/ms4/pronostico', resumen: 'Pronóstico ponderado por vendedor y mes (gerente, admin)', errores: [403] },
  { ms: 'ms4', metodo: 'get', ruta: '/ms4/productos', resumen: 'Catálogo de productos' },

  // ---------- MS5 ----------
  salud('ms5'),
  { ms: 'ms5', metodo: 'get', ruta: '/ms5/actividades', resumen: 'Actividades del tenant', query: [...PAGINA_CURSOR, ['estado', 'pendiente | completada | cancelada | vencida']] },
  {
    ms: 'ms5', metodo: 'post', ruta: '/ms5/actividades', resumen: '① CREAR actividad en DynamoDB (las reuniones no pueden cruzarse)',
    cuerpo: { tipo: 'reunion', titulo: 'Demo con Constructora Lima', inicio: '2026-11-20T15:00:00Z', fin: '2026-11-20T16:00:00Z' }, errores: [409, 422],
  },
  { ms: 'ms5', metodo: 'patch', ruta: '/ms5/actividades/{id}/estado', resumen: '② MODIFICAR: completar o cancelar', cuerpo: { estado: 'completada' }, errores: [404, 409, 422] },
  { ms: 'ms5', metodo: 'delete', ruta: '/ms5/actividades/{id}', resumen: '③ ELIMINAR actividad de DynamoDB (no si está completada)', respuesta: { actividad_id: 'A9f8e7d6c5b4a', eliminada: true }, errores: [404, 409] },
  { ms: 'ms5', metodo: 'get', ruta: '/ms5/historial/{ref}', resumen: 'Historial de una ficha (lead-<id>, cuenta-<id>, usuario-<email>)', query: PAGINA_CURSOR },
]

const DESCRIPCION_ERROR: Record<number, string> = {
  401: 'Sin token o credenciales inválidas',
  403: 'Token inválido/vencido, o el rol no alcanza',
  404: 'No existe en TU tenant',
  409: 'Regla de negocio incumplida',
  422: 'Dato con formato inválido',
}

export function especificacion() {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const e of ENDPOINTS) {
    const item = (paths[e.ruta] ||= { servers: [{ url: URLS[e.ms], description: TAGS[e.ms] }] })
    const parametros = [
      ...[...e.ruta.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: 'path', required: true, schema: { type: 'string' } })),
      ...(e.query || []).map(([name, description]) => ({ name, in: 'query', required: false, description, schema: { type: 'string' } })),
    ]
    const respuestas: Record<string, unknown> = {
      [e.metodo === 'post' && !e.ruta.endsWith('/convertir') && !e.ruta.endsWith('/login') ? '201' : '200']: {
        description: 'OK',
        ...(e.respuesta ? { content: { 'application/json': { example: e.respuesta } } } : {}),
      },
    }
    for (const codigo of e.publico ? e.errores || [] : [401, ...(e.errores || [])]) {
      respuestas[codigo] = {
        description: DESCRIPCION_ERROR[codigo],
        content: { 'application/json': { example: { error: 'codigo_del_error', detalle: '…' } } },
      }
    }
    item[e.metodo] = {
      tags: [TAGS[e.ms]],
      summary: e.resumen,
      ...(e.descripcion ? { description: e.descripcion } : {}),
      ...(parametros.length ? { parameters: parametros } : {}),
      ...(e.cuerpo ? { requestBody: { required: true, content: { 'application/json': { example: e.cuerpo } } } } : {}),
      responses: respuestas,
      security: e.publico ? [] : [{ bearer: [] }],
    }
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'CRM SaaS · CS2032 Grupo 1',
      version: '1.0.0',
      description:
        '5 microservicios serverless (API Gateway HTTP API + Lambda), multi-tenant y basados en eventos (SNS → SQS).\n\n' +
        '**Cómo probar:** `POST /ms1/login` → copia el `token` → botón **Authorize**. Si ya iniciaste sesión en la app, el token se carga solo.\n\n' +
        'El **tenant sale del token** (Lambda Authorizer): pedir un registro de otra empresa devuelve **404**.',
    },
    tags: (Object.keys(TAGS) as Ms[]).map((ms) => ({ name: TAGS[ms] })),
    components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer', description: 'Token de POST /ms1/login' } } },
    paths,
  }
}
