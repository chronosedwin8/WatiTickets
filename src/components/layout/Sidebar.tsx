/**
 * Menú lateral.
 *
 * Las dieciocho secciones estaban en una lista plana: encontrar una exigía
 * recorrerlas todas. Aquí se agrupan por el trabajo que resuelven, con un
 * indicador que sigue a la sección activa.
 */
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { menuPermissionsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard, Ticket, Settings, BookOpen, Server, Hammer, BarChart3,
    X, LifeBuoy, Users, AlertTriangle, GitMerge, ShoppingBag, Calendar,
    Layers, CalendarOff, PieChart, type LucideIcon,
} from 'lucide-react'

interface NavItem {
    id: string
    name: string
    href: string
    icon: LucideIcon
    adminOnly?: boolean
}

interface Seccion {
    titulo: string
    items: NavItem[]
}

/**
 * Se mantiene la lista plana exportada porque la pantalla de permisos de
 * menú la usa para construir su matriz.
 */
export const navigation: NavItem[] = [
    { id: 'dashboard', name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { id: 'tickets', name: 'Tickets', href: '/tickets', icon: Ticket },
    { id: 'problems', name: 'Problemas', href: '/problems', icon: AlertTriangle },
    { id: 'changes', name: 'Cambios', href: '/changes', icon: GitMerge },
    { id: 'service-catalog', name: 'Catálogo de Servicios', href: '/service-catalog', icon: ShoppingBag },
    { id: 'assets', name: 'Activos', href: '/assets', icon: Server },
    { id: 'asset-groups', name: 'Grupos de Activos', href: '/assets/groups', icon: Layers },
    { id: 'work-orders', name: 'Órdenes de Trabajo', href: '/work-orders', icon: Hammer },
    { id: 'development', name: 'Desarrollo', href: '/development', icon: BookOpen },
    { id: 'analytics', name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { id: 'planner', name: 'Planificador', href: '/planner', icon: Calendar },
    { id: 'users', name: 'Usuarios', href: '/users', icon: Users },
    { id: 'knowledge-base', name: 'Base de Conocimiento', href: '/knowledge-base', icon: LifeBuoy },
    { id: 'absences', name: 'Gestión de Ausencias', href: '/absences', icon: CalendarOff, adminOnly: true },
    { id: 'absences-dashboard', name: 'Dashboard Ausencias', href: '/absences/dashboard', icon: PieChart, adminOnly: true },
    { id: 'settings', name: 'Configuración', href: '/settings', icon: Settings },
]

const porId = new Map(navigation.map((n) => [n.id, n]))
const item = (id: string) => porId.get(id)!

const SECCIONES: Seccion[] = [
    {
        titulo: 'Atención',
        items: [item('dashboard'), item('tickets'), item('problems'), item('changes'), item('service-catalog')],
    },
    {
        titulo: 'Infraestructura',
        items: [item('assets'), item('asset-groups'), item('work-orders'), item('planner')],
    },
    {
        titulo: 'Conocimiento',
        items: [item('knowledge-base'), item('development'), item('analytics')],
    },
    {
        titulo: 'Personas',
        items: [item('users'), item('absences'), item('absences-dashboard')],
    },
    {
        titulo: 'Sistema',
        items: [item('settings')],
    },
]

interface SidebarProps {
    open: boolean
    onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
    const { profile, isLoading } = useAuth()
    const { tenant } = useTenant()
    const location = useLocation()
    const [permisos, setPermisos] = useState<Record<string, boolean>>({})
    const [permisosCargados, setPermisosCargados] = useState(false)

    useEffect(() => {
        async function cargar() {
            if (!profile || !tenant) return
            try {
                const datos = await menuPermissionsApi.getForRole(profile.role)
                const mapa: Record<string, boolean> = {}
                datos.forEach((p) => { mapa[p.menu_item] = p.is_visible })
                setPermisos(mapa)
            } catch (error) {
                if (import.meta.env.DEV) console.error('Error cargando permisos de menú', error)
            } finally {
                setPermisosCargados(true)
            }
        }
        cargar()
    }, [profile, tenant])

    /** Decide si una sección del menú es visible para quien ha entrado. */
    const visible = (nav: NavItem): boolean => {
        if (!profile) return false

        if (permisosCargados && Object.keys(permisos).length > 0) {
            return permisos[nav.id] !== undefined ? permisos[nav.id] : true
        }

        if (nav.adminOnly && profile.role !== 'admin') return false
        if (profile.role === 'customer') {
            return ['tickets', 'knowledge-base', 'settings'].includes(nav.id)
        }
        if (nav.id === 'users' && !['admin', 'manager'].includes(profile.role)) return false
        return true
    }

    const esActivo = (href: string) =>
        location.pathname === href || (href !== '/' && location.pathname.startsWith(href))

    const seccionesVisibles = SECCIONES
        .map((s) => ({ ...s, items: s.items.filter(visible) }))
        .filter((s) => s.items.length > 0)

    return (
        <>
            {/* Velo en móvil */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-[17rem] shrink-0 flex-col',
                    'border-r border-[var(--borde)] bg-[var(--superficie)]',
                    'transition-transform duration-300 ease-out',
                    'lg:static lg:translate-x-0 print:hidden',
                    open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                )}
            >
                {/* ── Marca ───────────────────────────────── */}
                <div className="flex h-[5.25rem] shrink-0 items-center gap-3 px-5">
                    <div
                        className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white shadow-lg"
                        style={{
                            backgroundImage: 'linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500))',
                            boxShadow: '0 8px 20px rgba(124,77,255,.35)',
                        }}
                    >
                        T
                    </div>
                    <div className="flex min-w-0 flex-col justify-center">
                        <span className="truncate font-display text-xl font-bold tracking-tight text-slate-900">
                            TicketWati
                        </span>
                        <span className="truncate text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">
                            {tenant?.name ?? 'Mesa de ayuda'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar menú"
                        className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Navegación ──────────────────────────── */}
                <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6" aria-label="Principal">
                    {isLoading ? (
                        <div className="space-y-2 px-2">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="esqueleto h-9" />
                            ))}
                        </div>
                    ) : (
                        seccionesVisibles.map((seccion) => (
                            <div key={seccion.titulo}>
                                <h2 className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">
                                    {seccion.titulo}
                                </h2>
                                <ul className="space-y-0.5">
                                    {seccion.items.map((nav) => {
                                        const activo = esActivo(nav.href)
                                        const Icono = nav.icon
                                        return (
                                            <li key={nav.id}>
                                                <Link
                                                    to={nav.href}
                                                    onClick={onClose}
                                                    aria-current={activo ? 'page' : undefined}
                                                    className={cn(
                                                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
                                                        'text-[0.9rem] transition-all duration-200',
                                                        activo
                                                            ? 'font-semibold text-white shadow-lg'
                                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                    )}
                                                    style={activo ? {
                                                        backgroundImage:
                                                            'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
                                                        boxShadow: '0 8px 20px rgba(124,77,255,.32)',
                                                    } : undefined}
                                                >
                                                    <Icono
                                                        size={19}
                                                        className={cn(
                                                            'shrink-0 transition-transform duration-200',
                                                            activo
                                                                ? 'text-white'
                                                                : 'text-slate-400 group-hover:scale-110 group-hover:text-slate-700'
                                                        )}
                                                    />
                                                    <span className="truncate">{nav.name}</span>
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        ))
                    )}
                </nav>

                {/* ── Pie ─────────────────────────────────── */}
                <div className="shrink-0 border-t border-[var(--borde)] px-5 py-3">
                    <p className="text-[11px] text-slate-400">
                        {profile?.full_name ?? 'Sesión activa'}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        {profile?.role ?? ''}
                    </p>
                </div>
            </aside>
        </>
    )
}
