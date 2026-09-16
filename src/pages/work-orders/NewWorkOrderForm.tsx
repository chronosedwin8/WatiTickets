import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useQuery } from '@tanstack/react-query'
import { workOrdersApi, assetsApi, getTenantId, type AssetWithRelations, listar, teamsApi } from '@/lib/api'
import {
    ArrowLeft,
    AlertTriangle,
    Loader2,
    Save,
    Search,
    ChevronDown,
    Check
} from 'lucide-react'
import { cardStyle, priorityConfig, typeConfig } from './constants'
import { RichTextEditor } from '@/components/common/RichTextEditor'

export function NewWorkOrderForm() {
    const navigate = useNavigate()
    const { primaryColor, tenant } = useTenant()
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [assets, setAssets] = useState<AssetWithRelations[]>([])
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        type: 'maintenance',
        asset_id: '',
        scheduled_start: '',
        scheduled_end: '',
        department_id: '',
        technician_id: '',
    })

    const [isAssetSelectOpen, setIsAssetSelectOpen] = useState(false)
    const [assetSearchQuery, setAssetSearchQuery] = useState('')

    // Fetch team members based on departmentId
    const { data: teamMembers } = useQuery({
        queryKey: ['team-members', tenant?.id, formData.department_id],
        queryFn: async () => {
            if (!formData.department_id) return []
            const data = await teamsApi.getMembers(formData.department_id)
            const error = null
            if (error) throw error
            return data
        },
        enabled: !!tenant?.id && !!formData.department_id
    })

    const { data: departments } = useQuery({
        queryKey: ['departments', tenant?.id],
        queryFn: async () => {
            return listar('teams', { order: 'name' })
        },
        enabled: !!tenant?.id
    })

    useEffect(() => {
        const loadAssets = async () => {
            if (tenant?.id) {
                const data = await assetsApi.getAll(tenant.id)
                setAssets(data)
            }
        }
        loadAssets()
    }, [tenant?.id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const tenantId = getTenantId(tenant?.id)

            await workOrdersApi.create({
                tenant_id: tenantId,
                title: formData.title,
                description: formData.description,
                priority: formData.priority as any,
                type: formData.type as any,
                status: 'scheduled',
                asset_id: formData.asset_id || null,
                scheduled_start: formData.scheduled_start || null,
                scheduled_end: formData.scheduled_end || null,
                department_id: formData.department_id || null,
                technician_id: formData.technician_id || null,
                number: Math.floor(Date.now() / 1000), // Fallback
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })

            navigate('/work-orders')
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            setError('Error al crear la orden de trabajo. Por favor intente nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <Link
                    to="/work-orders"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#64748B',
                        textDecoration: 'none',
                        marginBottom: '12px'
                    }}
                >
                    <ArrowLeft size={16} />
                    Volver a Órdenes
                </Link>
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    Nueva Orden de Trabajo
                </h1>
                <p style={{ color: '#64748B', marginTop: '4px' }}>
                    Programar servicio de mantenimiento o reparación
                </p>
            </div>

            <form onSubmit={handleSubmit} style={cardStyle}>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {error && (
                        <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                            Título <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Mantenimiento preventivo servidores"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid #E2E8F0',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.15s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = primaryColor}
                            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                        />
                    </div>

                    {/* Department & Assignee */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                Departamento <span style={{ color: '#DC2626' }}>*</span>
                            </label>
                            <select
                                required
                                value={formData.department_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value, technician_id: '' }))}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '14px',
                                    outline: 'none',
                                    backgroundColor: '#FFFFFF',
                                }}
                            >
                                <option value="">Seleccione un departamento...</option>
                                {departments?.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                Técnico Asignado
                            </label>
                            <select
                                value={formData.technician_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, technician_id: e.target.value }))}
                                disabled={!formData.department_id}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '14px',
                                    outline: 'none',
                                    backgroundColor: formData.department_id ? '#FFFFFF' : '#F8FAFC',
                                    cursor: formData.department_id ? 'pointer' : 'not-allowed'
                                }}
                            >
                                <option value="">Sin asignar</option>
                                {teamMembers?.map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Type & Priority */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                Tipo
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '14px',
                                    outline: 'none',
                                    backgroundColor: '#FFFFFF',
                                }}
                            >
                                {Object.entries(typeConfig).map(([value, config]) => (
                                    <option key={value} value={value}>{config.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                Prioridad
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '14px',
                                    outline: 'none',
                                    backgroundColor: '#FFFFFF',
                                }}
                            >
                                {Object.entries(priorityConfig).map(([value, config]) => (
                                    <option key={value} value={value}>{config.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Asset & Schedule */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                Activo Relacionado
                            </label>

                            <div
                                onClick={() => formData.department_id && setIsAssetSelectOpen(!isAssetSelectOpen)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '14px',
                                    backgroundColor: formData.department_id ? '#FFFFFF' : '#F8FAFC',
                                    cursor: formData.department_id ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span style={{ color: formData.asset_id ? '#0F172A' : '#94A3B8' }}>
                                    {formData.asset_id
                                        ? (() => {
                                            const asset = assets.find(a => a.id === formData.asset_id)
                                            return asset ? `${asset.name} (${asset.asset_tag})` : 'Seleccionado'
                                        })()
                                        : (formData.department_id ? 'Buscar activo...' : 'Seleccione un departamento primero')
                                    }
                                </span>
                                <ChevronDown size={16} color="#94A3B8" />
                            </div>

                            {isAssetSelectOpen && formData.department_id && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    backgroundColor: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                    zIndex: 50,
                                    maxHeight: '250px',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <div style={{ padding: '8px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Search size={14} color="#94A3B8" />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Buscar por nombre o tag..."
                                            value={assetSearchQuery}
                                            onChange={e => setAssetSearchQuery(e.target.value)}
                                            style={{
                                                flex: 1,
                                                border: 'none',
                                                outline: 'none',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                    <div style={{ overflowY: 'auto', padding: '4px' }}>
                                        <div
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, asset_id: '' }))
                                                setIsAssetSelectOpen(false)
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderRadius: '4px',
                                                fontSize: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                backgroundColor: !formData.asset_id ? '#F1F5F9' : 'transparent',
                                                color: '#334155'
                                            }}
                                        >
                                            Ninguno / General
                                            {!formData.asset_id && <Check size={14} color="#334155" />}
                                        </div>
                                        {assets
                                            .filter(a => a.department_id === formData.department_id)
                                            .filter(a =>
                                                a.name.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
                                                (a.asset_tag && a.asset_tag.toLowerCase().includes(assetSearchQuery.toLowerCase()))
                                            )
                                            .map(asset => (
                                                <div
                                                    key={asset.id}
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, asset_id: asset.id }))
                                                        setIsAssetSelectOpen(false)
                                                    }}
                                                    style={{
                                                        padding: '8px 12px',
                                                        cursor: 'pointer',
                                                        borderRadius: '4px',
                                                        fontSize: '14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        backgroundColor: formData.asset_id === asset.id ? '#F1F5F9' : 'transparent',
                                                        color: '#334155'
                                                    }}
                                                >
                                                    {asset.name} <span style={{ color: '#94A3B8', fontSize: '12px' }}>({asset.asset_tag})</span>
                                                    {formData.asset_id === asset.id && <Check size={14} color="#334155" />}
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                Inicio Programado
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.scheduled_start}
                                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_start: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '14px',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                            Descripción <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <RichTextEditor
                            value={formData.description}
                            onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/work-orders')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#64748B',
                                backgroundColor: '#F1F5F9',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 24px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#FFFFFF',
                                backgroundColor: primaryColor,
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                boxShadow: `0 4px 14px ${primaryColor}40`,
                            }}
                        >
                            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                            {loading ? 'Programar Orden' : 'Programar Orden'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
