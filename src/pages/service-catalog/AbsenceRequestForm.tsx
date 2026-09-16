import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Calendar, Clock, FileText, Paperclip, Activity, ArrowLeft, Loader2 } from 'lucide-react'
import { uploadFileToS3 } from '@/lib/uploads'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import type { AbsenceReason } from '@/types/database'
import { toast } from '@/hooks/use-toast'
import { listar, crear } from '@/lib/api'

export function AbsenceRequestForm() {
    const { tenant, primaryColor } = useTenant()
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        reason_id: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        description: ''
    })
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
    const [medicalFile, setMedicalFile] = useState<File | null>(null)

    const { data: reasons, isLoading: isLoadingReasons } = useQuery({
        queryKey: ['absence_reasons', tenant?.id],
        queryFn: async () => {
            if (!tenant) return []
            return listar<AbsenceReason>('absence_reasons', {
                filtros: { is_active: true },
                order: 'name',
            })
        },
        enabled: !!tenant
    })

    const uploadFile = async (file: File, folder: string) => {
        if (!tenant) return null
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `${tenant.id}/absences/${folder}/${fileName}`

        try {
            const url = await uploadFileToS3(file, filePath)
            return url
        } catch (uploadError) {
            throw uploadError
        }
    }

    const submitMutation = useMutation({
        mutationFn: async () => {
            if (!tenant || !profile) throw new Error('Missing tenant or profile')

            let evidence_url = null
            let medical_certificate_url = null

            if (evidenceFile) {
                evidence_url = await uploadFile(evidenceFile, 'evidence')
            }
            if (medicalFile) {
                medical_certificate_url = await uploadFile(medicalFile, 'medical')
            }

            await crear('absences', {
                requester_id: profile.id,
                reason_id: formData.reason_id,
                start_date: formData.start_date,
                start_time: formData.start_time,
                end_date: formData.end_date,
                end_time: formData.end_time,
                description: formData.description,
                evidence_url,
                medical_certificate_url,
                status: 'pending',
            })
        },
        onSuccess: () => {
            // Might want to navigate to a dashboard or success page
            toast({ title: 'Solicitud enviada', description: 'Solicitud de ausencia enviada correctamente.' })
            navigate('/service-catalog')
        },
        onError: (error) => {
            if (import.meta.env.DEV) console.error('Submission error', error)
            toast({ title: 'Error', description: 'Error al enviar la solicitud.', variant: 'destructive' })
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const textOnlyContent = formData.description.replace(/<[^>]*>?/gm, '').trim()
        if (!textOnlyContent) {
            toast({ title: 'Error', description: 'La descripción detallada es obligatoria.', variant: 'destructive' })
            return
        }
        submitMutation.mutate()
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/service-catalog')}
                    className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Solicitar Ausencia</h1>
                    <p className="text-slate-500 mt-1">Registra una nueva solicitud de ausencia o permiso</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card className="p-6 border border-slate-200 shadow-sm space-y-6">
                    {/* Reason */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-700">Motivo de la Ausencia <span className="text-red-500">*</span></label>
                        <select
                            required
                            value={formData.reason_id}
                            onChange={e => setFormData({ ...formData, reason_id: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="" disabled>Selecciona un motivo...</option>
                            {isLoadingReasons ? (
                                <option disabled>Cargando motivos...</option>
                            ) : (
                                reasons?.map(reason => (
                                    <option key={reason.id} value={reason.id}>{reason.name}</option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Dates and Times */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">Fecha de Inicio <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="date"
                                    required
                                    value={formData.start_date}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">Hora de Inicio <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="time"
                                    required
                                    value={formData.start_time}
                                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">Fecha de Culminación <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="date"
                                    required
                                    value={formData.end_date}
                                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">Hora de Finalización <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="time"
                                    required
                                    value={formData.end_time}
                                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="col-span-1 md:col-span-2 space-y-4 mt-2">
                        <label className="block text-sm font-medium text-slate-700">Descripción Detallada <span className="text-red-500">*</span></label>
                        <RichTextEditor
                            value={formData.description}
                            onChange={value => setFormData({ ...formData, description: value })}
                            placeholder="Describe brevemente el motivo de tu solicitud..."
                            minHeight="150px"
                        />
                    </div>

                    {/* File Uploads */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700">Evidencia (Opcional)</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                                    <input
                                        type="file"
                                        id="evidence-upload"
                                        className="hidden"
                                        onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                                    />
                                    <label htmlFor="evidence-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                        <Paperclip className="text-slate-400" size={24} />
                                        <span className="text-sm font-medium text-primary-600">
                                            {evidenceFile ? evidenceFile.name : 'Subir archivo'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700">Incapacidad Médica (Opcional)</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                                    <input
                                        type="file"
                                        id="medical-upload"
                                        className="hidden"
                                        onChange={(e) => setMedicalFile(e.target.files?.[0] || null)}
                                    />
                                    <label htmlFor="medical-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                        <Activity className="text-slate-400" size={24} />
                                        <span className="text-sm font-medium text-primary-600">
                                            {medicalFile ? medicalFile.name : 'Subir documento'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                </Card>

                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" type="button" onClick={() => navigate('/service-catalog')}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={submitMutation.isPending}
                        className="min-w-[140px]"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {submitMutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando</>
                        ) : (
                            'Enviar Solicitud'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
