import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Calendar, User, Save, Clock, CheckCircle, Paperclip, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { maintenanceApi, ticketsApi, type MaintenanceActivity } from '@/lib/api'
import { uploadFileToS3 } from '@/lib/uploads'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'

interface ActivityDetailModalProps {
    activity: MaintenanceActivity | null
    onClose: () => void
    onUpdated: () => void
}

export function ActivityDetailModal({ activity, onClose, onUpdated }: ActivityDetailModalProps) {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [showCompletionDialog, setShowCompletionDialog] = useState(false)
    const [completionMessage, setCompletionMessage] = useState('')

    // Attachments
    const [attachments, setAttachments] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Reset state when activity changes
    useEffect(() => {
        if (activity) {
            setShowCompletionDialog(false)
            setCompletionMessage('')
            setAttachments([])
            setLoading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }, [activity?.id])

    if (!activity) return null

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)

            // Validate size (50MB)
            const validFiles = newFiles.filter(file => {
                const isValid = file.size <= 50 * 1024 * 1024
                if (!isValid) {
                    toast({ title: 'Archivo demasiado grande', description: `El archivo ${file.name} excede el límite de 50MB.`, variant: 'destructive' })
                }
                return isValid
            })

            if (validFiles.length > 0) {
                setAttachments(prev => [...prev, ...validFiles])
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === 'completed' && !showCompletionDialog) {
            setShowCompletionDialog(true)
            return
        }

        setLoading(true)
        try {
            // If completing and has ticket, handle attachments first
            let finalContent = completionMessage

            if (newStatus === 'completed' && activity.ticket_id && attachments.length > 0) {
                const uploadedFiles: { name: string, url: string }[] = []

                for (const file of attachments) {
                    const fileExt = file.name.split('.').pop()
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
                    const filePath = `tickets/${activity.ticket_id}/comments/${fileName}`

                    try {
                        const publicUrl = await uploadFileToS3(file, filePath)
                        uploadedFiles.push({ name: file.name, url: publicUrl })
                    } catch (uploadError) {
                        if (import.meta.env.DEV) console.error('Error uploading file:', uploadError)
                        toast({ title: 'Error', description: `Error al subir el archivo ${file.name}`, variant: 'destructive' })
                    }
                }

                if (uploadedFiles.length > 0) {
                    finalContent += '<br/><br/><strong>Evidencia Adjunta:</strong><ul class="list-none pl-0 mt-2 space-y-1">'
                    uploadedFiles.forEach(f => {
                        finalContent += `<li><a href="${f.url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline inline-flex items-center gap-1"><span class="w-4 h-4 inline-block"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></span> ${f.name}</a></li>`
                    })
                    finalContent += '</ul>'
                }
            }

            // Update Activity Status
            await maintenanceApi.updateActivityStatus(
                activity.id,
                newStatus,
                newStatus === 'completed' ? profile?.id : undefined
            )

            // If completing, resolve ticket
            if (newStatus === 'completed' && activity.ticket_id) {
                try {
                    // Update Ticket Status to Resolved
                    await ticketsApi.update(activity.ticket_id, {
                        status: 'resolved',
                        resolved_at: new Date().toISOString()
                    })

                    // Add Evidence/Message if provided
                    if ((finalContent.trim() || attachments.length > 0) && profile?.id) {
                        await ticketsApi.addComment(
                            activity.ticket_id,
                            `**Actividad Completada**\n\n${finalContent}`,
                            profile.id
                        )
                    }
                } catch (ticketError) {
                    if (import.meta.env.DEV) console.error('Error auto-resolving ticket:', ticketError)
                }
            }

            onUpdated()
            onClose()
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error updating activity status:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700'
            case 'in_progress': return 'bg-blue-100 text-blue-700'
            case 'overdue': return 'bg-red-100 text-red-700'
            default: return 'bg-slate-100 text-slate-700'
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={onClose} />

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="relative inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl sm:align-middle">
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-500" />
                            {showCompletionDialog ? 'Completar Actividad' : 'Detalles de la Actividad'}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6">
                        {showCompletionDialog ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    Estás a punto de marcar esta actividad como completada.
                                    Esto también resolverá el ticket asociado.
                                    ¿Deseas agregar algún mensaje o evidencia del proceso?
                                </p>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mensaje / Evidencia (Opcional)
                                    </label>

                                    {/* Attachments Preview */}
                                    {attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {attachments.map((file, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs font-medium bg-slate-50 text-slate-700 px-2 py-1 rounded border border-slate-200">
                                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachment(i)}
                                                        className="text-slate-400 hover:text-red-500"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="relative">
                                        <RichTextEditor
                                            value={completionMessage}
                                            onChange={setCompletionMessage}
                                            placeholder="Describe el trabajo realizado..."
                                            className="min-h-[150px] bg-white text-sm"
                                            s3Path={activity.ticket_id ? `tickets/${activity.ticket_id}/comments/${Date.now()}` : undefined}
                                        />

                                        {/* Attachment Button */}
                                        <div className="absolute bottom-2 right-2 z-20">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                className="hidden"
                                                multiple
                                            />
                                            <button
                                                type="button"
                                                className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors bg-white shadow-sm border border-slate-100"
                                                onClick={() => fileInputRef.current?.click()}
                                                title="Adjuntar evidencia"
                                            >
                                                <Paperclip size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end mt-4">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setShowCompletionDialog(false)}
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={() => handleStatusChange('completed')}
                                        isLoading={loading}
                                        style={{ backgroundColor: '#10B981', color: 'white' }}
                                    >
                                        Completar y Resolver
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)} uppercase`}>
                                            {activity.status.replace('_', ' ')}
                                        </span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full uppercase
                                            ${activity.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                                activity.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                                    activity.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-green-100 text-green-700'}`}>
                                            {activity.priority}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">{activity.title}</h2>
                                    <p className="text-gray-600 text-sm mb-4">
                                        {activity.plan_id ? 'Parte de un plan recurrente' : 'Actividad única'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                    <div>
                                        <p className="text-gray-500 mb-1">Fecha Programada</p>
                                        <p className="font-medium flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {format(new Date(activity.scheduled_date), 'dd MMMM yyyy', { locale: es })}
                                        </p>
                                    </div>
                                    {activity.due_date && (
                                        <div>
                                            <p className="text-gray-500 mb-1">Fecha Límite</p>
                                            <p className="font-medium text-red-600">
                                                {format(new Date(activity.due_date), 'dd MMMM yyyy', { locale: es })}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {activity.assignees && activity.assignees.length > 0 && (
                                    <div className="mb-6">
                                        <p className="text-sm text-gray-500 mb-2">Asignado a</p>
                                        <div className="flex flex-wrap gap-2">
                                            {activity.assignees.map((assignee: any) => (
                                                <div key={assignee.id} className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs overflow-hidden">
                                                        {assignee.avatar_url ? (
                                                            <img src={assignee.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-3 h-3 text-slate-500" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700">{assignee.full_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                                    {activity.status !== 'completed' && (
                                        <Button
                                            className="w-full justify-center"
                                            onClick={() => handleStatusChange('completed')}
                                            isLoading={loading}
                                            variant="primary"
                                            style={{ backgroundColor: '#10B981', color: 'white' }}
                                            icon={<CheckCircle className="w-4 h-4" />}
                                        >
                                            Marcar como Completada
                                        </Button>
                                    )}

                                    {activity.status === 'pending' && (
                                        <Button
                                            className="w-full justify-center"
                                            onClick={() => handleStatusChange('in_progress')}
                                            isLoading={loading}
                                            variant="secondary"
                                        >
                                            Iniciar (En Progreso)
                                        </Button>
                                    )}

                                    {activity.status === 'completed' && (
                                        <div className="space-y-3">
                                            <div className="text-center text-sm text-green-600 py-2 bg-green-50 rounded border border-green-100 flex items-center justify-center gap-2">
                                                <CheckCircle size={16} />
                                                Completada el {activity.completed_at ? format(new Date(activity.completed_at), 'dd/MM/yyyy HH:mm') : ''}
                                            </div>

                                            {activity.ticket_id && (
                                                <Link
                                                    to={`/tickets/${activity.ticket_id}`}
                                                    className="flex items-center justify-center gap-2 w-full p-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                                                >
                                                    <ExternalLink size={16} />
                                                    Ver Ticket Asociado
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
