# Especificación: Módulo de Planificación de Actividades (Activity Planner)

## Objetivo
Implementar una herramienta que permita a Administradores y Gerentes programar, visualizar y asignar tareas recurrentes y únicas a lo largo del año. El objetivo principal es organizar cronogramas de mantenimiento preventivo y otras actividades operativas.

## Características Clave

### 1. Gestión de Planes Recurrentes (Templates)
- **Definición de Actividad**: Título, descripción, prioridad (Baja, Media, Alta, Crítica).
- **Recurrencia Flexible**:
  - Diaria, Semanal, Mensual, Anual.
  - Personalizada (ej. "Cada 3 meses", "El primer lunes de mes").
- **Asignación**:
  - Asignar a uno o múltiples colaboradores (tabla `team_members`).
  - Definir duración estimada (en horas/días).
- **Duración del Plan**: Fecha inicio y fin (ej. "Todo el año 2024").

### 2. Generación de Instancias (Actividades Reales)
- El sistema generará automáticamente las instancias individuales (ej. "Mantenimiento Aire Acondicionado - Marzo") basadas en la regla de recurrencia.
- Cada instancia podrá ser editada individualmente (cambiar fecha, reasignar) sin afectar la regla general si es necesario.
- **Estados de Actividad**: Pendiente, En Progreso, Completada, Vencida/Retrasada.

### 3. Vistas de Calendario (UI "Elegante")
- **Vista Anual**: Mapa de calor o grid compacto para ver la distribución anual de carga.
- **Vista Mensual**: Calendario clásico con indicadores de estado/prioridad.
- **Vista Agenda**: Lista cronológica de próximas actividades (ideal para reportes).
- **Filtros**: Por colaborador, por prioridad, por estado.

### 4. Reportes y Notificaciones
- **Reporte PDF/Excel**: Generar listado de actividades para un rango de fechas (ej. "Actividades de esta semana").
- **Envío por Email**:
  - Enviar el cronograma completo o parcial a los colaboradores.
  - Usar plantillas HTML limpias (vía Amazon SES).
- **Notificaciones In-App**: Alertas cuando se asigna una actividad nueva.

## Estructura de Datos Propuesta

### Tabla: `maintenance_plans`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK |
| title | text | Nombre del plan (ej. "Mantenimiento Aires") |
| description | text | Detalles generales |
| frequency | text | daily, weekly, monthly, yearly |
| interval | int | Cada X unidades (ej. 3 meses) |
| start_date | date | Inicio de la recurrencia |
| end_date | date | Fin de la recurrencia |
| priority | text | low, medium, high, critical |
| created_by | uuid | FK a usuario creador |

### Tabla: `maintenance_activities` (Instancias)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| plan_id | uuid | FK a maintenance_plans (opcional, para agrupar) |
| title | text | Título específico |
| scheduled_date | date | Fecha programada |
| due_date | date | Fecha límite |
| status | text | pending, in_progress, completed, cancelled |
| assignees | jsonb | Array de IDs de usuarios asignados |
| completed_at | timestamp | Fecha real de finalización |
| completed_by | uuid | Usuario que completó |

## Flujo de Trabajo Propuesto

1. **Creación**: El Admin entra a "Planificación", crea un "Nuevo Plan Anual", define "Mantenimiento Aires" cada 3 meses.
2. **Generación**: El sistema calcula las fechas (Enero 15, Abril 15, Julio 15, Octubre 15) y crea 4 registros en `maintenance_activities`.
3. **Visualización**: En el Calendario Anual, se ven los 4 hitos.
4. **Ejecución**:
   - Llega Abril. El colaborador recibe notificación.
   - Entra a la app, ve su "Agenda del Mes".
   - Marca la actividad como "En Progreso" y luego "Completada".
   - Admin ve el cambio de estado en tiempo real.
5. **Reporte**: A fin de año, Admin saca un reporte de "Cumplimiento de Mantenimiento".

## Tecnologías
- **Frontend**: React, Tailwind CSS (para el calendario custom/elegante).
- **Base de Datos**: Supabase (PostgreSQL).
- **Email**: Amazon SES (existente).
- **Librerías**: `date-fns` para manejo de fechas, `jspdf` para reportes PDF.
