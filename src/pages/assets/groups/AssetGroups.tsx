import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Edit, Trash2, Users, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { assetGroupsApi } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

export function AssetGroups() {
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        loadGroups()
    }, [])

    const loadGroups = async () => {
        try {
            setLoading(true)
            const data = await assetGroupsApi.getAll()
            setGroups(data || [])
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading groups:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este grupo de activos?')) return
        try {
            await assetGroupsApi.delete(id)
            setGroups(groups.filter(g => g.id !== id))
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error deleting group:', error)
            toast({ title: 'Error', description: 'Error al eliminar el grupo', variant: 'destructive' })
        }
    }

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.description || '').toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Layers className="w-8 h-8 text-primary-500" />
                        Grupos de Activos
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gestiona lotes y agrupaciones de equipos (ej. Lote Laptop 2026, Servidores, etc.)
                    </p>
                </div>
                <Link to="/assets/groups/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Grupo
                    </Button>
                </Link>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar grupos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Cargando grupos...</div>
            ) : filteredGroups.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white rounded-lg p-8 border border-dashed border-slate-300">
                    <Layers className="w-12 h-12 md:mx-auto text-slate-300 mb-4 mx-auto" />
                    <h3 className="text-lg font-medium text-slate-900">No hay grupos creados</h3>
                    <p className="text-slate-500 mb-6">Crea grupos para organizar mejor tus activos.</p>
                    <Link to="/assets/groups/new">
                        <Button variant="outline">Crear primer grupo</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGroups.map(group => (
                        <Card key={group.id} className="p-6 hover:shadow-md transition-shadow border-l-4 border-l-primary-500">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-100 rounded-lg">
                                    <Users className="w-6 h-6 text-slate-600" />
                                </div>
                                <div className="flex gap-2">
                                    {/* Edit functionality to be implemented properly, simplified for now */}
                                    {/* <Link to={`/assets/groups/${group.id}/edit`}>
                                        <Button variant="ghost" size="sm">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </Link> */}
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(group.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-slate-900 mb-2 truncate" title={group.name}>
                                {group.name}
                            </h3>

                            <p className="text-slate-500 text-sm mb-4 line-clamp-2 min-h-[2.5em]">
                                {group.description || 'Sin descripción'}
                            </p>

                            <div className="flex items-center justify-between text-xs text-slate-400 border-t pt-4">
                                <span>Creado {formatRelativeTime(group.created_at)}</span>
                                <Link to={`/assets/groups/${group.id}`} className="text-primary-500 hover:underline flex items-center gap-1 font-medium">
                                    Ver Activos <Eye className="w-3 h-3" />
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
