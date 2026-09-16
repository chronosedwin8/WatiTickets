import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi, serviceCatalogApi } from '@/lib/api'

export function NewServiceItemForm() {
    const { tenant } = useTenant()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'service',
        price: '0',
        currency: 'USD',
        categoryId: '',
        approvalRequired: false,
        isActive: true
    })

    // Fetch categories
    const { data: categories } = useQuery({
        queryKey: ['categories', tenant?.id],
        queryFn: async () => {
            if (!tenant) return []
            return categoriesApi.getAll()
        },
        enabled: !!tenant
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tenant) return

        setLoading(true)
        setError(null)

        try {
            await serviceCatalogApi.create({
                    name: formData.name,
                    description: formData.description || null,
                    type: formData.type as 'hardware' | 'software' | 'access' | 'service',
                    price: parseFloat(formData.price) || 0,
                    currency: formData.currency,
                    category_id: formData.categoryId || null,
                    approval_required: formData.approvalRequired,
                    is_active: formData.isActive
                } as any)

            navigate('/service-catalog')
        } catch (err: any) {
            if (import.meta.env.DEV) console.error('Error creating service item:', err)
            setError(err.message || 'Error al crear el item del catálogo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    to="/service-catalog"
                    className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Agregar Nuevo Item al Catálogo</h1>
                    <p className="text-slate-500">Define un hardware, software o servicio disponible para los usuarios.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="p-0">
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Información Básica</h3>

                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium text-slate-700">
                                    Nombre del Item <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="name"
                                    placeholder="Ej: Laptop Developer Pro, Acceso VPN..."
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="description" className="text-sm font-medium text-slate-700">
                                    Descripción
                                </label>
                                <textarea
                                    id="description"
                                    rows={4}
                                    placeholder="Detalles del producto o servicio, especificaciones, etc..."
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Detalles y Configuración</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="type" className="text-sm font-medium text-slate-700">
                                        Tipo de Item
                                    </label>
                                    <select
                                        id="type"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="hardware">Hardware</option>
                                        <option value="software">Software</option>
                                        <option value="access">Acceso / Permiso</option>
                                        <option value="service">Servicio General</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="category" className="text-sm font-medium text-slate-700">
                                        Categoría
                                    </label>
                                    <select
                                        id="category"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    >
                                        <option value="">Seleccionar categoría...</option>
                                        {categories?.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="price" className="text-sm font-medium text-slate-700">
                                        Precio Estimado
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            className="w-20 flex h-9 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        >
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="MXN">MXN</option>
                                            <option value="COP">COP</option>
                                        </select>
                                        <Input
                                            id="price"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                        checked={formData.approvalRequired}
                                        onChange={(e) => setFormData({ ...formData, approvalRequired: e.target.checked })}
                                    />
                                    <span className="text-sm text-slate-700">Requiere Aprobación de un Manager</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <span className="text-sm text-slate-700">Item Activo (Visible en el catálogo)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/service-catalog')}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-primary-600 hover:bg-primary-700 text-white"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Crear Item
                    </Button>
                </div>
            </form>
        </div>
    )
}
