# Auditoría Integral — TicketWati v2

> **Fecha:** 2 de abril de 2026  
> **Plataforma:** TicketWati — ITSM Multi-tenant  
> **Stack:** React 19 + TypeScript + Vite 7 + Supabase (PostgreSQL) + Tailwind CSS 4  
> **Roles soportados:** `admin`, `manager`, `agent`, `technician`, `customer`, `developer`

---

## Metodología

Esta auditoría fue realizada archivo por archivo sobre el código fuente del proyecto. Se organizan los hallazgos **desde lo más primordial hasta lo más trivial**, priorizando la feature de **Integración Amazon SES (Email → Tickets)** como base funcional del proyecto.

Cada sección contiene:
- **Estado Actual**: lo que existe y funciona
- **Hallazgos Críticos**: problemas que bloquean o comprometen funcionalidad
- **Mejoras Recomendadas**: ordenadas por impacto

---

# ═══════════════════════════════════════════════════
# NIVEL 1 — CRÍTICO / BLOQUEANTE
# ═══════════════════════════════════════════════════

## 1. Integración Amazon SES (Email → Tickets) ⭐ PRIORIDAD MÁXIMA

**Archivos analizados:**
- `supabase/functions/process-inbound-email/index.ts` (283 líneas)
- `supabase/functions/send-email-reply/index.ts` (250 líneas)
- `supabase/functions/test-ses-connection/index.ts` (153 líneas)
- `src/pages/settings/EmailIntegration.tsx` (512 líneas)
- Migraciones: `001` a `006`

### Estado Actual

| Componente | Estado |
|---|---|
| Recepción (SNS → S3 → Edge Function) | ⚠️ Funcional pero frágil |
| Parseo de email raw | ❌ Regex básico, no procesa MIME |
| Creación de ticket desde email | ⚠️ Funcional pero limitado |
| Envío de respuestas vía SES | ✅ Funcional |
| Prueba de conexión SES | ✅ Funcional |
| UI de configuración SES | ✅ Completa |
| Mapeo email → departamento | ✅ Implementado |
| Log de procesamiento | ✅ Tabla `email_processing_log` |
| Detección de duplicados | ✅ Por `email_message_id` |
| Migración S3 (incoming → processed/unmatched) | ✅ Implementada |

### Hallazgos Críticos

#### 1.1 🔴 SIN VALIDACIÓN DE FIRMA SNS
**Archivo:** `process-inbound-email/index.ts`, línea 47  
**Impacto:** SEGURIDAD CRÍTICA — Cualquier POST HTTP puede crear tickets falsos.

```typescript
// Línea 47: TODO explícito sin implementar
// 3. Validate SNS signature (TODO: implement signature validation)
// For production, verify the signature using AWS's public certificate
```

**Acción requerida:** Implementar validación criptográfica del certificado SNS usando `crypto.createVerify('SHA256')` con el `SigningCertURL` del mensaje. Verificar además que el `SigningCertURL` proviene de `*.amazonaws.com`.

#### 1.2 🔴 PARSEO DE EMAIL CON REGEX — NO PROCESA MIME
**Archivo:** `process-inbound-email/index.ts`, líneas 105-116  
**Impacto:** Los emails con HTML, adjuntos, encodings especiales (UTF-8, base64, quoted-printable) o headers multi-línea se parsean incorrectamente o se pierden.

```typescript
// Función extractHeader: solo extrae la primera línea del header
function extractHeader(email: string, header: string): string | null {
    const regex = new RegExp(`^${header}:\\s*(.+)$`, 'mi')
    // No maneja headers multi-línea (folded headers RFC 2822)
    // No decodifica =?UTF-8?Q?...?= ni =?UTF-8?B?...?=
}
```

**Problemas concretos verificados:**
- Subjects con caracteres especiales (`=?UTF-8?B?...?=`) se guardan raw
- Headers multi-línea (folded) no se concatenan
- No extrae el body del email — **se guarda el email RAW completo como `description`** (línea 174)
- No procesa `Content-Transfer-Encoding`
- No diferencia entre text/plain y text/html

**Acción requerida:** Usar `mailparser` (compatible con Deno via npm) para parsear correctamente el RFC 2822 MIME. Ya está documentado como TODO en línea 106.

#### 1.3 🔴 NO PROCESA ADJUNTOS DE EMAILS ENTRANTES
**Impacto:** Cualquier adjunto del email se pierde completamente. El email raw se almacena en S3 pero los adjuntos no se extraen ni vinculan al ticket.

**Acción requerida:** Tras el parseo MIME, extraer las partes `multipart/mixed`, subirlas a S3 y vincularlas al ticket como attachments.

#### 1.4 🔴 RESOLUCIÓN DE TENANT HARDCODEADA
**Archivo:** `process-inbound-email/index.ts`, líneas 61-67

