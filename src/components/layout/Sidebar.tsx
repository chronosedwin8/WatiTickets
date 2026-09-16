import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { menuPermissionsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Ticket,
    Settings,
    BookOpen,
    Server,
    Hammer,
    BarChart3,
    X,
    LifeBuoy,
    Users,
    AlertTriangle,
    GitMerge,
    ShoppingBag,
    Mail,
    Calendar,
    Layers,
    CalendarOff,
    PieChart
} from 'lucide-react'

interface NavItem {
    id: string
    name: string
    href: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    adminOnly?: boolean
}

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
    { id: 'email-integration', name: 'Integración Email', href: '/settings/email-integration', icon: Mail, adminOnly: true },
    { id: 'absences', name: 'Gestión de Ausencias', href: '/absences', icon: CalendarOff, adminOnly: true },
    { id: 'absences-dashboard', name: 'Dashboard Ausencias', href: '/absences/dashboard', icon: PieChart, adminOnly: true },
    { id: 'settings', name: 'Configuración', href: '/settings', icon: Settings },
]

interface SidebarProps {
    open: boolean
    onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
    const { profile, isLoading } = useAuth()
    const { tenant } = useTenant()
    const location = useLocation()
    const [menuPermissions, setMenuPermissions] = useState<Record<string, boolean>>({})
    const [permissionsLoaded, setPermissionsLoaded] = useState(false)

    useEffect(() => {
        async function loadMenuPermissions() {
            if (!profile || !tenant) return
            try {
                const data = await menuPermissionsApi.getForRole(profile.role)
                const permissionsMap: Record<string, boolean> = {}
                data.forEach(p => { permissionsMap[p.menu_item] = p.is_visible })
                setMenuPermissions(permissionsMap)
            } catch (error) {
                if (import.meta.env.DEV) console.error('Error cargando permisos de menú', error)
            } finally {
                setPermissionsLoaded(true)
            }
        }
        loadMenuPermissions()
    }, [profile, tenant])

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-50 w-[16.25rem] bg-white shadow-[0_0_15px_0_rgba(34,41,47,0.05)] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col shrink-0 lg:shadow-none bg-inherit print:hidden",
                open ? "translate-x-0 shadow-xl bg-white" : "-translate-x-full"
            )}
        >
            <div className="h-[5.5rem] flex items-center px-6 shrink-0 gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-600/20">T</div>
                <div className="flex flex-col justify-center overflow-hidden">
                    <span className="font-bold text-xl tracking-tight text-[var(--slate-700)] truncate">TicketWati</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Enterprise</span>
                </div>
                <button onClick={onClose} className="ml-auto lg:hidden text-slate-400"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
                {isLoading ? (
                    <div className="space-y-2 animate-pulse">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg mx-2"></div>)}
                    </div>
                ) : (
                    navigation.filter(item => {
                        if (!profile) return false
                        if (permissionsLoaded && Object.keys(menuPermissions).length > 0) {
                            return menuPermissions[item.id] !== undefined ? menuPermissions[item.id] : true
                        }
                        if (item.adminOnly && profile.role !== 'admin') return false
                        if (profile.role === 'customer') {
                            return ['Tickets', 'Base de Conocimiento', 'Configuración'].includes(item.name)
                        }
                        if (item.name === 'Usuarios' && profile.role !== 'admin' && profile.role !== 'manager') return false
                        return true
                    }).map((item) => {
                        const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-[0.9375rem] transition-all duration-200 group",
                                    isActive
                                        ? "text-primary-500 bg-primary-100 font-semibold shadow-[0_2px_6px_0_rgba(105,108,255,0.3)]"
                                        : "text-[var(--slate-600)] hover:bg-[var(--slate-100)]"
                                )}
                            >
                                <item.icon size={22} className={cn("transition-colors", isActive ? "text-primary-500" : "text-[var(--slate-500)] group-hover:text-[var(--slate-700)]")} />
                                <span className="truncate">{item.name}</span>
                            </Link>
                        )
                    })
                )}
            </div>
        </aside>
    )
}
