import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { assetGroupsApi, type Asset } from '@/lib/api'
import { ArrowLeft, Edit, Layers, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'

export function AssetGroupDetail() {
    const { id } = useParams()
    const [group, setGroup] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) loadGroup(id)
    }, [id])

    const loadGroup = async (groupId: string) => {
        try {
            setLoading(true)
            const data = await assetGroupsApi.getById(groupId)
            setGroup(data)
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading group:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Cargando detalles del grupo...</div>
    if (!group) return <div className="p-8 text-center text-red-500">Grupo no encontrado o eliminado.</div>

    const assets = group.assets || []

    return (
        <div className="space-y-6 container mx-auto p-4 max-w-7xl">
            <div className="flex items-center gap-4 mb-2">
                <Link to="/assets/groups">
                    <Button variant="ghost" size="sm" className="pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a Grupos
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Group Info Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="p-6 h-fit space-y-6 sticky top-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                                <Layers className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{group.name}</h1>
                                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Grupo de Activos</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                {group.description || 'Sin descripción disponible para este grupo.'}
                            </p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-sm text-slate-500">Total Activos</span>
                                <Badge variant="outline" className="font-mono">{assets.length}</Badge>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-sm text-slate-500">Creado</span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatRelativeTime(group.created_at)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-slate-500">Actualizado</span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatRelativeTime(group.updated_at)}</span>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-2">
                            {/* Placeholder for Edit Action */}
                            <Button className="w-full text-slate-600 dark:text-slate-300" variant="outline" disabled title="Próximamente">
                                <Edit className="w-4 h-4 mr-2" /> Editar
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Assets List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Activos Asignados
                            <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ml-2">{assets.length}</Badge>
                        </h2>
                        {/* Maybe filter or view options here */}
                    </div>

                    {assets.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <div className="bg-slate-50 dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Monitor className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Grupo Vacío</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                                No hay activos asignados a este grupo todavía. Puedes asignar activos desde la edición de cada activo.
                            </p>
                            <Link to="/assets/new">
                                <Button>Crear Nuevo Activo para este Grupo</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {assets.map((asset: Asset) => (
                                <Link to={`/assets/${asset.id}`} key={asset.id} className="block group">
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-500 hover:shadow-md transition-all duration-200 flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-600 transition-colors">
                                                <Monitor className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 dark:text-white text-lg group-hover:text-primary-600 transition-colors">
                                                    {asset.name}
                                                </h3>
                                                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{asset.asset_tag || 'NO-TAG'}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        S/N: {asset.serial_number || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge
                                                className={`
                                                    ${asset.status === 'in_use' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200' : ''}
                                                    ${asset.status === 'in_stock' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200' : ''}
                                                    ${asset.status === 'maintenance' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200' : ''}
                                                `}
                                                variant="outline"
                                            >
                                                {asset.status === 'in_use' ? 'En Uso' :
                                                    asset.status === 'in_stock' ? 'En Stock' :
                                                        asset.status === 'maintenance' ? 'Mantenimiento' : asset.status}
                                            </Badge>
                                            <span className="text-xs text-slate-400">
                                                Actualizado {formatRelativeTime(asset.updated_at)}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