```typescript
// Solo toma el primer tenant — FALLA en multi-tenant real
const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .single()
```

**Impacto:** En un deploy multi-tenant, todos los emails irían al mismo tenant.  
**Acción requerida:** Determinar el tenant por el dominio del email destinatario (`toEmail`), cruzando contra `teams.email_address` y su `tenant_id`.

#### 1.5 🟡 SIN CONFIRMACIÓN AUTOMÁTICA DE SUSCRIPCIÓN SNS
**Archivo:** `process-inbound-email/index.ts`, líneas 37-45

```typescript
if (snsMessage.Type === 'SubscriptionConfirmation') {
    // In production, you should fetch the SubscribeURL and confirm
    // Solo retorna success sin confirmar
}
```

**Acción requerida:** Hacer `fetch(snsMessage.SubscribeURL)` para confirmar la suscripción automáticamente.

#### 1.6 🟡 PRIORIDAD Y TIPO HARDCODEADOS PARA EMAILS ENTRANTES
**Archivo:** `process-inbound-email/index.ts`, líneas 175-176

```typescript
type: 'service_request',  // Siempre fijo
priority: 'low',          // Siempre fijo
```

**Acción requerida:** Hacer estos valores configurables por tenant en `tenant_settings`, opcionalmente inferir prioridad por keywords en el subject.

#### 1.7 🟡 SIN DETECCIÓN DE BUCLES DE AUTO-RESPUESTA
Si el sistema responde a un email y el destinatario tiene auto-responder (vacaciones, etc.), se crearía un ticket por cada auto-respuesta.

**Acción requerida:** Verificar headers `Auto-Submitted`, `X-Auto-Response-Suppress`, `Precedence: bulk/auto_reply` antes de crear ticket.

#### 1.8 🟡 SIN THREADING DE RESPUESTAS
**Archivo:** `send-email-reply/index.ts`, líneas 159-166  
El `In-Reply-To` header NO se establece en las respuestas salientes. Los tags de SES se usan pero no los headers estándar de threading RFC 2822.

```typescript
// Se usan Tags de SES pero no headers de email para threading
...(ticket.email_message_id && {
    ReplyToAddresses: [sesConfig.default_from_email],
    Tags: [...]
})
```

**Acción requerida:** Usar `SendRawEmailCommand` en lugar de `SendEmailCommand` para poder establecer headers `In-Reply-To` y `References` correctamente.

#### 1.9 🟡 SIN COLA DE REINTENTOS
Si un email falla al procesarse, solo se loguea el error. No hay mecanismo de reintento.  
**Acción requerida:** Implementar cola dead-letter con reintentos exponenciales o aprovechar SNS retry policy.

#### 1.10 🟡 SOPORTE SOLO TEXTO PLANO EN ENTRADA
El email entrante se almacena raw. No se extrae HTML ni se convierte a texto limpio.  
**Acción requerida:** Con `mailparser`, extraer `textAsHtml` o `text` del email parseado.

### Mejoras Adicionales (Email)
- Rate limiting para prevenir spam vía email
- Soporte para múltiples destinatarios CC en creación de ticket
- Mapeo de respuestas a comentarios existentes (por `In-Reply-To`/`References`)
- Procesamiento de bounces/complaints vía SNS notifications
- Templates de email personalizables por tenant
- Blacklist/whitelist de dominios de remitente

---

## 2. Seguridad — Vulnerabilidades Críticas

### 2.1 🔴 CLAVES S3 EXPUESTAS EN EL NAVEGADOR
**Archivo:** `src/lib/s3.ts`  
**Impacto:** SEGURIDAD CRÍTICA

Las credenciales AWS (access key + secret key) se obtienen de `tenant_settings` y se usan **directamente en el cliente JavaScript**. Cualquier usuario puede extraerlas desde DevTools → Network/Sources.

```typescript
// s3.ts línea 35-41: Las claves se envían al navegador
return {
    bucket: settings.s3_bucket,
    region: settings.s3_region,
    access_key: settings.s3_access_key,  // ← EXPUESTA
    secret_key: settings.s3_secret_key,  // ← EXPUESTA
}
```

**Agravante:** El `RichTextEditor` (línea 138) y `FileUploader` usan `uploadFileToS3()` directamente, ejecutando uploads con estas claves desde el navegador.

**Acción requerida:** Crear una Edge Function `upload-to-s3` que genere presigned URLs server-side. El frontend solo debe usar la presigned URL para subir.

### 2.2 🔴 XSS EN RICHTEXTEDITOR — SIN SANITIZACIÓN HTML
**Archivo:** `src/components/common/RichTextEditor.tsx`  
El contenido HTML ingresado por usuarios se almacena sin sanitización y se renderiza con `innerHTML` y `contentEditable`.

