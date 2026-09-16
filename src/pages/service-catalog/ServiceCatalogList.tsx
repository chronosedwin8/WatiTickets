import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    ShoppingBag,
    Plus,
    Search,
    Filter,
    Package,
    Monitor,
    Shield,
    Wrench,
    ArrowRight,
    Calendar
} from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { type ServiceItem } from '@/types/database'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { listar } from '@/lib/api'

export function ServiceCatalogList() {
    const { tenant } = useTenant()
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const { data: items, isLoading, error } = useQuery({
        queryKey: ['service_items', tenant?.id, typeFilter],
        queryFn: async () => {
            if (!tenant) return []

            return listar('service_catalog_items', {
                expand: 'category',
                order: 'name',
                filtros: typeFilter !== 'all' ? { type: typeFilter } : {},
            })
        },
        enabled: !!tenant
    })

    const filteredItems = items?.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getItemIcon = (type: string) => {
        switch (type) {
            case 'hardware': return <Monitor size={24} className="text-blue-600" />
            case 'software': return <Package size={24} className="text-purple-600" />
            case 'access': return <Shield size={24} className="text-green-600" />
            case 'service': return <Wrench size={24} className="text-orange-600" />
            default: return <ShoppingBag size={24} className="text-gray-600" />
        }
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'hardware': return 'Hardware'
            case 'software': return 'Software'
            case 'access': return 'Acceso'
            case 'service': return 'Servicio'
            default: return type
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Catálogo de Servicios</h1>
                    <p className="text-slate-500 mt-1">Solicita hardware, software y servicios IT estandarizados</p>
                </div>
                <div className="flex gap-2">
                    <Link to="absence/new">
                        <Button variant="outline" className="text-slate-700 bg-white hover:bg-slate-50 border-slate-200">
                            <Calendar size={20} className="mr-2" />
                            Reportar Ausencia
                        </Button>
                    </Link>
                    <Link to="new">
                        <Button className="bg-primary-600 hover:bg-primary-700 text-white">
                            <Plus size={20} className="mr-2" />
                            Nuevo Item
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar servicios, equipos, accesos..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-slate-400" size={20} />
                    <select
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="hardware">Hardware</option>
                        <option value="software">Software</option>
                        <option value="access">Accesos</option>
                        <option value="service">Servicios</option>
                    </select>
                </div>
            </div>

            {/* Content Display */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-48 bg-white rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100 text-red-600">
                    <ShoppingBag className="mx-auto mb-2" size={32} />
                    <p>Error al cargar el catálogo. Por favor intenta de nuevo.</p>
                </div>
            ) : filteredItems?.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No hay servicios disponibles</h3>
                    <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                        No se encontraron items en el catálogo con los filtros actuales.
                    </p>
                    {(typeFilter === 'all' && !searchQuery) && (
                        <Link to="new" className="inline-block mt-4">
                            <Button variant="outline">Agregar primer servicio</Button>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems?.map((item) => (
                        <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-primary-200 flex flex-col h-full overflow-hidden p-0">
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-primary-50 transition-colors">
                                        {item.icon_url ?
                                            <img src={item.icon_url} alt="" className="w-6 h-6 object-contain" /> :
                                            getItemIcon(item.type)
                                        }
                                    </div>
                                    <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 uppercase tracking-wide">
                                        {getTypeLabel(item.type)}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors">
                                    {item.name}
                                </h3>

                                <p className="text-slate-500 text-sm line-clamp-3 mb-4 flex-1">
                                    {item.description}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                                    <div className="font-semibold text-slate-900">
                                        {item.price > 0 ? (
                                            `${item.currency} ${item.price}`
                                        ) : (
                                            <span className="text-green-600">Gratuito</span>
                                        )}
                                    </div>
                                    <Link to={`${item.id}`}>
                                        <Button size="sm" variant="ghost" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 p-0 h-auto">
                                            Ver Detalles <ArrowRight size={16} className="ml-1" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
