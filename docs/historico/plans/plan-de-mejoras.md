# Plan de Mejoras - TicketWati ITSM
> Auditoria realizada: 2026-03-21
> Ultima actualizacion: 2026-03-21

---

## Estado de Ejecucion

| Fase | Estado |
|------|--------|
| Fase 1 - Bugs Criticos | COMPLETADA |
| Fase 2 - Manejo de Errores | COMPLETADA |
| Fase 3 - Calidad TypeScript | COMPLETADA |
| Fase 4 - Rendimiento (lazy loading) | PARCIAL |
| Fase 5 - Funcionalidades faltantes | PENDIENTE |
| Fase 6 - Testing | PENDIENTE |
| Fase 7 - UX y Accesibilidad | PENDIENTE |
| Fase 8 - DevOps (console.log cleanup) | COMPLETADA |

---

## Resumen Ejecutivo

TicketWati es una plataforma ITSM multi-tenant completa con módulos de tickets, órdenes de trabajo, activos, problemas, cambios, catálogo de servicios, base de conocimiento, planeador, desarrollo y ausencias. El sistema funciona correctamente pero presenta deuda técnica significativa en calidad de código, manejo de errores, rendimiento y ausencia total de pruebas.

**Puntuacion inicial estimada: 5.2/10**
**Puntuacion post-mejoras Fases 1-3+8: ~7.0/10**

---

## FASE 1 — Corrección de Bugs Críticos
> Prioridad: URGENTE | Duración estimada: 1-2 semanas

### 1.1 Bug: Campo `department` no se guarda en perfil
- **Archivo:** Revisar `src/pages/settings/ProfileSettings.tsx` y `src/lib/api.ts → profilesApi.update`
- **Impacto:** Los filtros de analytics por departamento fallan para usuarios sin departamento asignado
- **Acción:** Asegurar que el campo `department` se incluya en el payload de actualización y que el formulario lo maneje correctamente

### 1.2 Bug: Race condition en Analytics al cargar equipos
- **Archivo:** `src/pages/AnalyticsPage.tsx`
- **Impacto:** Usuarios ven datos incorrectos hasta que los equipos cargan asíncronamente
- **Acción:** Esperar que el estado de equipos esté resuelto antes de ejecutar las queries de analytics. Usar `enabled` en React Query dependiendo del estado de carga.

### 1.3 Bug: Fallos silenciosos en Dashboard
- **Archivo:** `src/pages/Dashboard.tsx` (líneas con `.catch(() => [])`)
- **Impacto:** Si una API falla, el usuario ve datos vacíos sin ningún aviso
- **Acción:** Implementar notificaciones de error al usuario cuando las llamadas de datos fallan. Distinguir entre "sin datos" y "error de carga".

### 1.4 Bug: EffortInput con setState dentro de effect
- **Archivo:** `src/components/ui/EffortInput.tsx:28`
- **Impacto:** Renders en cascada, degradación de rendimiento
- **Acción:** Reestructurar la lógica para derivar el estado del valor prop sin necesitar setState dentro del effect.

### 1.5 Bug: Merge de tickets sin propagación de error al usuario
- **Archivo:** `src/lib/api.ts` (función de merge)
- **Impacto:** El merge puede fallar sin que el usuario lo sepa
- **Acción:** Propagar errores correctamente desde la función de merge y manejarlos en `MergeTicketsModal`.

---

## FASE 2 — Manejo de Errores y Estabilidad
> Prioridad: ALTA | Duración estimada: 1-2 semanas

### 2.1 Implementar Error Boundary global
- Crear `src/components/ErrorBoundary.tsx` que capture errores de render
- Mostrar pantalla de fallback con opción de recargar
- Envolver el árbol de rutas principal en `App.tsx`

### 2.2 Sistema de notificaciones de error consistente
- El sistema ya tiene `use-toast.ts`, estandarizar su uso
- Crear una función helper `handleApiError(error, toast)` en `src/lib/utils.ts`
- Reemplazar todos los `console.error` sin toast por llamadas a este helper
- Afecta principalmente: `TicketDetail`, `WorkOrderDetail`, `AssetDetail`, `Dashboard`

### 2.3 Validación de `tenantId` nulo
- `getTenantId()` retorna string vacío si no hay tenant
- Agregar guardia en todas las llamadas de API que requieren tenantId
- Redirigir al login si no hay tenant en contexto

---

## FASE 3 — Calidad de Código y TypeScript
> Prioridad: ALTA | Duración estimada: 2-3 semanas