```typescript
// Línea 71: innerHTML se establece directamente del value prop
editorRef.current.innerHTML = value || ''
```

**Ni DOMPurify ni ninguna sanitización se aplican.** Un atacante podría inyectar `<script>`, `<img onerror=...>`, o `<svg onload=...>` vía comentarios de tickets.

**Acción requerida:** Integrar DOMPurify para sanitizar todo HTML antes de renderizarlo. Preferiblemente migrar a TipTap (las dependencias **ya están instaladas** en `package.json` pero **no se usan** en este componente).

### 2.3 🟡 `get_ses_credentials` es SECURITY DEFINER
**Archivo:** Migración `006_add_rls_policies_for_ses_credentials.sql`, línea 67

La función `get_ses_credentials` puede ser invocada por cualquier rol autenticado vía PostgREST `.rpc()`. Aunque está diseñada para Edge Functions (service role), un usuario normal podría invocarla con su JWT y obtener las credenciales SES.

**Acción requerida:** Agregar validación dentro de la función para verificar que el caller tiene el rol `service_role`, o revocar `EXECUTE` de `anon`/`authenticated`.

### 2.4 🟡 POLÍTICA RLS "Service role" DEMASIADO PERMISIVA
**Archivo:** Migración `006`, líneas 48-51

```sql
CREATE POLICY "Service role can access tenant settings" ON tenant_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

Esta política permite a **cualquier** rol (incluyendo `anon`) acceso completo a `tenant_settings` porque `USING (true)` no discrimina. En Supabase, las políticas son OR, así que esta anula las restricciones admin-only.

**Acción requerida:** Eliminar esta política o restringirla con `auth.role() = 'service_role'`.

---

## 3. Autenticación y Multi-tenancy — Bugs Críticos

**Archivos:** `src/contexts/AuthContext.tsx`, `src/contexts/TenantContext.tsx`

### 3.1 🔴 RE-SUSCRIPCIONES DUPLICADAS en `useEffect`
**Archivo:** `AuthContext.tsx`, línea 176

```typescript
}, [fetchProfileAndTenant, profile]) // ← profile en deps
```

`profile` es estado que cambia cuando `fetchProfileAndTenant` lo actualiza, lo que causa un ciclo:
1. `useEffect` se ejecuta → subscribe a `onAuthStateChange`
2. Auth event → `fetchProfileAndTenant` → `setProfile(...)` → `profile` cambia
3. `useEffect` se re-ejecuta → unsubscribe + re-subscribe → potencialmente duplica listeners

**Impacto:** Memory leak y posibles double-fetches.  
**Acción requerida:** Remover `profile` del dependency array. Usar un ref para la comparación.

### 3.2 🟡 SIGNUP SIEMPRE CREA ROL `customer`
**Archivo:** `AuthContext.tsx`, línea 250

```typescript
role: 'customer',  // Hardcodeado
```

No hay forma de crear usuarios con otros roles desde el registro. **Sin recuperación de contraseña** (no existe `/forgot-password` aunque hay links a esa ruta). Sin 2FA/MFA. Sin SSO.

### 3.3 🟡 `TenantContext` es REDUNDANTE
**Archivo:** `TenantContext.tsx` (38 líneas)

Solo re-expone datos que ya existen en `AuthContext`. Podría ser un custom hook:

```typescript
export const useTenant = () => {
    const { tenant } = useAuth()
    return { tenant, tenantId: tenant?.id, ... }
}
```

---

# ═══════════════════════════════════════════════════
# NIVEL 2 — IMPORTANTE / ALTA PRIORIDAD
# ═══════════════════════════════════════════════════

## 4. Arquitectura del API — Archivo God

**Archivo:** `src/lib/api.ts` — **1688 líneas**

### Hallazgos

| Problema | Líneas |
|---|---|
| Archivo monolítico con 1688 líneas | Todo el archivo |
| `as unknown as X` casts inseguros | 242, 634, 663, 774, 793, 1254, 1508 |
| `as any` cast directo | `ListConfigurationEditor.tsx:102` |
| `workOrdersApi.getHistory()` retorna `[]` siempre | 637-639 |
| `ticketsApi.getStats` hace 4+ queries secuenciales | 391-468 |
| `analyticsApi.getPlanningAccuracy` agrega en cliente | 1625-1687 |
| Sin capa de caché para datos frecuentes | Todo el archivo |

**Acción requerida:** Dividir en módulos:
- `api/tickets.ts`
- `api/work-orders.ts`
- `api/assets.ts`
- `api/maintenance.ts`
- `api/analytics.ts`
- `api/teams.ts`
- `api/settings.ts`

## 5. Componentes UI — Defectos Funcionales

### 5.1 🔴 FileUploader — Drag-and-Drop FALSO
**Archivo:** `src/components/common/FileUploader.tsx`

La UI dice "arrastra archivos aquí" (línea 127) pero **NO tiene handlers** `onDragOver`, `onDrop`, `onDragEnter`. Solo funciona con click → file input.

```html
<!-- Línea 110: dice arrastrar pero no tiene handlers drag -->
<div className="border-2 border-dashed..." onClick={...}>
```

**Acción requerida:** Implementar `onDragOver={e => e.preventDefault()}`, `onDrop={handleDrop}`, y estado visual de drag-over.

### 5.2 🔴 Checkbox — Label NO está conectado al input
**Archivo:** `src/components/ui/Checkbox.tsx`, líneas 21-25

```typescript
{label && <label onClick={(e) => {
    // Forward click to input if label clicked?
    // Just rely on user clicking box or styling label.
}}>...}
```

El `onClick` del label es un NO-OP. No usa `htmlFor` para conectar con el input. Click en el texto no togglea el checkbox.

**Acción requerida:** Usar `htmlFor` + `id`, o wrappear ambos en un único `<label>`.

### 5.3 🔴 Dialog — Sin accesibilidad básica
**Archivo:** `src/components/ui/Dialog.tsx` (50 líneas)

- ❌ Sin cierre con tecla `Escape`
- ❌ Sin focus trap (tab puede salir del dialog)
- ❌ Sin atributos ARIA (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`)
- ❌ Sin click-outside confiable (usa un div posicionado que podría fallar)

