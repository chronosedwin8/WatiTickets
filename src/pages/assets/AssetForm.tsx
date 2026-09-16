import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { assetsApi, locationsApi, assetGroupsApi, getTenantId, type Location, type AssetWithRelations, listar, profilesApi } from '@/lib/api'
import type { Profile } from '@/types/database'
import {
    ArrowLeft,
    AlertTriangle,
    Save,
    Plus,
    Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { statusConfig } from './constants'

interface CustomField {
    key: string
    value: string
}

export function AssetForm() {
    const { id } = useParams()
    const isEdit = !!id
    const navigate = useNavigate()
    const { primaryColor, tenant } = useTenant()
    const [loading, setLoading] = useState(false)
    const [locations, setLocations] = useState<Location[]>([])
    const [users, setUsers] = useState<Profile[]>([])
    const [assetGroups, setAssetGroups] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        status: 'in_stock',
        asset_tag: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        location_id: '',
        assigned_user_id: '',
        asset_group_id: '',
        purchase_cost: '',
        purchase_date: '',
        acquisition_date: '',
        warranty_expiry: '',
        building: '',
        floor: '',
        office: '',
        has_insurance: false,
        insurer_name: '',
        insurance_expiry: '',
        vendor_name: '',
        department_id: '',
    })

    const [customFields, setCustomFields] = useState<CustomField[]>([])

    useEffect(() => {
        const loadDependencies = async () => {
            if (tenant?.id) {
                try {
                    const [locs, profiles, groups, depts] = await Promise.all([
                        locationsApi.getAll(tenant.id),
                        profilesApi.getAll(),
                        assetGroupsApi.getAll(),
                        listar('teams', { order: 'name' })
                    ])
                    setLocations(locs || [])
                    setUsers(profiles || [])
                    setAssetGroups(groups || [])
                    setDepartments(depts || [])
                } catch (e) {
                    if (import.meta.env.DEV) console.error("Error loading dependencies", e)
                }
            }
        }
        loadDependencies()
    }, [tenant?.id])

    useEffect(() => {
        if (isEdit && id) {
            const loadAsset = async () => {
                try {
                    setLoading(true)
                    const asset = await assetsApi.getById(id)
                    if (asset) {
                        setFormData({
                            name: asset.name,
                            status: asset.status,
                            asset_tag: asset.asset_tag || '',
                            manufacturer: asset.manufacturer || '',
                            model: asset.model || '',
                            serial_number: asset.serial_number || '',
                            location_id: asset.location_id || '',
                            assigned_user_id: asset.assigned_user_id || '',
                            asset_group_id: asset.asset_group_id || '',
                            purchase_cost: asset.purchase_cost?.toString() || '',
                            purchase_date: asset.purchase_date?.split('T')[0] || '',
                            acquisition_date: asset.acquisition_date?.split('T')[0] || '',
                            warranty_expiry: asset.warranty_expiry?.split('T')[0] || '',
                            building: asset.building || '',
                            floor: asset.floor || '',
                            office: asset.office || '',
                            has_insurance: asset.has_insurance || false,
                            insurer_name: asset.insurer_name || '',
                            insurance_expiry: asset.insurance_expiry?.split('T')[0] || '',
                            vendor_name: asset.vendor_name || '',
                            department_id: asset.department_id || '',
                        })

                        // Parse custom fields
                        if (asset.custom_fields && typeof asset.custom_fields === 'object') {
                            const fields = Object.entries(asset.custom_fields).map(([key, value]) => ({
                                key,
                                value: String(value)
                            }))
                            setCustomFields(fields)
                        }
                    }
                } catch (err) {
                    if (import.meta.env.DEV) console.error(err)
                    setError('Error al cargar el activo')
                } finally {
                    setLoading(false)
                }
            }
            loadAsset()
        }
    }, [id, isEdit])

    const selectedLocation = locations.find(l => l.id === formData.location_id)
    const availableBuildings = selectedLocation?.buildings || []

    const handleCustomFieldChange = (index: number, field: 'key' | 'value', value: string) => {
        const newFields = [...customFields]
        newFields[index][field] = value
        setCustomFields(newFields)
    }

    const addCustomField = () => {
        setCustomFields([...customFields, { key: '', value: '' }])
    }

    const removeCustomField = (index: number) => {
        setCustomFields(customFields.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const tenantId = getTenantId(tenant?.id)

            // Prepare custom fields object
            const customFieldsObj = customFields.reduce((acc, curr) => {
                if (curr.key.trim()) {
                    acc[curr.key.trim()] = curr.value
                }
                return acc
            }, {} as Record<string, any>)

            const payload: any = {
                tenant_id: tenantId,
                name: formData.name,
                status: formData.status as any,
                asset_tag: formData.asset_tag || null,
                manufacturer: formData.manufacturer || null,
                model: formData.model || null,
                serial_number: formData.serial_number || null,
                location_id: formData.location_id || null,
                assigned_user_id: formData.assigned_user_id || null,
                asset_group_id: formData.asset_group_id || null,
                purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
                purchase_date: formData.purchase_date ? new Date(formData.purchase_date).toISOString() : null,
                acquisition_date: formData.acquisition_date ? new Date(formData.acquisition_date).toISOString() : null,
                warranty_expiry: formData.warranty_expiry ? new Date(formData.warranty_expiry).toISOString() : null,
                building: formData.building || null,
                floor: formData.floor || null,
                office: formData.office || null,
                has_insurance: formData.has_insurance,
                insurer_name: formData.insurer_name || null,
                insurance_expiry: formData.insurance_expiry ? new Date(formData.insurance_expiry).toISOString() : null,
                vendor_name: formData.vendor_name || null,
                custom_fields: customFieldsObj,
                department_id: formData.department_id || null,
            }

            if (isEdit && id) {
                await assetsApi.update(id, payload)
            } else {
                payload.created_at = new Date().toISOString()
                await assetsApi.create(payload)
            }

            navigate('/assets')
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            setError(`Error al ${isEdit ? 'actualizar' : 'crear'} el activo. Por favor intente nuevamente.`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="mb-6">
                <Link
                    to="/assets"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors mb-3"
                >
                    <ArrowLeft size={16} />
                    Volver a Activos
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 m-0">
                    {isEdit ? 'Editar Activo' : 'Nuevo Activo'}
                </h1>
                <p className="text-slate-500 mt-1">
                    {isEdit ? 'Actualizar información del activo' : 'Registrar nuevo equipo en inventario'}
                </p>
            </div>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-8">

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Información Básica</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Nombre <span className="text-red-500">*</span></label>
                                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Laptop Dell XPS" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Tag / Código</label>
                                <Input value={formData.asset_tag} onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })} placeholder="AST-0001" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Estado</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                                >
                                    {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Responsable / Usuario</label>
                                <select
                                    value={formData.assigned_user_id}
                                    onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                                >
                                    <option value="">Sin asignar</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Grupo de Activos</label>
                                <select
                                    value={formData.asset_group_id}
                                    onChange={(e) => setFormData({ ...formData, asset_group_id: e.target.value })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                                >
                                    <option value="">Sin grupo</option>
                                    {assetGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Departamento</label>
                                <select
                                    value={formData.department_id}
                                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                                >
                                    <option value="">Sin departamento</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Location Info */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Ubicación</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Sede</label>
                                <select
                                    value={formData.location_id}
                                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value, building: '', floor: '', office: '' })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                                >
                                    <option value="">Sin sede</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Edificio</label>
                                {availableBuildings.length > 0 ? (
                                    <select
                                        value={formData.building}
                                        onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                                        className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg p-2.5"
                                    >
                                        <option value="">Seleccione edificio...</option>
                                        {availableBuildings.map((b, i) => (
                                            <option key={i} value={b}>{b}</option>
                                        ))}
                                        {/* If the current building is not in the list (legacy data), show it */}
                                        {formData.building && !availableBuildings.includes(formData.building) && (
                                            <option value={formData.building}>{formData.building} (Actual)</option>
                                        )}
                                    </select>
                                ) : (
                                    <Input value={formData.building} onChange={(e) => setFormData({ ...formData, building: e.target.value })} placeholder="Ej: Bloque A" disabled={!formData.location_id} />
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Piso</label>
                                <Input value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Oficina / Área</label>
                                <Input value={formData.office} onChange={(e) => setFormData({ ...formData, office: e.target.value })} />
                            </div>
                        </div>
                    </section>

                    {/* Details Info */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Detalles Técnicos y Financieros</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Fabricante</label>
                                <Input value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Modelo</label>
                                <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Número de Serie</label>
                                <Input value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Proveedor</label>
                                <Input value={formData.vendor_name} onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Costo de Compra</label>
                                <Input type="number" value={formData.purchase_cost} onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Fecha Compra</label>
                                <Input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Fecha Ingreso</label>
                                <Input type="date" value={formData.acquisition_date} onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Garantía Vence</label>
                                <Input type="date" value={formData.warranty_expiry} onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })} />
                            </div>
                        </div>
                    </section>

                    {/* Insurance Info */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Seguro</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="has_insurance"
                                    checked={formData.has_insurance}
                                    onChange={(e) => setFormData({ ...formData, has_insurance: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                />
                                <label htmlFor="has_insurance" className="text-sm font-medium text-slate-700">Activo Asegurado</label>
                            </div>

                            {formData.has_insurance && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-slate-100">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Aseguradora</label>
                                        <Input value={formData.insurer_name} onChange={(e) => setFormData({ ...formData, insurer_name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Vencimiento Póliza</label>
                                        <Input type="date" value={formData.insurance_expiry} onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Custom Fields */}
                    <section>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
                            <h3 className="text-sm font-bold text-slate-900">Campos Personalizados</h3>
                            <Button type="button" variant="secondary" onClick={addCustomField} icon={<Plus size={14} />} size="sm">
                                Agregar Campo
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {customFields.map((field, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <Input
                                        placeholder="Nombre del campo (ej: Color)"
                                        value={field.key}
                                        onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                                        className="flex-1"
                                    />
                                    <Input
                                        placeholder="Valor"
                                        value={field.value}
                                        onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                                        className="flex-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeCustomField(index)}
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {customFields.length === 0 && (
                                <div className="text-sm text-slate-400 italic">No hay campos personalizados</div>
                            )}
                        </div>
                    </section>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate('/assets')}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            isLoading={loading}
                            icon={<Save size={18} />}
                            style={{ background: primaryColor }}
                        >
                            {isEdit ? 'Actualizar Activo' : 'Guardar Activo'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