### 3.1 Eliminar uso de `any` en api.ts
- **Archivo:** `src/lib/api.ts` (26+ instancias)
- Definir interfaces específicas para cada respuesta de API
- Usar genéricos de Supabase correctamente: `supabase.from<MiTabla>('tabla')`
- Beneficio: Detecta errores de tipo en tiempo de compilación

### 3.2 Habilitar checks estrictos de TypeScript
- **Archivo:** `tsconfig.app.json`
- Cambiar `noUnusedLocals: false` → `true`
- Cambiar `noUnusedParameters: false` → `true`
- Limpiar todos los warnings que aparezcan

### 3.3 Eliminar importaciones y variables no usadas
Archivos afectados con cleanup requerido:
- `src/components/common/FileUploader.tsx` — parámetro `accept` sin usar
- `src/components/common/RichTextEditor.tsx` — import `Button` sin usar
- `src/components/layout/AppLayout.tsx` — `ChevronDown`, `primaryColor`
- `src/components/ui/Button.tsx` — parámetro `size` sin usar
- `src/components/ui/TagSelector.tsx` — import `useEffect`
- `src/contexts/AuthContext.tsx` — Fast refresh violation
- `src/contexts/TenantContext.tsx` — Fast refresh violation

### 3.4 Corregir Fast Refresh violations en Contexts
- Separar exports de funciones de los componentes/hooks en AuthContext y TenantContext
- Crear archivos `src/lib/auth-helpers.ts` y `src/lib/tenant-helpers.ts` para las utilidades

---

## FASE 4 — Rendimiento y Escalabilidad
> Prioridad: MEDIA | Duración estimada: 2-3 semanas

### 4.1 Paginación en listas principales
Los módulos que cargan todos los registros sin límite:
- `TicketsList` — implementar paginación con cursor o offset
- `WorkOrdersList` — ídem
- `AssetsList` — ídem
- `KnowledgeBasePage` — ídem
- Usar las capacidades nativas de Supabase: `.range(from, to)` y `.count()`

### 4.2 Optimizar queries de Analytics
- Las queries actuales pueden tener problema N+1 en departamentos con muchos usuarios
- Agrupar queries relacionadas en una sola llamada RPC de Supabase
- Agregar indexes en columnas frecuentemente filtradas: `tenant_id`, `status`, `created_at`, `assigned_to`

### 4.3 Memoización de componentes pesados
- Aplicar `React.memo` en componentes de lista que reciben arrays como props
- Usar `useMemo` para cálculos derivados en `AnalyticsPage` y `Dashboard`
- Evitar re-renders innecesarios en `AppLayout` al cambiar rutas

### 4.4 Lazy loading de rutas
- **Archivo:** `src/App.tsx`
- Implementar `React.lazy` + `Suspense` para cada página
- Reduce el bundle inicial significativamente dado que hay 70+ páginas

---

## FASE 5 — Funcionalidades Faltantes o Incompletas
> Prioridad: MEDIA | Duración estimada: 3-4 semanas

### 5.1 Completar integración de Email
- **Archivo:** `src/pages/settings/EmailIntegration.tsx`
- Hay un TODO para el botón "Test Email"
- Implementar endpoint de test en la API
- Agregar validación de configuración SMTP antes de guardar

### 5.2 Notificaciones en tiempo real
- Supabase tiene soporte nativo de Realtime (WebSockets)
- Implementar suscripciones en `TicketDetail` para comentarios nuevos
- Agregar badge de notificaciones en el header del `AppLayout`
- Notificar cuando un ticket es asignado al usuario actual

### 5.3 Sistema de permisos consistente (RBAC)
- Los checks de rol existen pero son inconsistentes entre módulos
- Crear hook `usePermissions()` centralizado que devuelva capabilities por rol
- Roles: `admin`, `owner`, `manager`, `agent`, `technician`, `developer`, `customer`
- Ocultar/deshabilitar UI según permisos, no solo verificar en acciones

### 5.4 Búsqueda global
- Actualmente cada módulo tiene búsqueda local
- Implementar búsqueda global en el header que busque en tickets, activos, KB, etc.
- Supabase soporta full-text search con `textsearch` y vectores

### 5.5 Exportación de datos
- Agregar exportación CSV/Excel en listas de tickets y órdenes de trabajo
- Útil para reportes de management

### 5.6 Historial de cambios en Tickets
- `workOrdersApi.getHistory()` está como placeholder
- Implementar tabla `ticket_history` o usar Supabase audit log
- Mostrar timeline de cambios en TicketDetail

---

## FASE 6 — Testing
> Prioridad: MEDIA | Duración estimada: 3-4 semanas

**Estado actual: 0 tests existentes**

