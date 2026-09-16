import { useState, useEffect } from 'react';
import { Shield, Save, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { menuPermissionsApi, http } from '@/lib/api';
import { useTenant } from '../../contexts/TenantContext';

// Lista de todos los items del menú disponibles
const MENU_ITEMS = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'tickets', name: 'Tickets', icon: '🎫' },
    { id: 'problems', name: 'Problemas', icon: '⚠️' },
    { id: 'changes', name: 'Cambios', icon: '🔄' },
    { id: 'service-catalog', name: 'Catálogo de Servicios', icon: '🛒' },
    { id: 'assets', name: 'Activos', icon: '💻' },
    { id: 'work-orders', name: 'Órdenes de Trabajo', icon: '🔨' },
    { id: 'development', name: 'Desarrollo', icon: '📚' },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
    { id: 'planner', name: 'Planificador', icon: '📅' },
    { id: 'users', name: 'Usuarios', icon: '👥' },
    { id: 'knowledge-base', name: 'Base de Conocimiento', icon: '💡' },
    { id: 'email-integration', name: 'Integración Email', icon: '📧' },
    { id: 'settings', name: 'Configuración', icon: '⚙️' },
];

const ROLES = [
    { id: 'admin', name: 'Administrador', color: 'bg-purple-100 text-purple-700' },
    { id: 'manager', name: 'Manager', color: 'bg-blue-100 text-blue-700' },
    { id: 'agent', name: 'Agente', color: 'bg-green-100 text-green-700' },
    { id: 'technician', name: 'Técnico', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'customer', name: 'Cliente', color: 'bg-slate-100 text-slate-700' },
];

interface Permission {
    role: string;
    menu_item: string;
    is_visible: boolean;
}

