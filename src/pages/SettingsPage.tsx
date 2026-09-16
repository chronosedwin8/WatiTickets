/**
 * Configuración.
 *
 * Reúne dieciocho pantallas de ajuste. Presentadas como una lista plana
 * obligaban a leerlas todas para encontrar una, así que aquí se agrupan por
 * el área de la que se ocupan, cada una con una línea que explica qué hace,
 * y con un buscador para ir directo cuando ya se sabe qué se busca.
 */
import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { cn } from '@/lib/utils'
import {
    User, Users, Building2, Palette, Shield, Bell, Globe, Sliders,
    Database, Clock, Tags, Calendar, MapPin, CalendarOff, Mail,
    KeyRound, Search, X, ChevronRight, type LucideIcon,
} from 'lucide-react'

import { Departments } from './settings/Departments'
import { S3Settings } from './settings/S3Settings'
import { ListConfigurationEditor } from '@/components/settings/ListConfigurationEditor'
import { ProfileSettings } from './settings/ProfileSettings'
import { OrganizationSettings } from './settings/OrganizationSettings'
import { TeamSettings } from './settings/TeamSettings'
import { BrandingSettings } from './settings/BrandingSettings'
import { SecuritySettings } from './settings/SecuritySettings'
import { NotificationSettings } from './settings/NotificationSettings'
import { IntegrationSettings } from './settings/IntegrationSettings'
import { PrioritySLASettings } from './settings/PrioritySLASettings'
import { TagsManagement } from './settings/TagsManagement'
import { BusinessHoursSettings } from './settings/BusinessHoursSettings'
import { LocationsSettings } from './settings/LocationsSettings'
import { AbsenceReasonsSettings } from './settings/AbsenceReasonsSettings'
import { CategoriesSettings } from './settings/CategoriesSettings'
import EmailIntegration from './settings/EmailIntegration'
import MenuPermissions from './settings/MenuPermissions'

type Rol = 'admin' | 'owner' | 'manager' | 'agent' | 'technician' | 'developer' | 'customer'

interface Ajuste {
    id: string
    nombre: string
    /** Una línea que explica de qué se ocupa. Se usa también al buscar. */
    descripcion: string
    icono: LucideIcon
    /** Roles que pueden abrirlo. Si se omite, lo ve todo el personal. */
    roles?: Rol[]
    /** Términos extra para que el buscador encuentre el ajuste. */
    busca?: string[]
}

interface Grupo {
    titulo: string
    ajustes: Ajuste[]
}

const TODOS: Rol[] = ['admin', 'owner', 'manager', 'agent', 'technician', 'developer', 'customer']
const STAFF: Rol[] = ['admin', 'owner', 'manager', 'agent', 'technician', 'developer']
const GESTION: Rol[] = ['admin', 'owner', 'manager']
const ADMIN: Rol[] = ['admin', 'owner']