### 6.1 Configurar Vitest
```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```
- Configurar `vitest.config.ts`
- Agregar script `test` en `package.json`
- Setup de mocks para Supabase

### 6.2 Tests unitarios — API Layer (prioridad alta)
- Testear funciones críticas de `src/lib/api.ts`
- Mockear el cliente Supabase
- Cubrir: `ticketsApi`, `workOrdersApi`, `teamsApi`, `profilesApi`
- Meta: 80% coverage en `api.ts`

### 6.3 Tests de componentes UI
- Testear componentes del design system: `Button`, `Badge`, `Input`, `Dialog`
- Testear comportamiento del `EffortInput`
- Testear `MergeTicketsModal` con mock data

### 6.4 Tests de integración para flujos críticos
- Flujo completo de creación de ticket
- Flujo de merge de tickets
- Flujo de cambio de estado con SLA

---

## FASE 7 — UX y Accesibilidad
> Prioridad: BAJA-MEDIA | Duración estimada: 2 semanas

### 7.1 Estados de carga consistentes
- Actualmente hay mezcla de spinners, skeletons y ausencia de indicadores
- Definir estándar: usar skeletons para listas, spinner para acciones
- Crear componente `<LoadingSkeleton />` reutilizable

### 7.2 Estados vacíos con contexto
- Cuando una lista está vacía, mostrar CTA apropiado
- Distinguir: "sin resultados para este filtro" vs "aún no hay registros"

### 7.3 Confirmación antes de acciones destructivas
- Borrar ticket → modal de confirmación
- Cerrar ticket con trabajo pendiente → advertencia
- Merge de tickets → resumen claro de qué se va a fusionar

### 7.4 Responsive en mobile
- Verificar que la navegación lateral sea usable en pantallas pequeñas
- Tablas de datos necesitan scroll horizontal o vista compacta en mobile

### 7.5 Accesibilidad básica (a11y)
- Agregar `aria-label` en botones de ícono
- Asegurar contraste de colores en badges de prioridad
- Keyboard navigation en modales y dropdowns

---

## FASE 8 — DevOps y Calidad Continua
> Prioridad: BAJA | Duración estimada: 1 semana

### 8.1 Remover console.log de producción
- 148 sentencias de console.log/error en el código
- Crear helper `logger.ts` que solo loguea en desarrollo
- O usar `import.meta.env.DEV` para condicionarlos

### 8.2 Variables de entorno documentadas
- Actualizar `.env.example` con todas las variables necesarias
- Documentar qué hace cada variable

### 8.3 Actualizar README.md
- El README actual es el template de Vite
- Documentar: setup local, variables de entorno, arquitectura, módulos principales

### 8.4 Pre-commit hooks
- Agregar `husky` + `lint-staged`
- ESLint y TypeScript check antes de cada commit
- Previene deuda técnica nueva

### 8.5 CI/CD básico
- Configurar GitHub Actions (si se usa GitHub)
- Correr lint + type-check + tests en cada PR

---

## Resumen de Prioridades

| Fase | Descripción | Prioridad | Impacto | Esfuerzo |
|------|-------------|-----------|---------|----------|
| 1 | Bugs críticos | URGENTE | Alto | Bajo |
| 2 | Manejo de errores | ALTA | Alto | Medio |
| 3 | Calidad TypeScript | ALTA | Medio | Medio |
| 4 | Rendimiento | MEDIA | Alto | Alto |
| 5 | Funcionalidades faltantes | MEDIA | Alto | Alto |
| 6 | Testing | MEDIA | Alto | Alto |
| 7 | UX y Accesibilidad | MEDIA | Medio | Medio |
| 8 | DevOps | BAJA | Bajo | Bajo |

---

## Orden de Ejecución Recomendado

```
Semana 1-2:   Fase 1 (Bugs) + Fase 2 (Errores)
Semana 3-4:   Fase 3 (TypeScript) + Fase 8 (DevOps básico)
Semana 5-7:   Fase 4 (Rendimiento) + Fase 5 (Funcionalidades)
Semana 8-10:  Fase 6 (Testing)
Semana 11-12: Fase 7 (UX)
```

---

## Métricas de Éxito

- **Bugs en producción**: Reducción del 80% en errores silenciosos
- **Cobertura de tests**: De 0% → 70%+ en módulos core
- **TypeScript errors**: De 26+ usos de `any` → 0
- **Tamaño de bundle**: Reducción ~30% con lazy loading
- **Tiempo de carga inicial**: < 2s en conexión 4G
- **Accesibilidad**: Score Lighthouse > 85

---

*Documento generado por auditoría de código - TicketWati v1.0 - 2026-03-21*