### 5.4 🟡 RichTextEditor usa `document.execCommand` (DEPRECADO)
**Archivo:** `RichTextEditor.tsx`, línea 78

```typescript
document.execCommand(command, false, value) // Deprecado por W3C
```

Las dependencias de **TipTap ya están instaladas** (`@tiptap/react`, `@tiptap/starter-kit`, extensiones de color, imagen, link, placeholder, text-style) pero **no se usan**. Es código muerto en `package.json`.

### 5.5 🟡 SLA Components — No se actualizan en tiempo real
**Archivos:** `SLAProgressBar.tsx`, `SLARiskIndicator.tsx`

Ambos calculan `new Date()` en el render pero **no tienen `setInterval`** para actualizar el progreso. Un ticket puede pasar de "OK" a "Vencido" sin que la UI cambie hasta el próximo re-render.

### 5.6 🟡 TagSelector — `key={index}` produce bugs
**Archivo:** `TagSelector.tsx`, línea 63

```typescript
{tags.map((tag, index) => (
    <Badge key={index} ...>  // ← Debe ser key={tag}
```

Usar `index` como key causa re-renders incorrectos al eliminar tags intermedios. `tag` es único (se valida en `addTag`), usarlo como key.

### 5.7 🟡 DateTimeRangePicker — Usa `alert()` para errores
**Archivo:** `DateTimeRangePicker.tsx`, línea 38

```typescript
alert('La fecha de fin debe ser posterior a la fecha de inicio')
```

Debería usar el sistema de toast ya implementado.

### 5.8 🟡 InfoTooltip — No accesible
**Archivo:** `InfoTooltip.tsx`

Solo funciona con hover (CSS `group-hover`). No accesible por teclado ni screen readers. Sin `aria-describedby`, sin `tabIndex`.

### 5.9 🟡 `use-toast.ts` — Acción `UPDATE_TOAST` muerta
**Archivo:** `src/hooks/use-toast.ts`, línea 57

```typescript
dispatch({ type: 'UPDATE_TOAST', ... })
```

`UPDATE_TOAST` se dispatcha pero **no está manejado** en la función `dispatch` (solo maneja `ADD_TOAST` y `DISMISS_TOAST`). La función `update` retornada por `toast()` no hace nada.

---

## 6. Layout y Navegación

**Archivo:** `src/components/layout/AppLayout.tsx` (304 líneas)

### 6.1 🔴 Búsqueda NO FUNCIONAL
**Líneas 226-229:** El buscador es solo visual, no tiene input real ni handler:

```typescript
<Search size={22} />
<span>Search (Ctrl+k)</span>  // ← Solo texto estático
```

### 6.2 🔴 Notificaciones ESTÁTICAS
**Líneas 238-241:** La campana siempre muestra un dot rojo. No hay sistema de notificaciones implementado.

### 6.3 🟡 Dropdown de usuario sin click-outside
**Línea 259:** El menú de usuario se abre pero no se cierra al hacer click fuera.

### 6.4 🟡 Componente monolítico
304 líneas deberían dividirse en: `Sidebar.tsx`, `TopNavbar.tsx`, `UserMenu.tsx`.