const GRUPOS: Grupo[] = [
    {
        titulo: 'Mi cuenta',
        ajustes: [
            {
                id: 'profile', nombre: 'Perfil', icono: User, roles: TODOS,
                descripcion: 'Tu nombre, foto y datos de contacto.',
                busca: ['nombre', 'foto', 'avatar', 'correo'],
            },
            {
                id: 'security', nombre: 'Seguridad', icono: Shield, roles: TODOS,
                descripcion: 'Cambia tu contraseña y revisa tus sesiones.',
                busca: ['contraseña', 'clave', 'password', 'sesión'],
            },
            {
                id: 'notifications', nombre: 'Notificaciones', icono: Bell, roles: STAFF,
                descripcion: 'Qué avisos quieres recibir y por dónde.',
                busca: ['alertas', 'correo', 'avisos'],
            },
        ],
    },
    {
        titulo: 'La organización',
        ajustes: [
            {
                id: 'organization', nombre: 'Datos de la organización', icono: Building2, roles: GESTION,
                descripcion: 'Nombre, identificación y datos generales.',
                busca: ['empresa', 'institución', 'colegio', 'nit'],
            },
            {
                id: 'branding', nombre: 'Marca', icono: Palette, roles: GESTION,
                descripcion: 'Logotipo y color que verá todo el equipo.',
                busca: ['logo', 'color', 'identidad', 'imagen'],
            },
            {
                id: 'locations', nombre: 'Sedes y edificios', icono: MapPin, roles: GESTION,
                descripcion: 'Dónde están físicamente las personas y los equipos.',
                busca: ['ubicación', 'sede', 'edificio', 'piso', 'oficina'],
            },
            {
                id: 'departments', nombre: 'Departamentos', icono: Sliders, roles: GESTION,
                descripcion: 'Las áreas que atienden solicitudes.',
                busca: ['equipos', 'áreas', 'grupos'],
            },
            {
                id: 'business_hours', nombre: 'Horario laboral', icono: Calendar, roles: GESTION,
                descripcion: 'La jornada con la que se calculan los tiempos de SLA.',
                busca: ['jornada', 'horario', 'festivos', 'turnos'],
            },
        ],
    },
    {
        titulo: 'Mesa de ayuda',
        ajustes: [
            {
                id: 'sla', nombre: 'Políticas de SLA', icono: Clock, roles: ADMIN,
                descripcion: 'Cuánto puede tardar la atención según la prioridad.',
                busca: ['tiempos', 'compromiso', 'respuesta', 'resolución'],
            },
            {
                id: 'categories', nombre: 'Categorías', icono: Tags, roles: GESTION,
                descripcion: 'Cómo se clasifican los tickets que llegan.',
                busca: ['clasificación', 'tipos'],
            },
            {
                id: 'tags', nombre: 'Etiquetas', icono: Tags, roles: GESTION,
                descripcion: 'Marcas libres para agrupar tickets entre sí.',
                busca: ['tags', 'marcas'],
            },
            {
                id: 'configuration', nombre: 'Listas y tipos', icono: Database, roles: GESTION,
                descripcion: 'Las opciones desplegables del sistema: prioridades, estados y tipos.',
                busca: ['prioridades', 'estados', 'desplegables', 'opciones'],
            },
            {
                id: 'absences', nombre: 'Motivos de ausencia', icono: CalendarOff, roles: ADMIN,
                descripcion: 'Permisos, incapacidades y demás motivos que se pueden solicitar.',
                busca: ['permisos', 'vacaciones', 'incapacidad'],
            },
        ],
    },
    {
        titulo: 'Personas y permisos',
        ajustes: [
            {
                id: 'members', nombre: 'Equipo', icono: Users, roles: GESTION,
                descripcion: 'Da de alta personas, asigna su rol y su departamento.',
                busca: ['usuarios', 'personas', 'miembros', 'roles', 'alta'],
            },
            {
                id: 'menu_permissions', nombre: 'Permisos de menú', icono: KeyRound, roles: ADMIN,
                descripcion: 'Qué secciones ve cada rol al entrar.',
                busca: ['accesos', 'visibilidad', 'roles', 'menú'],
            },
        ],
    },
    {
        titulo: 'Sistema',
        ajustes: [
            {
                id: 'email', nombre: 'Correo', icono: Mail, roles: ADMIN,
                descripcion: 'Estado del envío de notificaciones y firma de los mensajes.',
                busca: ['smtp', 'email', 'notificaciones', 'envío'],
            },
            {
                id: 'storage', nombre: 'Almacenamiento', icono: Database, roles: ADMIN,
                descripcion: 'Dónde se guardan los archivos adjuntos.',
                busca: ['archivos', 'adjuntos', 's3', 'disco'],
            },
            {
                id: 'integrations', nombre: 'Integraciones', icono: Globe, roles: ADMIN,
                descripcion: 'Conexiones con otros sistemas.',
                busca: ['api', 'webhooks', 'conexiones'],
            },
        ],
    },
]

