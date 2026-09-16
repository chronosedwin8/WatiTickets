import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { Plus, X, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ticketsApi } from '@/lib/api'

interface TagsManagementProps {
    tenantId: string
}

export function TagsManagement({ tenantId }: TagsManagementProps) {
    const { toast } = useToast()
    const [tags, setTags] = useState<{ name: string; count: number }[]>([])
    const [newTag, setNewTag] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadTags()
    }, [tenantId])

    const loadTags = async () => {
        try {
            setLoading(true)
            // Get all tickets and extract unique tags with counts
            const tickets = await ticketsApi.getAll(tenantId)

            const tagCounts: Record<string, number> = {}
            tickets.forEach(ticket => {
                ticket.tags?.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1
                })
            })

            const tagList = Object.entries(tagCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)

            setTags(tagList)
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading tags:', error)
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los tags',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const filteredTags = tags.filter(tag =>
        tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return <div className="text-center py-8">Cargando tags...</div>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Tags</CardTitle>
                    <CardDescription>
                        Visualiza y gestiona los tags utilizados en los tickets. Los tags se crean automáticamente al agregarlos a un ticket.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar tags..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold">{tags.length}</div>
                                <p className="text-xs text-gray-500">Tags Únicos</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold">
                                    {tags.reduce((sum, t) => sum + t.count, 0)}
                                </div>
                                <p className="text-xs text-gray-500">Usos Totales</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold">
                                    {tags.length > 0 ? (tags.reduce((sum, t) => sum + t.count, 0) / tags.length).toFixed(1) : 0}
                                </div>
                                <p className="text-xs text-gray-500">Promedio por Tag</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tags list */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-sm">Tags Existentes</h3>
                        {filteredTags.length === 0 ? (
                            <p className="text-sm text-gray-500 py-8 text-center">
                                {searchTerm ? 'No se encontraron tags' : 'No hay tags creados aún'}
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {filteredTags.map(tag => (
                                    <Badge
                                        key={tag.name}
                                        variant="secondary"
                                        className="px-3 py-1.5 text-sm"
                                    >
                                        {tag.name}
                                        <span className="ml-2 text-xs text-gray-500">
                                            ({tag.count})
                                        </span>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md border border-blue-200">
                        <p className="font-medium mb-1">ℹ️ Información</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Los tags se crean automáticamente al agregarlos en un ticket</li>
                            <li>Cada ticket puede tener hasta 20 tags</li>
                            <li>El número entre paréntesis indica cuántos tickets usan ese tag</li>
                            <li>Puedes buscar tickets por tags desde la página de tickets</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