### 6.5 🟡 Link de GitHub hardcodeado
**Línea 234:** `href="https://github.com"` — apunta al home de GitHub, no a ningún repo relevante.

---

# ═══════════════════════════════════════════════════
# NIVEL 3 — FUNCIONALIDAD EXISTENTE CON MEJORAS
# ═══════════════════════════════════════════════════

## 7. Gestión de Tickets

**Archivos:** `src/pages/tickets/` (5 archivos), `src/components/tickets/MergeTicketsModal.tsx`

### Estado Actual
- ✅ CRUD completo con campos extendidos (impacto, esfuerzo, fechas planificadas, tags)
- ✅ Vista de lista (`TicketsList.tsx` — 37K) y detalle (`TicketDetail.tsx` — 77K)
- ✅ Filtrado por estado, prioridad, tipo, equipo, merge status
- ✅ Selección masiva y fusión de tickets duplicados
- ✅ Comentarios con editor de texto enriquecido
- ✅ Asignación múltiple (`ticket_assignees`)
- ✅ SLA con barra de progreso e indicador de riesgo
- ✅ Navegación entre tickets fusionados

### Hallazgos
| # | Tipo | Detalle |
|---|---|---|
| 7.1 | BUG | `MergeTicketsModal` usa `alert()` (líneas 24, 33) en vez de toast |
| 7.2 | BUG | `TicketDetail.tsx` es un archivo de 77K líneas — muy difícil de mantener |
| 7.3 | MEJORA | Sin búsqueda full-text en títulos y descripciones |
| 7.4 | MEJORA | Sin vista Kanban (podría reutilizar `KanbanBoard` de desarrollo) |
| 7.5 | MEJORA | Sin notificaciones en tiempo real (Supabase Realtime no utilizado) |
| 7.6 | MEJORA | Sin plantillas de respuesta predefinidas para agentes |
| 7.7 | MEJORA | Sin auto-guardado de borradores |
| 7.8 | MEJORA | `Button.tsx` no tiene `type="button"` por defecto (puede causar submissions accidentales) |

---

## 8. Dashboard

**Archivo:** `src/pages/Dashboard.tsx` (21K)

### Estado Actual
- ✅ 4 tarjetas de estadísticas: tickets abiertos, resueltos hoy, tiempo promedio, SLA breach
- ✅ Lista de tickets recientes
- ✅ Órdenes de trabajo del día
- ✅ Redirección de customers a `/tickets`
- ✅ `Promise.allSettled` para tolerancia a fallos

### Mejoras
- Gráficos de tendencia (sparklines en tarjetas)
- Widget de actividades de mantenimiento pendientes
- Notificaciones de SLA por vencer
- Skeleton loading en lugar de estado vacío
- Métricas de ausencias pendientes de aprobación

---

## 9. Gestión de Usuarios

**Archivo:** `src/pages/UsersPage.tsx` (24K)

### Estado Actual
- ✅ Listado, búsqueda, filtro por rol
- ✅ Cambio de rol inline
- ✅ Activar/desactivar usuarios
- ✅ Eliminación con confirmación en dos pasos
- ✅ Creación vía Edge Function `admin-create-user`
- ✅ Filtrado por equipo para managers

### Mejoras
- Importación masiva por CSV
- Invitación por email en vez de creación manual
- Historial de cambios de rol (auditoría)
- Bulk actions (activar/desactivar múltiples)
- Asignación a múltiples equipos simultáneamente

---

## 10. Analíticas

**Archivo:** `src/pages/AnalyticsPage.tsx` (31K), `AbsenceDashboard.tsx` (11K)

### Estado Actual
- ✅ KPIs: MTTR, FCR, CSAT, SLA Breach
- ✅ Gráficos: tickets por día, por usuario, por categoría
- ✅ KPIs de Dev/Infra
- ✅ Dashboard de ausencias: por mes, razón (pie), departamento, top 10

### Hallazgos
| # | Tipo | Detalle |
|---|---|---|
| 10.1 | BUG | Race condition documentada en `ANALYTICS_RACE_CONDITION_FIX.md` |
| 10.2 | BUG | Filtro de departamento no se aplica correctamente para no-admins |
| 10.3 | MEJORA | Exportar reportes a PDF/Excel no implementado |
| 10.4 | MEJORA | Sin filtros de fecha personalizados |
| 10.5 | MEJORA | Sin dashboard de satisfacción del cliente (CSAT) |
| 10.6 | MEJORA | Sin métricas de productividad por agente |
| 10.7 | MEJORA | Sin alertas basadas en umbrales |

---

## 11. Gestión de Activos

**Archivo:** `src/pages/AssetsPage.tsx` (wrapper), lógica en `api.ts`

