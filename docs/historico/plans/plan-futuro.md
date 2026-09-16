# 🚀 Plan de Transformación: TicketWati a Help Desk ITSM Enterprise

Este documento detalla la hoja de ruta para evolucionar el proyecto actual **TicketWati** hacia una solución integral de gestión de servicios de TI (ITSM), siguiendo las mejores prácticas de marcos como ITIL 4.

---

## 📅 Resumen de Fases y Cronograma Estimado

| Fase | Título | Enfoque Principal | Duración Est. |
| :--- | :--- | :--- | :--- |
| **Fase 0** | **Estabilización y Seguridad** | Deuda técnica, Credenciales, Refactorización. | 1-2 Semanas |
| **Fase 1** | **Core ITSM (Incidentes y Problemas)** | Gestión reactiva y proactiva de interrupciones. | 3-4 Semanas |
| **Fase 2** | **Operaciones y Activos (Cambios y CMDB)** | Gestión de cambios y base de datos de activos. | 4-5 Semanas |
| **Fase 3** | **Experiencia de Usuario (Portal y Catálogo)** | Autoservicio y Reducción de carga agentes. | 3-4 Semanas |
| **Fase 4** | **Automatización e Inteligencia (Workflow & AI)** | Eficiencia operativa y asistencia inteligente. | 5-6 Semanas |
| **Fase 5** | **Expansión Empresarial (ESM, ITOM, MDM)** | Integración total de la infraestructura. | Continuo |

---

## 🔍 Auditoría del Estado Actual (Baseline)

### Fortalezas Detectadas
- **Multi-tenant robusto:** Aislamiento de datos nativo por `tenant_id`.
- **Tipado completo:** Uso avanzado de TypeScript y Supabase.
- **Entidades Base:** Ya existen tablas para `tickets`, `assets`, `work_orders`, `kb_articles` y `projects`.
- **Sistema de Roles:** `admin`, `agent`, `technician`, `customer` ya definidos.

### Gaps Técnicos
- **Workflows:** El sistema es CRUD puro; carece de un motor de reglas o estados condicionales.
- **Seguridad:** Credenciales expuestas (necesita `.env`).
- **Escalabilidad de Código:** Páginas excesivamente grandes (+1000 líneas).
- **Manejo de Errores:** Inexistencia de un `Error Boundary` centralizado.

---

## 🛠️ Detalle de Módulos a Implementar

### 1. Módulos Operativos Principales (Core ITSM)

#### **Gestión de Incidentes (Incident Management)**
- **Estado Actual:** Parcial (Tickets básicos).
- **Mejoras:** 
  - **Detección Automática:** Integración con monitoreo (IoT/API).
  - **Matriz de Priorización:** Cálculo automático de prioridad basado en Impacto x Urgencia.
  - **Plantillas de Incidente:** Pre-llenado de tickets comunes.

#### **Gestión de Problemas (Problem Management)**
- **Función:** Identificar causas raíz de incidentes recurrentes.
- **Componentes:**
  - Nueva entidad `problems`.
  - Relación 1:N con `tickets`.
  - Registro de "Error Conocido" (integrado con KB).

#### **Gestión de Cambios (Change Management)**
- **Función:** Ciclo de vida controlado de cambios en TI.
- **Componentes:**
  - **RFC (Request for Change):** Formularios de riesgo y plan de roll-back.
  - **CAB (Change Advisory Board):** Flujo de aprobaciones multi-nivel.
  - **Calendario de Cambios:** Visualización de "ventanas de mantenimiento".

#### **Catálogo de Servicios y Solicitudes**
- **Función:** Menú de servicios (ej. "Nueva Laptop", "Acceso a VPN").
- **Componentes:**
  - `service_items`: Definición de productos/servicios.
  - **Flujos de Aprobación:** Automatización basada en el costo o tipo de solicitud.

