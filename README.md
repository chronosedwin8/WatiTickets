# TicketWati

Mesa de ayuda e inventario tecnológico para organizaciones. Gestiona los
tickets de todos los departamentos, mantiene el inventario de equipos al día
de forma automática y mide el servicio con indicadores.

Funciona sobre tu propia base de datos PostgreSQL, sin depender de servicios
externos ni suscripciones por usuario.

---

## Qué incluye

| Módulo | Para qué sirve |
|---|---|
| **Tickets** | Incidencias y solicitudes con SLA, asignación múltiple y fusión de duplicados |
| **Inventario / CMDB** | Equipos, licencias y ubicaciones. Se actualiza solo con el agente |
| **Problemas** | Causa raíz de incidentes recurrentes |
| **Cambios** | Solicitudes con análisis de riesgo, plan de reversión y aprobación |
| **Catálogo de servicios** | Lo que TI ofrece, con flujo de aprobación |
| **Órdenes de trabajo** | Trabajo en campo con evidencias y firma |
| **Planificador** | Mantenimiento preventivo recurrente |
| **Base de conocimiento** | Procedimientos documentados |
| **Ausencias** | Solicitud y aprobación de permisos |
| **Analytics** | MTTR, cumplimiento de SLA, satisfacción y carga por persona |

---

## Arquitectura

```
TicketWati/
├── src/                  Interfaz web (React 19 + TypeScript + Vite)
│   ├── lib/http.ts       Cliente HTTP con JWT y renovación automática
│   ├── lib/api/          Capa de datos por dominio
│   └── pages/public/     Página comercial y guía de uso
│
├── server/               API (Node + Express + TypeScript)
│   ├── src/core/         Registro de recursos y motor CRUD
│   ├── src/auth/         JWT, contraseñas y autorización
│   ├── src/routes/       Endpoints
│   ├── src/services/     Correo y almacenamiento
│   └── src/migrations/   Migraciones SQL versionadas
│
├── tools/analisishardware/   Agente de inventario (Python)
└── backup/               Respaldo de la base de datos
```

**Decisiones de diseño**

- **Autorización en la API, no en la base.** Un único punto decide qué puede
  ver cada usuario: el middleware comprueba organización y rol en cada petición.
- **Lista blanca de recursos.** `server/src/core/registry.ts` declara qué tablas
  se exponen, con qué columnas y para qué roles. Nada fuera de ese registro es
  alcanzable desde el exterior.
- **Sin credenciales en la base de datos.** Las claves de correo y
  almacenamiento viven en el `.env` del servidor, nunca en tablas ni en el
  navegador.
- **Configuración por entorno.** No hay valores de conexión escritos en el código.

---

## Puesta en marcha

### Requisitos

- Node.js 20 o superior
- PostgreSQL 16 o superior
- Python 3.9+ (sólo para el agente de inventario)

### 1. Instalar dependencias

```bash
npm run install:all
```

### 2. Configurar el servidor

```bash
cd server
cp .env.example .env
```

Edita `server/.env` con los datos de tu base:

```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=ticketwati
PGUSER=postgres
PGPASSWORD=tu-contraseña

# Genera uno propio:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_SECRET=...
```

### 3. Crear la base y aplicar migraciones

```bash
createdb -U postgres ticketwati
npm run db:migrate
```

### 4. Configurar la interfaz

```bash
cp .env.example .env     # en la raíz del proyecto
```

```env
VITE_API_URL=http://localhost:4000/api/v1
```

### 5. Arrancar

En dos terminales:

```bash
npm run server:dev   # API en http://localhost:4000
npm run dev          # Interfaz en http://localhost:3000
```

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Interfaz en modo desarrollo |
| `npm run build` | Compila la interfaz para producción |
| `npm run server:dev` | API con recarga automática |
| `npm run server:build` | Compila la API |
| `npm run server:start` | Arranca la API compilada |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:migrate:status` | Muestra el estado de las migraciones |
| `npm run install:all` | Instala dependencias de interfaz y servidor |

---

## Agente de inventario

Un script de Python que se instala en cada equipo Windows y envía su ficha
técnica una vez al día.

**1. Crear la clave de integración** (en el servidor):

```bash
cd server
npx tsx src/db/crear-api-key.ts "Agente de inventario"
```

Se muestra una sola vez. Guárdala.

**2. En cada equipo:**

```bash
cd tools/analisishardware
pip install -r requirements.txt
cp agente.ini.ejemplo agente.ini    # y completa url y clave
python agente_inventario.py --probar # comprueba sin enviar
python agente_inventario.py          # envía
```

**3. Programar la ejecución diaria:**

```cmd
schtasks /create /tn "Inventario TicketWati" ^
  /tr "python C:\ruta\agente_inventario.py" /sc daily /st 09:00 /ru SYSTEM
```

---

## API

Base: `/api/v1`. Todo salvo `/auth/login` requiere `Authorization: Bearer <token>`.

**Autenticación**

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/refresh` | Renovar el token |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/auth/me` | Usuario y organización actuales |
| POST | `/auth/forgot-password` | Solicitar recuperación |
| POST | `/auth/reset-password` | Fijar nueva contraseña |

**Recursos** — el router genérico cubre cada recurso del registro:

```
GET    /api/v1/:recurso          listar
GET    /api/v1/:recurso/:id      obtener
POST   /api/v1/:recurso          crear
PATCH  /api/v1/:recurso/:id      modificar
DELETE /api/v1/:recurso/:id      eliminar
```

Parámetros de listado:

```
?expand=requester,assignee     incluir relaciones
?status=open                   filtrar
?status[in]=open,pending       operadores: eq neq gt gte lt lte like ilike
                               in nin is_null not_null contains overlaps
?order=created_at&dir=desc     ordenar
?limit=50&offset=0             paginar
?search=impresora              búsqueda de texto
?count=true                    incluir el total
```

**Específicos**

| Ruta | Descripción |
|---|---|
| `POST /tickets/:id/comentarios` | Comentar (público o interno) |
| `PUT /tickets/:id/asignados` | Reemplazar personas asignadas |
| `POST /tickets/:id/fusionar` | Fusionar duplicados |
| `GET /estadisticas/dashboard` | Indicadores del panel |
| `GET /estadisticas/buscar?q=` | Búsqueda global |
| `POST /hardware/report` | Ingesta del agente (cabecera `X-Agent-Key`) |
| `POST /archivos` | Subir adjunto |
| `GET /health` | Estado del servicio |

---

## Respaldos

```bash
pg_dump -U postgres -d ticketwati -f respaldo.sql
```

Respalda también `server/storage/` (adjuntos) y `server/.env`.

La carpeta `backup/` incluye un respaldo con su script de restauración.

---

## Seguridad

- Contraseñas con bcrypt; bloqueo temporal tras varios intentos fallidos.
- Sesiones con JWT corto y refresh token rotatorio guardado hasheado.
- Aislamiento por organización aplicado en cada consulta.
- Límite de peticiones por IP, más estricto en autenticación.
- Adjuntos servidos sólo con sesión válida y acotados a su organización.
- Credenciales de proveedores fuera de la base de datos.

Antes de publicar en producción:

1. Define `NODE_ENV=production` y un `JWT_SECRET` propio.
2. Sirve la aplicación por HTTPS.
3. Ajusta `CORS_ORIGINS` al dominio real.
4. Programa respaldos automáticos.