### Estado Actual
- ✅ CRUD completo con campos extendidos (ubicación, seguros, vendor, hardware info JSON)
- ✅ Historial de cambios automático vía trigger `on_asset_change`
- ✅ Grupos de activos
- ✅ Campos personalizados (`custom_fields_schema` JSONB)

### Mejoras
- Escaneo automático de hardware (integración con agentes)
- Código QR/etiquetas para activos físicos
- Alertas de vencimiento de seguros
- Depreciación automática
- Vista de árbol para grupos
- Historial usa `Record<string, unknown>` — mejorar tipado

---

## 12. Órdenes de Trabajo

**Archivos:** `src/pages/work-orders/`, `WorkOrdersPage.tsx`

### Hallazgos
| # | Tipo | Detalle |
|---|---|---|
| 12.1 | BUG | `workOrdersApi.getHistory()` retorna `[]` — stub sin implementar |
| 12.2 | INCONSISTENCIA | Estilos inline en lugar de Tailwind |
| 12.3 | MEJORA | Asignación de múltiples técnicos |
| 12.4 | MEJORA | Checklist de tareas dentro de la orden |
| 12.5 | MEJORA | Firma digital de completitud |
| 12.6 | MEJORA | Geolocalización para trabajo de campo |
| 12.7 | MEJORA | Vista calendario de órdenes programadas |

---

## 13. Gestión de Cambios (ITIL)

**Archivos:** `src/pages/changes/`

### Estado Actual
- ✅ RFC: draft, pending_approval, approved, rejected, implemented, cancelled
- ✅ Tipos: standard, normal, emergency
- ✅ Tablero Kanban embebido para tareas
- ✅ Adjuntos en S3

### Mejoras
- Flujo de aprobación con CAB (Change Advisory Board)
- Programación de ventanas de cambio
- Evaluación de impacto en servicios dependientes
- Rollback plan obligatorio
- Notificaciones a stakeholders

---

## 14. Gestión de Problemas (ITIL)

**Archivos:** `src/pages/problems/`

### Estado Actual
- ✅ Estados: new, analyzing, root_cause_identified, fix_in_progress, resolved, closed
- ✅ Análisis de causa raíz
- ✅ Workaround documentado
- ✅ Tablero Kanban embebido

### Mejoras
- Vinculación automática de tickets relacionados
- Análisis de tendencia de problemas recurrentes
- Templates RCA estructurados (5 Whys, Ishikawa)
- Métricas de tiempo para resolución de causa raíz

---

## 15. Desarrollo Ágil

**Archivos:** `src/pages/development/`

### Estado Actual
- ✅ Kanban drag-and-drop con `@hello-pangea/dnd`
- ✅ User stories con tipos (story/bug/task/epic), story points, prioridad
- ✅ Gestión de proyectos (sprints)
- ✅ Métricas de progreso

### Mejoras
- Velocity tracking por sprint
- Burndown chart
- Epic como contenedor de stories
- Timeboxing de sprints
- Asignación de stories a tickets de soporte

---

## 16. Base de Conocimientos

**Archivo:** `src/pages/KnowledgeBasePage.tsx` (27K)

### Estado Actual
- ✅ Artículos: article, video, link
- ✅ Embed YouTube/Microsoft Stream
- ✅ Contador de vistas
- ✅ Estados: draft, published, archived
- ✅ Visibilidad por departamento

### Mejoras
- Búsqueda full-text con ranking
- Artículos sugeridos basados en tickets similares
- Feedback de utilidad (¿fue útil?)
- Versionado de artículos
- Vinculación automática de KB al crear tickets por categoría

---

## 17. Planificador de Mantenimiento

**Archivos:** `src/pages/PlannerPage.tsx` (21K), `src/lib/planner.ts`

### Estado Actual
- ✅ Planes recurrentes (daily/weekly/monthly/yearly)
- ✅ Generación automática de actividades
- ✅ Auto-creación de tickets desde actividades
- ✅ Vista calendario mensual
- ✅ Export a CSV e impresión
- ✅ Asignación múltiple

### Hallazgos
| # | Tipo | Detalle |
|---|---|---|
| 17.1 | BUG | La frecuencia `custom` se trata como `monthly` (planner.ts:38) |
| 17.2 | BUG | Sin manejo de zonas horarias — `toISOString().split('T')[0]` asume UTC |
| 17.3 | MEJORA | Calendario de exclusión (festivos, maintenance windows) |
| 17.4 | MEJORA | Notificaciones previas a actividades programadas |
| 17.5 | MEJORA | Vista Gantt |
| 17.6 | MEJORA | Dependencias entre actividades |

---

## 18. Gestión de Ausencias

**Archivos:** `src/pages/absences/AbsencesPage.tsx` (33K), `AbsenceDashboard.tsx` (11K)