#### **ITAM y CMDB (Configuración)**
- **Mejoras en Assets:**
  - **Relaciones CMDB:** Mapeo de dependencias (ej: Servidor X -> soporta -> App Ventas).
  - **Ciclo de Vida:** Tracking desde adquisición hasta disposición final.

---

### 2. Módulos de Experiencia del Usuario

#### **Portal de Autoservicio (Self-Service Portal)**
- **Interfaz:** Dashboard simplificado exclusivo para `role: 'customer'`.
- **Funciones:**
  - Seguimiento visual de estado (ProgressBar).
  - Búsqueda global en Knowledge Base.
  - Creación de tickets guiada (Wizard).

#### **Gestión del Conocimiento (Knowledge Base)**
- **Mejoras:**
  - **Deflexión de Tickets:** Sugerencia de artículos mientras el usuario escribe su incidencia.
  - **Feedback Loop:** Calificación de utilidad de artículos.

---

### 3. Automatización y Análisis

#### **Automatización de Flujos de Trabajo (Workflow Engine)**
- **Lógica:** Implementar un motor basado en "Disparador -> Condición -> Acción".
- **Ejemplos:**
  - *Si* ticket priority es 'critical' *Entonces* notificar vía WhatsApp/Slack al Director.
  - *Si* ticket no tiene respuesta en 2h *Entonces* reasignar a Supervisor.

#### **Gestión de Niveles de Servicio (SLA)**
- **Funciones:**
  - Pausa de SLA cuando el ticket espera por el cliente.
  - Alertas preventivas (80% del tiempo consumido).

---

### 4. Módulos Avanzados y Especializados

#### **Inteligencia Artificial (AI/Bots)**
- **Clasificación Automática:** Uso de modelos de lenguaje para etiquetar tickets y asignar categorías.
- **Chatbot:** Primer nivel de soporte 24/7 integrado con la KB.

#### **Gestión de Servicios Empresariales (ESM)**
- **Alcance:** Creación de instancias separadas para RRHH, Legal y Mantenimiento dentro del mismo tenant.
- **Remisión Inter-departamental:** Pasar un ticket de TI a Mantenimiento sin perder la trazabilidad.

#### **Gestión de Proyectos (PPM)**
- **Integración:** Convertir tickets complejos directamente en `projects` o `epics` en el módulo de Desarrollo.

---

## 📂 Plan de Trabajo Detallado (Pasos a seguir)

### **Semana 1-2: Cimentación**
1. **[Seguridad]** Migrar todas las credenciales a `.env` y rotar keys.
2. **[Refactor]** Dividir `TicketsPage.tsx` y `WorkOrdersPage.tsx` en componentes más pequeños.
3. **[Types]** Expandir `Database` en `src/types/database.ts` para incluir `problems`, `changes`, `service_catalog`.

### **Semana 3-5: Implementación Core ITSM**
1. **[Backend]** Crear migraciones de Supabase para las nuevas tablas de Problemas y Cambios.
2. **[UI]** Crear formularios de Gestión de Cambios con lógica de aprobación.
3. **[Service Catalog]** Diseñar el escaparate de servicios para el usuario final.

### **Semana 6-8: Portal y Automatización**
1. **[Frontend]** Desarrollar la vista de Portal de Autoservicio.
2. **[Logic]** Implementar el motor de reglas básico en el frontend (y triggers de base de datos).
3. **[Knowledge Base]** Implementar motor de búsqueda semántica (integrado con AI).

---

## 📈 Métricas de Éxito (KPIs)
- **MTTR (Mean Time To Repair):** Reducción esperada del 20% tras Fase 1.
- **Tasa de Deflexión:** Lograr que el 15% de los usuarios resuelvan sus dudas vía Portal/KB.
- **Cumplimiento de SLA:** Mantenerse por encima del 95% mediante automatización.

---

> [!NOTE]
> Este plan es dinámico y debe ser revisado al finalizar cada fase para ajustar las prioridades según el feedback de los usuarios finales de cada departamento.
