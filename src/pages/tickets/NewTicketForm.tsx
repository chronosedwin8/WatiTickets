import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { ticketsApi, teamsApi, profilesApi, assetsApi, type Team, type Profile, type AssetWithRelations } from '@/lib/api'
import { uploadFileToS3 } from '@/lib/uploads'
import {
    ArrowLeft,
    ChevronDown,
    Save,
} from 'lucide-react'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { FileUploader } from '@/components/common/FileUploader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { TagSelector } from '@/components/ui/TagSelector'
import { EffortInput } from '@/components/ui/EffortInput'
import { DateTimeRangePicker } from '@/components/ui/DateTimeRangePicker'
import { priorityConfig, typeConfig } from './constants'
import type { ImpactLevel } from '@/types/database'
import { toast } from '@/hooks/use-toast'

export function NewTicketForm() {
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const { primaryColor, tenant } = useTenant()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState('medium')
    const [type, setType] = useState('incident')
    const [files, setFiles] = useState<File[]>([])

    // New SLA fields
    const [impactLevel, setImpactLevel] = useState<ImpactLevel>('medium')
    const [tags, setTags] = useState<string[]>([])
    const [plannedStart, setPlannedStart] = useState<Date | string | null>(null)
    const [plannedEnd, setPlannedEnd] = useState<Date | string | null>(null)
    const [plannedEffort, setPlannedEffort] = useState<number | null>(null)

    // Departments
    const [teams, setTeams] = useState<Team[]>([])
    const [selectedTeamId, setSelectedTeamId] = useState('')

    // Assets
    const [assets, setAssets] = useState<AssetWithRelations[]>([])
    const [selectedAssetId, setSelectedAssetId] = useState<string>('')

    // Additional state to ensure profile is loaded if useAuth doesn't provide it immediately
    const [userProfile, setUserProfile] = useState<Profile | null>(null)

    useEffect(() => {
        if (profile) {
            setUserProfile(profile)
        } else if (user?.id) {
            profilesApi.getById(user.id).then(setUserProfile).catch(err => { if (import.meta.env.DEV) console.error(err) })
        }
    }, [user?.id, profile])

    // Use profile from context or fetched profile
    const effectiveProfile = profile || userProfile
    const isStaff = ['admin', 'manager', 'agent', 'technician'].includes(effectiveProfile?.role || '')

    useEffect(() => {
        if (tenant?.id) {
            loadTeams()
            loadAssets()
        }
    }, [tenant?.id])

    const loadAssets = async () => {
        if (!tenant?.id) return
        try {
            const data = await assetsApi.getAll(tenant.id)
            setAssets(data)
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading assets', error)
        }
    }

    const loadTeams = async () => {
        if (!tenant?.id) return
        try {
            const data = await teamsApi.getAll(tenant.id)
            setTeams(data)
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading teams', error)
        }
    }


    const availableAssets = isStaff
        ? assets
        : assets.filter(a => a.assigned_user?.id === user?.id)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tenant?.id || !user?.id) return

        if (!selectedTeamId) {
            toast({ title: 'Error', description: 'Por favor selecciona el área o departamento destino.', variant: 'destructive' })
            return
        }

        try {
            setLoading(true)

            // Upload files first
            const uploadedAttachments = []
            if (files.length > 0) {
                for (const file of files) {
                    const timestamp = new Date().getTime()
                    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
                    const path = `tickets/attachments/${filename}`

                    try {
                        const url = await uploadFileToS3(file, path)
                        uploadedAttachments.push({
                            name: file.name,
                            url: url,
                            type: file.type,
                            size: file.size
                        })
                    } catch (uploadError) {
                        if (import.meta.env.DEV) console.error('Error uploading file', file.name, uploadError)
                        toast({ title: 'Error', description: `Error al subir el archivo ${file.name}. Intenta nuevamente.`, variant: 'destructive' })
                        return // Stop submission
                    }
                }
            }

            await ticketsApi.create({
                tenant_id: tenant.id,
                title,
                description,
                priority: priority as any,
                type: type as any,
                requester_id: user.id,
                team_id: selectedTeamId,
                status: 'new',
                source: 'portal',
                attachments: uploadedAttachments, // Save attachments metadata
                // New SLA fields
                impact_level: impactLevel,
                tags: tags.length > 0 ? tags : null,
                planned_start_at: plannedStart instanceof Date ? plannedStart.toISOString() : (plannedStart || null),
                planned_end_at: plannedEnd instanceof Date ? plannedEnd.toISOString() : (plannedEnd || null),
                planned_effort_minutes: plannedEffort || null,
                asset_id: selectedAssetId || null
            })
            navigate('/tickets')
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error creating ticket:', err)
            // alert('Error al crear el ticket')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-[800px] mx-auto">
            <div className="mb-6">
                <Link
                    to="/tickets"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Volver a Tickets
                </Link>
            </div>

            <Card className="p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 m-0">Nuevo Ticket</h1>
                    <p className="text-slate-500 mt-1">Describe tu solicitud detalladamente</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Título
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Problema con la impresora"
                            required
                            fullWidth
                            className="bg-slate-50 border-slate-200 focus:bg-white"
                        />
                    </div>

                    {/* Department Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Departamento / Área Destino
                        </label>
                        <div className="relative">
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                required
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            >
                                <option value="">-- Seleccionar --</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 ml-1">
                            Selecciona el área que debe atender tu solicitud.
                        </p>
                    </div>

                    {/* Asset Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Activo Asociado (Opcional)
                        </label>
                        <div className="relative">
                            <select
                                value={selectedAssetId}
                                onChange={(e) => setSelectedAssetId(e.target.value)}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            >
                                <option value="">-- Seleccionar un activo (opcional) --</option>
                                {availableAssets.map(asset => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name} {asset.asset_tag ? `(${asset.asset_tag})` : ''} - {asset.model}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 ml-1">
                            {isStaff ? 'Selecciona un activo relacionado (opcional).' : 'Selecciona un activo asignado a ti (sugerido si aplica).'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Descripción
                        </label>
                        <div className="min-h-[200px]">
                            <RichTextEditor
                                value={description}
                                onChange={setDescription}
                                placeholder="Detalla lo que está sucediendo... Puedes subir imágenes."
                                className="min-h-[200px]"
                                s3Path={`tickets/temp/${new Date().getTime()}`}
                            />
                        </div>
                    </div>

                    {/* Attachments */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Adjuntos
                        </label>
                        <FileUploader
                            files={files}
                            onFilesChange={setFiles}
                            maxSizeMB={20}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Tipo
                            </label>
                            <div className="relative">
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                >
                                    {Object.entries(typeConfig).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Prioridad
                            </label>
                            <div className="relative">
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                >
                                    {Object.entries(priorityConfig).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>
                    </div>

                    {/* SLA Fields - Only for staff */}
                    {isStaff && (
                        <>
                            <div className="h-px bg-slate-100 my-8" />

                            {/* Impact Level */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Nivel de Impacto
                                </label>
                                <div className="relative">
                                    <select
                                        value={impactLevel}
                                        onChange={(e) => setImpactLevel(e.target.value as ImpactLevel)}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="low">Bajo - Afecta a un solo usuario</option>
                                        <option value="medium">Medio - Afecta a varios usuarios</option>
                                        <option value="high">Alto - Afecta a un departamento</option>
                                        <option value="critical">Crítico - Afecta a toda la organización</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                </div>
                                <p className="text-xs text-slate-500 mt-1 ml-1">
                                    Indica cuántos usuarios o áreas se ven afectados.
                                </p>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Etiquetas (Opcional)
                                </label>
                                <TagSelector
                                    tags={tags}
                                    onChange={setTags}
                                    placeholder="Agregar etiquetas para categorizar..."
                                />
                                <p className="text-xs text-slate-500 mt-1 ml-1">
                                    Hasta 20 etiquetas para categorizar el ticket.
                                </p>
                            </div>

                            {/* Planned Dates */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Fechas Planificadas (Opcional)
                                </label>
                                <DateTimeRangePicker
                                    startDate={plannedStart}
                                    endDate={plannedEnd}
                                    onStartChange={setPlannedStart}
                                    onEndChange={setPlannedEnd}
                                />
                                <p className="text-xs text-slate-500 mt-1 ml-1">
                                    Si conoces las fechas aproximadas de resolución.
                                </p>
                            </div>

                            {/* Planned Effort */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Esfuerzo Estimado (Opcional)
                                </label>
                                <EffortInput
                                    value={plannedEffort}
                                    onChange={setPlannedEffort}
                                />
                                <p className="text-xs text-slate-500 mt-1 ml-1">
                                    Tiempo estimado para resolver el ticket.
                                </p>
                            </div>
                        </>
                    )}

                    <div className="h-px bg-slate-100 my-8" />

                    <div className="flex justify-end gap-3">
                        <Link to="/tickets">
                            <Button variant="secondary" type="button">
                                Cancelar
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            isLoading={loading}
                            icon={<Save size={18} />}
                            style={{ background: primaryColor }}
                            className="shadow-lg shadow-indigo-500/20"
                        >
                            Crear Ticket
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}


