# Frontend — CRM SaaS (CS2032 · Grupo 1)

React 18 + Vite 6 + Tailwind 3, desplegado en **AWS Amplify Hosting**. Consume las 5 APIs del backend
(API Gateway + Lambda) con el token del Lambda Authorizer de MS1. Arquitectura y backend:
[crm-grupo1-infra](https://github.com/enriquetorres-cell/crm-grupo1-infra).

## Pantallas

| Pantalla | Qué hace | APIs |
| --- | --- | --- |
| Login / Registro | Inicia sesión por tenant; registra una empresa nueva con su admin (dispara `tenant.creado`) | MS1 |
| Panel | Cuentas y clientes, pipeline por etapa, pronóstico ponderado (gerente/admin), leads calientes y próximas actividades | MS2, MS3, MS4, MS5 |
| Leads | Listado con filtros, alta (se puntúa y se asigna sola), avanzar estado, descartar, **convertir** (dispara `lead.convertido`), historial e **importación CSV directo a S3** | MS3, MS5 |
| Oportunidades | **Kanban** de 6 etapas con arrastrar y soltar; detalle con cotizaciones (IGV 18 %, descuento según rol, documento HTML en S3) | MS4 |
| Cuentas | Listado paginado con búsqueda; detalle con contactos (principal) e historial | MS2, MS5 |
| Agenda | Actividades por estado, reuniones sin choques, completar o cancelar | MS5 |
| Usuarios | Equipo del tenant; el admin crea (límite del plan) y suspende | MS1 |

El menú y las acciones cambian según el rol (admin, gerente, vendedor). El tenant sale siempre del token.

## Desarrollo local

```bash
npm install
cp .env.example .env.local     # y pon las 5 URLs que imprime desplegar.sh del repo infra
npm run dev
```

Usuarios de la demo: `tenant_andina` / `admin@andina.pe` / `DemoAndina2026` (también hay botones de acceso rápido en el login).

## Desplegar en Amplify (desde la EC2)

Requiere el backend desplegado. Desde esta carpeta:

```bash
chmod +x desplegar-frontend.sh
./desplegar-frontend.sh
```

Lee las URLs de CloudFormation, compila, sube `dist/` a Amplify (despliegue manual, sin conectar GitHub),
configura la reescritura de SPA y al final imprime la URL pública `https://main.<appId>.amplifyapp.com`.
`desplegar.sh` del repo infra lo llama solo como último paso.

## Notas

- Los listados de DynamoDB (leads, actividades, usuarios) usan cursor (`siguiente`). Con filtros, DynamoDB
  aplica el `limit` antes del filtro, así que `src/api.ts` (`paginaCursor`) sigue el cursor hasta juntar resultados.
- El enlace al documento de una cotización (URL firmada de S3, 1 hora) se muestra al crearla.