### Estado Actual
- ✅ Solicitud con razones, fechas, horarios
- ✅ Adjuntos: evidencia, certificados médicos en S3
- ✅ Flujo de aprobación con comentarios
- ✅ Dashboard analítico

### Mejoras
- Balance de días disponibles por tipo de ausencia
- Calendario de equipo para visualizar coberturas
- Reglas de aprobación automáticas (< 3 días auto-aprobar)
- Integración con calendario (iCal export)
- Notificaciones push de aprobación/rechazo

---

## 19. Catálogo de Servicios

**Archivo:** `src/pages/ServiceCatalogPage.tsx` (801 bytes - wrapper)

### Estado Actual
- ✅ Items por tipo: hardware, software, access, service
- ✅ Precio multi-moneda (USD/EUR/MXN/COP)
- ✅ Flag de aprobación requerida

### Mejoras
- Formulario dinámico basado en `form_schema` JSON (existe el campo pero no se renderiza)
- Flujo de solicitud/aprobación
- Carrito de servicios múltiples
- SLA de entrega por servicio
- Métricas de demanda

---

# ═══════════════════════════════════════════════════
# NIVEL 4 — CONFIGURACIÓN Y CALIDAD DE CÓDIGO
# ═══════════════════════════════════════════════════

## 20. Configuración y Settings

**Archivos:** `src/pages/SettingsPage.tsx` (7K), `src/pages/settings/` (17 archivos)

### Hallazgos del `ListConfigurationEditor`

| # | Tipo | Detalle |
|---|---|---|
| 20.1 | BUG | `Date.now().toString()` para IDs (línea 120) — colisiones posibles |
| 20.2 | BUG | `as any` cast en línea 102 rompe type safety |
| 20.3 | BUG | Usa `alert()` para mensajes (líneas 105, 108) |
| 20.4 | MEJORA | Sin validación antes de guardar |
| 20.5 | MEJORA | Sin funcionalidad de reset/revert |
| 20.6 | MEJORA | Preview de branding en tiempo real |
| 20.7 | MEJORA | Webhooks para integraciones externas |
| 20.8 | MEJORA | Audit log de cambios en configuración |

---

## 21. Base de Datos y Migraciones

### Hallazgos
| # | Tipo | Detalle |
|---|---|---|
| 21.1 | BUG | Migraciones `017` duplicadas: `017_add_business_hours.sql` y `017_maintenance_activities_extended.sql` |
| 21.2 | BUG | Falta migración `020` (salta de 019 a 021) |
| 21.3 | INFO | `database.ts` es 46K — tipo generado automáticamente, correcto |
| 21.4 | MEJORA | Sin índices explícitos para búsquedas frecuentes |
| 21.5 | MEJORA | Sin funciones de BD para aggregaciones complejas |

---

## 22. Calidad de Código General

### `stripHtml` en utils.ts tiene riesgo XSS menor
**Archivo:** `utils.ts`, líneas 66-70

```typescript
export function stripHtml(html: string): string {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html  // ← Ejecuta scripts si hay <img onerror=...>
    return tmp.textContent || ""
}
```

Usar DOMPurify para sanitizar primero.

### Dependencia `postgres` innecesaria en frontend
**Archivo:** `package.json`, línea 32

```json
"postgres": "^3.4.8"
```

Esta es una librería de Node.js para conexiones directas a PostgreSQL. No tiene sentido en un frontend React que usa Supabase JS Client. Peso muerto en el bundle.

### Archivos TypeScript de errores en producción
- `tsc_errors.txt` (10K)
- `tsc_output.txt` (11K)
- `lint.txt` (54K)
- `ts_errors.txt`

Estos archivos de debug no deberían estar en el repositorio. Agregar al `.gitignore`.

### Archivos SQL sueltos en la raíz
- `DIAGNOSTICO_ANALYTICS.sql`
- `FIX_COMUNICACIONES_USER.sql`
- `MERGE_TICKETS_MIGRATION.sql`
- `deduplicate_teams.sql`
- `department_setup.sql`
- `supabase_schema_update.sql`
- `schema_dump.sql`

Estos deberían estar en `supabase/migrations/` o en un directorio `scripts/sql/`.

---

# ═══════════════════════════════════════════════════
# RESUMEN DE PRIORIDADES
# ═══════════════════════════════════════════════════

## Plan de Acción Priorizado