export default function MenuPermissions() {
    const { tenant } = useTenant();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadPermissions();
    }, [tenant]);

    async function loadPermissions() {
        if (!tenant) return;

        try {
            const data = await menuPermissionsApi.getAll();

            // Si no hay permisos, crear la matriz por defecto
            if (!data || data.length === 0) {
                setPermissions(createDefaultPermissions());
            } else {
                // Fusionar datos existentes con los defaults
                // Esto asegura que si agregamos nuevos items al menú (como Planificador),
                // aparezcan con sus defaults correctos en lugar de deshabilitados
                const defaults = createDefaultPermissions();

                // Mapa para búsqueda rápida: "role-item" -> is_visible
                const existingMap = new Map(
                    data.map(p => [`${p.role}-${p.menu_item}`, p.is_visible])
                );

                const mergedPermissions = defaults.map(def => {
                    const key = `${def.role}-${def.menu_item}`;
                    return {
                        ...def,
                        // Si existe en DB, usar valor DB. Si no, usar default.
                        is_visible: existingMap.has(key) ? existingMap.get(key)! : def.is_visible
                    };
                });

                setPermissions(mergedPermissions);
            }
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading permissions:', error);
            setMessage({ type: 'error', text: 'Error al cargar permisos' });
        } finally {
            setLoading(false);
        }
    }

    function createDefaultPermissions(): Permission[] {
        const defaults: Permission[] = [];

        ROLES.forEach(role => {
            MENU_ITEMS.forEach(item => {
                // Lógica de defaults
                let isVisible = true;

                // Clientes solo ven Tickets, Base de Conocimiento y Configuración
                if (role.id === 'customer') {
                    isVisible = ['tickets', 'knowledge-base', 'settings'].includes(item.id);
                }

                // Email integration solo para admins
                if (item.id === 'email-integration' && role.id !== 'admin') {
                    isVisible = false;
                }

                // Usuarios solo para admin y manager
                if (item.id === 'users' && !['admin', 'manager'].includes(role.id)) {
                    isVisible = false;
                }

                // Analytics solo para admin y manager
                if (item.id === 'analytics' && !['admin', 'manager'].includes(role.id)) {
                    isVisible = false;
                }

                // Planificador para todos menos clientes (y quizás restringido por rol en la página misma)
                if (item.id === 'planner' && role.id === 'customer') {
                    isVisible = false;
                }

                defaults.push({
                    role: role.id,
                    menu_item: item.id,
                    is_visible: isVisible
                });
            });
        });

        return defaults;
    }

    function togglePermission(role: string, menuItem: string) {
        setPermissions(prev => {
            const existing = prev.find(p => p.role === role && p.menu_item === menuItem);

            if (existing) {
                return prev.map(p =>
                    p.role === role && p.menu_item === menuItem
                        ? { ...p, is_visible: !p.is_visible }
                        : p
                );
            } else {
                return [...prev, { role, menu_item: menuItem, is_visible: true }];
            }
        });
    }

    function isItemVisible(role: string, menuItem: string): boolean {
        const permission = permissions.find(p => p.role === role && p.menu_item === menuItem);
        return permission ? permission.is_visible : false;
    }

    async function handleSave() {
        if (!tenant) return;

        setSaving(true);
        setMessage(null);

        try {
            // El servidor reemplaza la matriz completa en una sola operación,
            // de modo que nunca queda un estado intermedio a medio guardar.
            await http.put('/configuracion/permisos-menu', {
                permisos: permissions.map(p => ({
                    role: p.role,
                    menu_item: p.menu_item,
                    is_visible: p.is_visible,
                })),
            });

            setMessage({ type: 'success', text: '✓ Permisos guardados exitosamente. Los usuarios verán los cambios al recargar.' });
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error saving permissions:', error);
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Error al guardar permisos',
            });
        } finally {
            setSaving(false);
        }
    }

    function handleReset() {
        setPermissions(createDefaultPermissions());
        setMessage({ type: 'success', text: 'Permisos restaurados a valores por defecto. Recuerda guardar los cambios.' });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Cargando permisos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="h-8 w-8 text-indigo-600" />
                        Permisos del Menú
                    </h1>
                    <p className="text-slate-600 mt-2">
                        Personaliza qué elementos del menú lateral ve cada rol de usuario
                    </p>
                </div>
            </div>

            {/* Message Alert */}
            {message && (
                <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                            {message.text}
                        </p>
                    </div>
                </div>
            )}

            {/* Permissions Matrix */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-4 px-6 font-semibold text-slate-700 min-w-[200px] sticky left-0 bg-slate-50 z-10">
                                    Elemento del Menú
                                </th>
                                {ROLES.map(role => (
                                    <th key={role.id} className="text-center py-4 px-4 font-semibold text-slate-700 min-w-[120px]">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${role.color}`}>
                                                {role.name}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {MENU_ITEMS.map((item, idx) => (
                                <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                    }`}>
                                    <td className="py-4 px-6 font-medium text-slate-900 sticky left-0 bg-inherit z-10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{item.icon}</span>
                                            <span>{item.name}</span>
                                        </div>
                                    </td>
                                    {ROLES.map(role => {
                                        const visible = isItemVisible(role.id, item.id);
                                        return (
                                            <td key={role.id} className="py-4 px-4 text-center">
                                                <button
                                                    onClick={() => togglePermission(role.id, item.id)}
                                                    className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 flex items-center justify-center mx-auto ${visible
                                                        ? 'bg-green-500 border-green-600 hover:bg-green-600'
                                                        : 'bg-slate-200 border-slate-300 hover:bg-slate-300'
                                                        }`}
                                                >
                                                    {visible ? (
                                                        <CheckCircle2 className="h-6 w-6 text-white" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full border-2 border-slate-400"></div>
                                                    )}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>💡 Instrucciones:</strong> Haz clic en las casillas para activar (✓) o desactivar (○) cada item del menú para cada rol.
                    Los cambios se aplicarán cuando guardes y los usuarios recarguen la página.
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                >
                    <Save className="h-5 w-5" />
                    {saving ? 'Guardando...' : 'Guardar Permisos'}
                </button>

                <button
                    onClick={handleReset}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    <RotateCcw className="h-5 w-5" />
                    Restaurar Defaults
                </button>
            </div>
        </div>
    );
}