export function SettingsPage() {
    const { profile } = useAuth()
    const { tenant, primaryColor } = useTenant()
    const [activo, setActivo] = useState('profile')
    const [busqueda, setBusqueda] = useState('')

    const rol = (profile?.role ?? 'customer') as Rol

    /** Sólo los ajustes que el rol puede abrir, filtrados por la búsqueda. */
    const gruposVisibles = useMemo(() => {
        const termino = busqueda.trim().toLowerCase()

        return GRUPOS
            .map((g) => ({
                ...g,
                ajustes: g.ajustes.filter((a) => {
                    const permitido = (a.roles ?? STAFF).includes(rol)
                    if (!permitido) return false
                    if (termino.length < 2) return true

                    const texto = [a.nombre, a.descripcion, ...(a.busca ?? [])]
                        .join(' ')
                        .toLowerCase()
                    return texto.includes(termino)
                }),
            }))
            .filter((g) => g.ajustes.length > 0)
    }, [rol, busqueda])

    const todosVisibles = useMemo(
        () => gruposVisibles.flatMap((g) => g.ajustes),
        [gruposVisibles]
    )

    // Si la búsqueda deja fuera el ajuste abierto, se muestra el primero que quede.
    const ajusteActivo =
        todosVisibles.find((a) => a.id === activo) ?? todosVisibles[0]

    const buscando = busqueda.trim().length >= 2

    return (
        <div className="space-y-6">
            {/* ── Encabezado ─────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configuración</h1>
                <p className="mt-1 text-slate-500">
                    Ajusta la plataforma a cómo trabaja tu organización.
                </p>
            </div>

            <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:items-start">
                {/* ── Navegación ─────────────────────────── */}
                <aside className="mb-6 lg:mb-0 lg:sticky lg:top-6">
                    <div className="relative mb-4">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar un ajuste…"
                            aria-label="Buscar un ajuste"
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                aria-label="Limpiar búsqueda"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {gruposVisibles.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                            Ningún ajuste coincide con «{busqueda}».
                        </p>
                    ) : (
                        <nav className="space-y-5" aria-label="Secciones de configuración">
                            {gruposVisibles.map((grupo) => (
                                <div key={grupo.titulo}>
                                    <h2 className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        {grupo.titulo}
                                    </h2>
                                    <ul className="space-y-0.5">
                                        {grupo.ajustes.map((ajuste) => {
                                            const esActivo = ajusteActivo?.id === ajuste.id
                                            const Icono = ajuste.icono
                                            return (
                                                <li key={ajuste.id}>
                                                    <button
                                                        onClick={() => setActivo(ajuste.id)}
                                                        aria-current={esActivo ? 'page' : undefined}
                                                        className={cn(
                                                            'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition',
                                                            esActivo
                                                                ? 'bg-indigo-50 font-semibold text-indigo-700'
                                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                        )}
                                                    >
                                                        <Icono
                                                            size={17}
                                                            className={cn(
                                                                'shrink-0 transition',
                                                                esActivo ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                                                            )}
                                                        />
                                                        <span className="min-w-0 flex-1 truncate">{ajuste.nombre}</span>
                                                        {esActivo && <ChevronRight size={15} className="shrink-0 text-indigo-400" />}
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </nav>
                    )}
                </aside>

                {/* ── Contenido ──────────────────────────── */}
                <main className="min-w-0">
                    {ajusteActivo && (
                        <>
                            {/* Encabezado del ajuste: dice qué hace antes de entrar en él */}
                            <div className="mb-5 flex items-start gap-3 border-b border-slate-200 pb-5">
                                <div className="rounded-lg bg-indigo-50 p-2.5">
                                    <ajusteActivo.icono className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-semibold text-slate-900">{ajusteActivo.nombre}</h2>
                                    <p className="mt-0.5 text-sm text-slate-500">{ajusteActivo.descripcion}</p>
                                </div>
                            </div>

                            <div className="min-w-0">
                                <Contenido
                                    id={ajusteActivo.id}
                                    tenant={tenant}
                                    tenantId={tenant?.id}
                                    primaryColor={primaryColor}
                                />
                            </div>
                        </>
                    )}

                    {buscando && todosVisibles.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
                            <Search className="mx-auto h-7 w-7 text-slate-300" />
                            <p className="mt-3 font-medium text-slate-900">Sin resultados</p>
                            <p className="mt-1 text-sm text-slate-500">
                                Prueba con «contraseña», «departamentos» o «correo».
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}

/** Muestra el panel correspondiente al ajuste elegido. */
function Contenido({
    id, tenant, tenantId, primaryColor,
}: {
    id: string
    tenant: any
    tenantId?: string
    primaryColor: string
}) {
    switch (id) {
        // Mi cuenta
        case 'profile': return <ProfileSettings primaryColor={primaryColor} />
        case 'security': return <SecuritySettings />
        case 'notifications': return <NotificationSettings />

        // La organización
        case 'organization': return <OrganizationSettings tenant={tenant} />
        case 'branding': return <BrandingSettings primaryColor={primaryColor} />
        case 'locations':
            return tenantId ? <LocationsSettings tenantId={tenantId} primaryColor={primaryColor} /> : null
        case 'departments': return <Departments tenant={tenant} primaryColor={primaryColor} />
        case 'business_hours': return <BusinessHoursSettings />

        // Mesa de ayuda
        case 'sla': return tenantId ? <PrioritySLASettings tenantId={tenantId} /> : null
        case 'categories':
            return tenantId ? <CategoriesSettings tenantId={tenantId} primaryColor={primaryColor} /> : null
        case 'tags': return tenantId ? <TagsManagement tenantId={tenantId} /> : null
        case 'configuration': return <ListConfigurationEditor tenant={tenant} primaryColor={primaryColor} />
        case 'absences': return <AbsenceReasonsSettings />

        // Personas y permisos
        case 'members': return <TeamSettings tenant={tenant} primaryColor={primaryColor} />
        case 'menu_permissions': return <MenuPermissions />

        // Sistema
        case 'email': return <EmailIntegration />
        case 'storage': return <S3Settings />
        case 'integrations': return <IntegrationSettings />

        default: return null
    }
}

export default SettingsPage