| Fase | Prioridad | Área | Acción | Tipo |
|---|---|---|---|---|
| **1** | 🔴 P0 | **SES Email** | Implementar validación de firma SNS | Seguridad |
| **1** | 🔴 P0 | **SES Email** | Implementar parseo MIME con `mailparser` | Feature Core |
| **1** | 🔴 P0 | **SES Email** | Resolver tenant por dominio de email (no `LIMIT 1`) | Bug Multi-tenant |
| **1** | 🔴 P0 | **SES Email** | Confirmar suscripción SNS automáticamente | Feature Core |
| **1** | 🔴 P0 | **SES Email** | Extraer body limpio (no guardar raw como description) | Feature Core |
| **1** | 🔴 P0 | **Seguridad** | Mover S3 credentials al backend (presigned URLs) | Seguridad |
| **1** | 🔴 P0 | **Seguridad** | Sanitizar HTML (DOMPurify) en RichTextEditor | Seguridad |
| **1** | 🔴 P0 | **Seguridad** | Restringir `get_ses_credentials` y política RLS permisiva | Seguridad |
| **2** | 🟠 P1 | **SES Email** | Procesar adjuntos de emails entrantes → S3 | Feature |
| **2** | 🟠 P1 | **SES Email** | Implementar threading (`In-Reply-To`/`References`) | Feature |
| **2** | 🟠 P1 | **SES Email** | Detección de bucles de auto-respuesta | Estabilidad |
| **2** | 🟠 P1 | **SES Email** | Prioridad/tipo configurables por tenant | Customización |
| **2** | 🟠 P1 | **Auth** | Fix `profile` en useEffect deps de AuthContext | Bug |
| **2** | 🟠 P1 | **UI** | Implementar drag-and-drop real en FileUploader | UX |
| **2** | 🟠 P1 | **UI** | Migrar RichTextEditor a TipTap (deps ya instaladas) | Estabilidad |
| **2** | 🟠 P1 | **Código** | Split `api.ts` (1688 líneas) en módulos | Mantenibilidad |
| **3** | 🟡 P2 | **UI** | Implementar búsqueda funcional (Ctrl+K) | UX |
| **3** | 🟡 P2 | **UI** | Conectar label al input en Checkbox | Accesibilidad |
| **3** | 🟡 P2 | **UI** | Focus trap + Escape en Dialog | Accesibilidad |
| **3** | 🟡 P2 | **UI** | Actualización en tiempo real de SLA components | UX |
| **3** | 🟡 P2 | **UI** | Reemplazar todos los `alert()` por toasts | UX |
| **3** | 🟡 P2 | **SES Email** | Cola de reintentos / dead-letter | Estabilidad |
| **3** | 🟡 P2 | **SES Email** | Rate limiting anti-spam | Seguridad |
| **4** | 🔵 P3 | **Planner** | Implementar frecuencia `custom` | Feature |
| **4** | 🔵 P3 | **Catálogo** | Formulario dinámico desde `form_schema` | Feature |
| **4** | 🔵 P3 | **Analytics** | Exportar a PDF/Excel | Feature |
| **4** | 🔵 P3 | **WO** | Implementar `getHistory` (actualmente stub) | Bug |
| **4** | 🔵 P3 | **Auth** | Recuperación de contraseña | Feature |
| **4** | 🔵 P3 | **Cleanup** | Remover dependencia `postgres` del frontend | Optimización |
| **4** | 🔵 P3 | **Cleanup** | Mover SQLs sueltos a migrations/scripts | Organización |
| **4** | 🔵 P3 | **Cleanup** | Agregar archivos de debug a .gitignore | Organización |
| **4** | 🔵 P3 | **DB** | Resolver migraciones 017 duplicadas | Organización |

---

## Resumen Ejecutivo

### Fortalezas del Proyecto
1. **Arquitectura sólida**: React 19 + Supabase + Tailwind CSS bien estructurado
2. **Cobertura funcional amplia**: ITSM completo (tickets, problemas, cambios, activos, KB, planner)
3. **Multi-tenancy funcional** con RLS y permisos de menú
4. **Lazy loading** de páginas reduce el bundle inicial
5. **Manejo de errores** con ErrorBoundary y toast system
6. **Integración SES** con buena base en UI y Edge Functions

### Riesgos Principales
1. **Seguridad**: Claves S3 expuestas + sin validación SNS + XSS potencial
2. **Email Integration**: Parseo de email frágil, bloqueante para producción
3. **Deuda técnica**: api.ts de 1688 líneas, dependencias instaladas pero no usadas
4. **Accesibilidad**: Componentes UI sin cumplimiento WCAG básico

### Estimación de Esfuerzo
| Fase | Esfuerzo Estimado | Impacto |
|---|---|---|
| Fase 1 (P0 - Seguridad + SES Core) | 3-5 días | Habilitante — sin esto no se puede ir a producción |
| Fase 2 (P1 - SES Completo + Bugs) | 4-6 días | Funcionalidad completa de email |
| Fase 3 (P2 - UX + Accesibilidad) | 3-4 días | Mejora significativa de experiencia |
| Fase 4 (P3 - Features + Cleanup) | 5-8 días | Pulimiento y features secundarios |
