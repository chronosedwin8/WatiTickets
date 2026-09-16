import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { workOrdersApi, profilesApi, type WorkOrderWithRelations, type Profile, listar, teamsApi } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { formatDate } from '@/lib/utils'
import {
    ArrowLeft,
    Trash2,
    Calendar,
    MapPin,
    MessageSquare,
    Loader2,
    Send,
    AlertTriangle,
    Server,
    CheckCircle
} from 'lucide-react'
import { cardStyle, statusConfig, priorityConfig, typeConfig } from './constants'
import { toast } from '@/hooks/use-toast'
import { RichTextEditor } from '@/components/common/RichTextEditor'

export function WorkOrderDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { primaryColor, tenant } = useTenant()

    const [order, setOrder] = useState<WorkOrderWithRelations | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [technicians, setTechnicians] = useState<Profile[]>([])

    // Comments state
    const [comments, setComments] = useState<any[]>([])
    const [newComment, setNewComment] = useState('')
    const [sendingComment, setSendingComment] = useState(false)
    const [isCompleting, setIsCompleting] = useState(false)
    const [completionNotes, setCompletionNotes] = useState('')

    const fetchOrder = async () => {
        if (!id || !tenant?.id) return
        try {
            setLoading(true)
            const [orderData, commentsData] = await Promise.all([
                workOrdersApi.getById(id),
                workOrdersApi.getComments(id),
            ])
            setOrder(orderData)
            setComments(commentsData || [])
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            setError('Error al cargar la orden de trabajo')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrder()
    }, [id, tenant?.id])

    const { data: departments } = useQuery({
        queryKey: ['departments', tenant?.id],
        queryFn: async () => {
            return listar('teams', { order: 'name' })
        },
        enabled: !!tenant?.id
    })

    const { data: teamMembers } = useQuery({
        queryKey: ['team-members', tenant?.id, order?.department_id],
        queryFn: async () => {
            if (!order?.department_id) return []
            const data = await teamsApi.getMembers(order.department_id)
            const error = null
            if (error) throw error
            return data
        },
        enabled: !!tenant?.id && !!order?.department_id
    })

    const handleUpdate = async (updates: Partial<WorkOrderWithRelations>) => {
        if (!order) return
        try {
            await workOrdersApi.update(order.id, updates)
            // Optimistic update or refresh
            const updatedOrder = await workOrdersApi.getById(order.id)
            setOrder(updatedOrder)
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al actualizar', variant: 'destructive' })
        }
    }

    const handleComplete = async () => {
        if (!order || !completionNotes.trim()) return
        try {
            await workOrdersApi.update(order.id, {
                status: 'completed',
                completion_notes: completionNotes
            })
            const updatedOrder = await workOrdersApi.getById(order.id)
            setOrder(updatedOrder)
            setIsCompleting(false)
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al finalizar trabajo', variant: 'destructive' })
        }
    }

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newComment.trim() || !order || !user) return
        try {
            setSendingComment(true)
            await workOrdersApi.addComment(order.id, newComment, user.id)
            setNewComment('')
            const updatedComments = await workOrdersApi.getComments(order.id)
            setComments(updatedComments || [])
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al enviar comentario', variant: 'destructive' })
        } finally {
            setSendingComment(false)
        }
    }

    const handleDelete = async () => {
        if (!order || !confirm('¿Estás seguro de eliminar esta orden de trabajo? Esta acción no se puede deshacer.')) return
        try {
            await workOrdersApi.delete(order.id)
            navigate('/work-orders')
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al eliminar la orden', variant: 'destructive' })
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: primaryColor }} />
            </div>
        )
    }

    if (error || !order) {
        return (
            <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
                <AlertTriangle size={48} color="#DC2626" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', marginBottom: '8px' }}>Error</h3>
                <p style={{ color: '#64748B' }}>{error || 'Orden de trabajo no encontrada'}</p>
                <button
                    onClick={() => navigate('/work-orders')}
                    style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: primaryColor, color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                    Volver a Órdenes
                </button>
            </div>
        )
    }

    const status = statusConfig[order.status] || statusConfig.new
    const priority = priorityConfig[order.priority] || priorityConfig.medium
    const type = typeConfig[order.type] || typeConfig.maintenance
    const StatusIcon = status.icon
    const TypeIcon = type.icon

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    }}
                >
                    <ArrowLeft size={16} />
                    Volver a Órdenes
                </Link>
                <button
                    onClick={handleDelete}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: '1px solid #FECACA',
                        cursor: 'pointer',
                    }}
                >
                    <Trash2 size={14} />
                    Eliminar Orden
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 1fr', gap: '24px', alignItems: 'start' }}>

                {/* Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Header Card */}
                    <div style={cardStyle}>
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                                <span style={{ fontSize: '14px', fontFamily: 'monospace', color: '#94A3B8' }}>#{order.number}</span>

                                {/* Status Selector */}
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={order.status}
                                        onChange={(e) => handleUpdate({ status: e.target.value as any })}
                                        style={{
                                            appearance: 'none',
                                            padding: '4px 30px 4px 10px',
                                            borderRadius: '20px',
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            backgroundColor: status.bg,
                                            color: status.text,
                                            border: 'none',
                                            cursor: 'pointer',
                                            outline: 'none',
                                        }}
                                    >
                                        {Object.entries(statusConfig).map(([key, conf]) => (
                                            <option key={key} value={key}>{conf.label}</option>
                                        ))}
                                    </select>
                                    <StatusIcon size={12} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: status.text }} />
                                </div>

                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontWeight: '500',
                                    backgroundColor: '#F1F5F9',
                                    color: '#475569',
                                }}>
                                    <TypeIcon size={12} />
                                    {type.label}
                                </span>
                            </div>

                            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px' }}>
                                {order.title}
                            </h1>

                            <div
                                style={{ fontSize: '15px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}
                                dangerouslySetInnerHTML={{ __html: order.description || '' }}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Programada</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontSize: '14px' }}>
                                        <Calendar size={16} color="#64748B" />
                                        {order.scheduled_start ? formatDate(order.scheduled_start, 'PPp') : 'Sin fecha'}
                                    </div>
                                </div>
                                {order.location && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Ubicación</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontSize: '14px' }}>
                                            <MapPin size={16} color="#64748B" />
                                            {order.location.name}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Completion Section */}
                    {isCompleting ? (
                        <div style={cardStyle}>
                            <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={18} color="#059669" />
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A', margin: 0 }}>Finalizar Trabajo</h3>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                                    Evidencias y Notas de Finalización <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <RichTextEditor
                                    value={completionNotes}
                                    onChange={setCompletionNotes}
                                />
                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setIsCompleting(false)}
                                        style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#475569', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleComplete}
                                        disabled={!completionNotes.trim()}
                                        style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: completionNotes.trim() ? 1 : 0.6 }}
                                    >
                                        Guardar y Finalizar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        order.status === 'completed' && order.completion_notes && (
                            <div style={{ ...cardStyle, borderLeft: '4px solid #059669' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle size={18} color="#059669" />
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A', margin: 0 }}>Trabajo Finalizado</h3>
                                </div>
                                <div style={{ padding: '24px' }}>
                                    <div
                                        className="prose prose-sm max-w-none"
                                        style={{ fontSize: '15px', color: '#334155', lineHeight: '1.6' }}
                                        dangerouslySetInnerHTML={{ __html: order.completion_notes }}
                                    />
                                </div>
                            </div>
                        )
                    )}

                    {!isCompleting && order.status !== 'completed' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setCompletionNotes(order.completion_notes || '')
                                    setIsCompleting(true)
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    backgroundColor: '#059669',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgb(5 150 105 / 0.2)'
                                }}
                            >
                                <CheckCircle size={18} />
                                Finalizar Trabajo
                            </button>
                        </div>
                    )}

                    {/* Bitacora / Comments */}
                    <div style={cardStyle}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MessageSquare size={18} color="#64748B" />
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A', margin: 0 }}>Bitácora de Seguimiento</h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                                {comments.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: '14px' }}>
                                        No hay registros en la bitácora.
                                    </p>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment.id} style={{ display: 'flex', gap: '12px' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#E2E8F0', flexShrink: 0, overflow: 'hidden' }}>
                                                {comment.author?.avatar_url ? (
                                                    <img src={comment.author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '12px', fontWeight: '600' }}>
                                                        {comment.author?.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A' }}>
                                                        {comment.author?.full_name || 'Usuario Desconocido'}
                                                    </span>
                                                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                                                        {formatDate(comment.created_at, 'PPp')}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '0 12px 12px 12px' }}>
                                                    {comment.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form onSubmit={handleSendComment} style={{ display: 'flex', gap: '12px' }}>
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Agregar nota a la bitácora..."
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '14px',
                                        outline: 'none',
                                        resize: 'vertical',
                                        minHeight: '80px',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || sendingComment}
                                    style={{
                                        alignSelf: 'flex-end',
                                        padding: '10px 20px',
                                        borderRadius: '12px',
                                        backgroundColor: primaryColor,
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: (!newComment.trim() || sendingComment) ? 0.7 : 1,
                                    }}
                                >
                                    {sendingComment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    Enviar
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Asset Card */}
                    {order.asset && (
                        <div style={cardStyle}>
                            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    backgroundColor: '#F1F5F9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Server size={24} color="#64748B" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A', margin: '0 0 2px' }}>
                                        {order.asset.name}
                                    </h3>
                                    <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                                        Tag: {order.asset.asset_tag}
                                    </p>
                                </div>
                                <Link
                                    to={`/assets/${order.asset_id}`}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #E2E8F0',
                                        backgroundColor: 'white',
                                        color: '#475569',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        textDecoration: 'none'
                                    }}
                                >
                                    Ver Activo
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ ...cardStyle, padding: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginBottom: '16px' }}>Información</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748B', marginBottom: '4px' }}>Prioridad</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={order.priority}
                                        onChange={(e) => handleUpdate({ priority: e.target.value as any })}
                                        style={{
                                            width: '100%',
                                            appearance: 'none',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            backgroundColor: priority.color + '20',
                                            color: priority.color,
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            border: 'none',
                                            cursor: 'pointer',
                                            outline: 'none',
                                        }}
                                    >
                                        {Object.entries(priorityConfig).map(([key, conf]) => (
                                            <option key={key} value={key}>{conf.label}</option>
                                        ))}
                                    </select>
                                    <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, borderRadius: '50%', backgroundColor: priority.color, pointerEvents: 'none' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748B', marginBottom: '4px' }}>Departamento</label>
                                <select
                                    value={order.department_id || ''}
                                    onChange={(e) => handleUpdate({ department_id: e.target.value || null, technician_id: null })}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '14px',
                                        outline: 'none',
                                        backgroundColor: 'white',
                                        color: order.department_id ? '#334155' : '#94A3B8',
                                    }}
                                >
                                    <option value="">Sin Asignar</option>
                                    {departments?.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748B', marginBottom: '4px' }}>Técnico Asignado</label>
                                <select
                                    value={order.technician_id || ''}
                                    onChange={(e) => handleUpdate({ technician_id: e.target.value || null })}
                                    disabled={!order.department_id}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '14px',
                                        outline: 'none',
                                        backgroundColor: order.department_id ? 'white' : '#F8FAFC',
                                        color: order.technician_id ? '#334155' : '#94A3B8',
                                        cursor: order.department_id ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    <option value="">Sin Asignar</option>
                                    {teamMembers?.map(tech => (
                                        <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
