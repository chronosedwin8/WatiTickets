import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { assetsApi, assetGroupsApi, type AssetWithRelations, listar } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import {
    MapPin,
    AlertTriangle,
    Loader2,
    ChevronRight,
    ArrowLeft,
    User,
    History,
    Edit,
    Trash2,
    Building,
    Calendar,
    Shield,
    FileText,
    Cpu,
    Monitor,
    HardDrive,
    Layers,
    Server as CustomServerIcon,
    QrCode,
    X,
    Download,
    TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { statusConfig } from './constants'
import { TechnicalSpecs } from './TechnicalSpecs'
import { EspecificacionesTecnicas } from './EspecificacionesTecnicas'
import { toast } from '@/hooks/use-toast'

// Helper to map technical fields to human readable labels
const fieldMapping: Record<string, string> = {
    'name': 'Nombre',
    'serial_number': 'Número de Serie',
    'asset_tag': 'Etiqueta de Activo',
    'status': 'Estado',
    'model': 'Modelo',
    'manufacturer': 'Fabricante',
    'location_id': 'Ubicación',
    'assigned_user_id': 'Usuario Asignado',
    'asset_group_id': 'Grupo de Activos',
    'purchase_cost': 'Costo de Compra',
    'purchase_date': 'Fecha de Compra',
    'warranty_expiry': 'Vencimiento de Garantía',
    'notes': 'Notas',
    // Hardware Info Mappings
    'hardware_info.os_details': 'Sistema Operativo',
    'hardware_info.device_name': 'Nombre del Dispositivo',
    'hardware_info.ram.total_installed': 'Memoria RAM Total',
    'hardware_info.cpu.name': 'Procesador',
    'hardware_info.last_logged_user': 'Último Usuario Logueado',
    'hardware_info.last_reboot': 'Último Reinicio',
    'hardware_info.public_ip': 'IP Pública',
    'hardware_info.private_ip': 'IP Privada'
}

const formatFieldName = (path: string): string => {
    if (fieldMapping[path]) return fieldMapping[path]

    // Fallback for array indices or unknown fields
    return path
        .replace('hardware_info.', '')
        .replace(/_/g, ' ')
        .replace(/\./g, ' > ')
        .replace(/\b\w/g, l => l.toUpperCase())
}

const formatValue = (value: any, path: string): string => {
    if (value === null || value === undefined) return 'Vacío'
    if (typeof value === 'boolean') return value ? 'Sí' : 'No'

    if (path.includes('cost')) return `$${Number(value).toLocaleString()}`

    if (path.includes('date') || path.includes('expiry') || path.includes('reboot') || path.includes('created_at')) {
        const date = new Date(value)
        return isNaN(date.getTime()) ? String(value) : date.toLocaleString()
    }

    if (path === 'status') {
        const status = statusConfig[value as keyof typeof statusConfig]
        return status ? status.label : value
    }

    // Truncate long strings/objects
    const str = String(value)
    if (str.length > 50) return str.substring(0, 50) + '...'

    return str
}

// Helper to calculate deep differences between objects
const getDeepDiff = (obj1: any, obj2: any, path = ''): { path: string; from: any; to: any }[] => {
    const diffs: { path: string; from: any; to: any }[] = []

    // If one is null/undefined and other isn't
    if (!obj1 && obj2) {
        return [{ path, from: '(vacío)', to: typeof obj2 === 'object' ? 'Registrado' : formatValue(obj2, path) }]
    }
    if (obj1 && !obj2) {
        return [{ path, from: typeof obj1 === 'object' ? 'Registrado' : formatValue(obj1, path), to: '(vacío)' }]
    }

    // If both are primitives
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
        if (obj1 !== obj2) {
            return [{ path, from: formatValue(obj1, path), to: formatValue(obj2, path) }]
        }
        return []
    }

    // Both are objects, iterate keys
    const keys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]))

    keys.forEach(key => {
        const newPath = path ? `${path}.${key}` : key

        // Skip ignored fields or internal metadata
        if (['updated_at', 'created_at', 'id', 'tenant_id'].includes(key)) return

        // Skip detailed hardware arrays that generate too much noise (like partition details changing slightly)
        if (path.includes('hardware_info') && (key === 'partitions' || key === 'modules' || key === 'adapters')) return

        const val1 = obj1[key]
        const val2 = obj2[key]

        // Recursive check
        const childDiffs = getDeepDiff(val1, val2, newPath)
        diffs.push(...childDiffs)
    })

    return diffs
}

// ── 11.1 Insurance helpers ──────────────────────────────────────────────────
function getInsuranceStatus(insuranceExpiry: string | null | undefined): {
    type: 'expired' | 'warning' | 'ok' | 'none'
    daysLeft: number
} {
    if (!insuranceExpiry) return { type: 'none', daysLeft: 0 }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(insuranceExpiry)
    expiry.setHours(0, 0, 0, 0)
    const diffMs = expiry.getTime() - today.getTime()
    const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { type: 'expired', daysLeft }
    if (daysLeft <= 30) return { type: 'warning', daysLeft }
    return { type: 'ok', daysLeft }
}

// ── 11.2 Depreciation helpers ────────────────────────────────────────────────
const USEFUL_LIFE_YEARS = 5

function calculateDepreciation(purchaseCost: number | null | undefined, purchaseDate: string | null | undefined) {
    if (!purchaseCost || !purchaseDate) return null
    const bought = new Date(purchaseDate)
    const now = new Date()
    const totalMonths = USEFUL_LIFE_YEARS * 12
    const elapsedMs = now.getTime() - bought.getTime()
    const elapsedMonths = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24 * 30.44))
    const deprecPct = Math.min(100, (elapsedMonths / totalMonths) * 100)
    const currentValue = Math.max(0, purchaseCost * (1 - deprecPct / 100))
    const remainingMonths = Math.max(0, totalMonths - elapsedMonths)
    return {
        currentValue: Math.round(currentValue),
        deprecPct: Math.round(deprecPct),
        remainingMonths: Math.round(remainingMonths),
    }
}

export function AssetDetail() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [asset, setAsset] = useState<AssetWithRelations | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // La pestaña vive en la URL: así se puede compartir un enlace directo a
    // la ficha técnica o al historial de un equipo.
    const [searchParams, setSearchParams] = useSearchParams()
    const tabParam = searchParams.get('tab')
    const activeTab: 'details' | 'specs' | 'history' =
        tabParam === 'specs' || tabParam === 'history' ? tabParam : 'details'

    const setActiveTab = (tab: 'details' | 'specs' | 'history') => {
        const params = new URLSearchParams(searchParams)
        if (tab === 'details') params.delete('tab')
        else params.set('tab', tab)
        setSearchParams(params, { replace: true })
    }
    const [history, setHistory] = useState<any[]>([])
    const [selectedHistory, setSelectedHistory] = useState<any | null>(null)
    const [loadingHistory, setLoadingHistory] = useState(false)

    // ── 11.4 QR state ──────────────────────────────────────────────────────────
    const [showQrModal, setShowQrModal] = useState(false)

    const handleCreateGroup = async (manufacturer: string, model: string) => {
        try {
            if (!asset || !asset.tenant_id) return

            setLoading(true)
            const groupName = `${manufacturer} - ${model}`

            // 1. Get all asset groups or check if exists
            const groups = await assetGroupsApi.getAll()
            let group = groups.find((g: any) => g.name === groupName)
            let groupId = ''

            if (group) {
                groupId = group.id
            } else {
                const newGroup = await assetGroupsApi.create({ name: groupName, description: 'Agrupación automática por hardware' })
                groupId = groupId || newGroup.id
            }

            // 2. Find all assets matching
            const matchingAssets = await listar<{
                id: string
                hardware_info: unknown
                manufacturer: string | null
                model: string | null
            }>('assets', { limit: 1000 })

            let count = 0

            const normalize = (str: any) => String(str || '').toLowerCase().trim()
            const normTargetMfg = normalize(manufacturer)
            const normTargetModel = normalize(model)

            if (matchingAssets) {
                for (const a of matchingAssets) {
                    let hwInfo = a.hardware_info as any
                    if (typeof hwInfo === 'string') {
                        try { hwInfo = JSON.parse(hwInfo) } catch (e) { }
                    }

                    const mfg1 = normalize(hwInfo?.hardware?.motherboard?.manufacturer)
                    const mfg2 = normalize(a.manufacturer)

                    const mod1 = normalize(hwInfo?.hardware?.motherboard?.model)
                    const mod2 = normalize(a.model)

                    if ((mfg1 === normTargetMfg || mfg2 === normTargetMfg) &&
                        (mod1 === normTargetModel || mod2 === normTargetModel)) {

                        await assetsApi.update(a.id, { asset_group_id: groupId } as any)
                        count++
                    }
                }
            }

            toast({ title: 'Grupo procesado', description: `Grupo "${groupName}" procesado. Se han agrupado ${count} equipo(s).` })

            // Refresh
            if (id) {
                const data = await assetsApi.getById(id)
                setAsset(data)
            }
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al agrupar equipos: ' + (err.message || ''), variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!id) return
        const fetchAsset = async () => {
            try {
                setLoading(true)
                const data = await assetsApi.getById(id)
                setAsset(data)
            } catch (err) {
                if (import.meta.env.DEV) console.error(err)
                setError('Error al cargar el activo')
            } finally {
                setLoading(false)
            }
        }
        fetchAsset()
    }, [id])

    useEffect(() => {
        if (!id || activeTab !== 'history') return
        const fetchHistory = async () => {
            try {
                setLoadingHistory(true)
                const data = await assetsApi.getHistory(id)
                setHistory(data || [])
            } catch (err) {
                if (import.meta.env.DEV) console.error(err)
            } finally {
                setLoadingHistory(false)
            }
        }
        fetchHistory()
    }, [id, activeTab])

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este activo? Esta acción no se puede deshacer.')) return
        try {
            if (id) {
                await assetsApi.delete(id)
                navigate('/assets')
            }
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            const message = err.message || 'Error desconocido'

            // Allow deletion even if linked, but warn about side effects or remaining links if hard constraints exist
            // With new DB rules, history cascades and work orders set null, so this should just work.
            // But we keep the catch for other potential issues.
            toast({ title: 'Error', description: `Error al eliminar el activo: ${message}`, variant: 'destructive' })
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
        )
    }

    if (error || !asset) {
        return (
            <Card className="p-10 text-center max-w-lg mx-auto mt-10">
                <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Error</h3>
                <p className="text-slate-500 mb-6">{error || 'Activo no encontrado'}</p>
                <Button onClick={() => navigate('/assets')} variant="primary">
                    Volver a Activos
                </Button>
            </Card>
        )
    }

    const status = statusConfig[asset.status] || statusConfig.in_stock
    const StatusIcon = status.icon

    // ── 11.1 Insurance banner data ────────────────────────────────────────────
    const insuranceStatus = getInsuranceStatus(asset.insurance_expiry)

    // ── 11.2 Depreciation data ────────────────────────────────────────────────
    const depreciation = calculateDepreciation(asset.purchase_cost, asset.purchase_date)

    // ── 11.4 QR URL ───────────────────────────────────────────────────────────
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(asset.id)}`

    return (
        <div className={`mx-auto ${activeTab === 'history' ? 'max-w-[1600px] px-6' : 'max-w-5xl'}`}>

            {/* ── 11.1 Insurance Alert Banners ── */}
            {asset.has_insurance && insuranceStatus.type === 'expired' && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    <span className="text-base">🔴</span>
                    <span className="text-sm font-medium">
                        El seguro de este activo venció hace {Math.abs(insuranceStatus.daysLeft)} día{Math.abs(insuranceStatus.daysLeft) !== 1 ? 's' : ''}{' '}
                        ({new Date(asset.insurance_expiry!).toLocaleDateString()})
                    </span>
                </div>
            )}
            {asset.has_insurance && insuranceStatus.type === 'warning' && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
                    <span className="text-base">⚠️</span>
                    <span className="text-sm font-medium">
                        El seguro de este activo vence el {new Date(asset.insurance_expiry!).toLocaleDateString()}{' '}
                        (en {insuranceStatus.daysLeft} día{insuranceStatus.daysLeft !== 1 ? 's' : ''})
                    </span>
                </div>
            )}

            {/* ── 11.4 QR Modal ── */}
            {showQrModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setShowQrModal(false)}
                >
                    <div
                        className="relative w-80 rounded-2xl bg-white p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <h3 className="mb-1 text-base font-bold text-slate-900">Código QR del Activo</h3>
                        <p className="mb-4 text-xs text-slate-500 font-mono break-all">{asset.id}</p>
                        <div className="flex justify-center mb-4">
                            <img
                                src={qrUrl}
                                alt={`QR ${asset.name}`}
                                className="rounded-lg border border-slate-200"
                                width={200}
                                height={200}
                            />
                        </div>
                        <a
                            href={qrUrl}
                            download={`qr-${asset.asset_tag || asset.id}.png`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                        >
                            <Download size={16} />
                            Descargar QR
                        </a>
                    </div>
                </div>
            )}

            <div className="mb-6 flex items-center justify-between">
                <Link
                    to="/assets"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Volver a Activos
                </Link>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setShowQrModal(true)}
                        icon={<QrCode size={16} />}
                    >
                        Generar QR
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => navigate(`/assets/${id}/edit`)}
                        icon={<Edit size={16} />}
                    >
                        Editar
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDelete}
                        icon={<Trash2 size={16} />}
                    >
                        Eliminar
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
                <div className="flex flex-col gap-6">
                    {/* Tabs Navigation */}
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'details'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab('specs')}
                            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'specs'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Información Técnica
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'history'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Historial
                        </button>
                    </div>

                    {activeTab === 'history' ? (
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
                            {/* Master List */}
                            <Card className="p-0 overflow-hidden h-[600px] flex flex-col">
                                <div className="p-4 border-b border-slate-100 bg-slate-50">
                                    <h3 className="font-semibold text-slate-700">Versiones</h3>
                                </div>
                                <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                                    {loadingHistory ? (
                                        <div className="p-8 text-center">
                                            <Loader2 size={24} className="animate-spin text-indigo-600 mx-auto" />
                                        </div>
                                    ) : history.length > 0 ? (
                                        history.map((record, index) => {
                                            const isSelected = selectedHistory?.id === record.id;
                                            return (
                                                <div
                                                    key={record.id}
                                                    onClick={() => setSelectedHistory(record)}
                                                    className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${record.change_type === 'INSERT' ? 'bg-green-100 text-green-600' :
                                                            record.change_type === 'UPDATE' ? 'bg-blue-100 text-blue-600' :
                                                                'bg-red-100 text-red-600'
                                                            }`}>
                                                            {record.change_type === 'INSERT' ? <FileText size={14} /> :
                                                                record.change_type === 'UPDATE' ? <Edit size={14} /> :
                                                                    <Trash2 size={14} />}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-900">
                                                                {record.change_type === 'INSERT' ? 'Creado' :
                                                                    record.change_type === 'UPDATE' ? 'Actualizado' :
                                                                        'Eliminado'}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {formatRelativeTime(new Date(record.created_at))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 text-xs text-slate-500 pl-11">
                                                        por {record.changed_by_user?.full_name || 'Sistema'}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="p-8 text-center text-slate-400 text-sm">
                                            No hay historial registrado
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Detail View */}
                            <Card className="p-0 overflow-hidden h-[600px] flex flex-col">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <h3 className="font-semibold text-slate-700">Detalle del Registro</h3>
                                    {selectedHistory && (
                                        <Badge variant="outline" className="font-mono">
                                            {new Date(selectedHistory.created_at).toLocaleString()}
                                        </Badge>
                                    )}
                                </div>
                                <div className="overflow-y-auto flex-1 p-6">
                                    {selectedHistory ? (
                                        <div className="space-y-6">
                                            {/* Changes Summary */}
                                            {selectedHistory.change_type === 'UPDATE' && selectedHistory.old_values && selectedHistory.new_values && (
                                                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                                    <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 font-medium text-xs text-slate-500 uppercase tracking-wider">
                                                        Cambios Realizados
                                                    </div>
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-white border-b border-slate-100">
                                                            <tr>
                                                                <th className="p-3 font-semibold text-slate-600 w-1/3">Campo</th>
                                                                <th className="p-3 font-semibold text-slate-600 w-1/3">Anterior</th>
                                                                <th className="p-3 font-semibold text-slate-600 w-1/3">Nuevo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 bg-white">
                                                            {getDeepDiff(selectedHistory.old_values, selectedHistory.new_values).map((change, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50">
                                                                    <td className="p-3 font-medium text-slate-700">{formatFieldName(change.path)}</td>
                                                                    <td className="p-3 text-red-600 break-all font-mono text-xs bg-red-50/30">{String(change.from)}</td>
                                                                    <td className="p-3 text-green-600 break-all font-mono text-xs bg-green-50/30">{String(change.to)}</td>
                                                                </tr>
                                                            ))}
                                                            {getDeepDiff(selectedHistory.old_values, selectedHistory.new_values).length === 0 && (
                                                                <tr>
                                                                    <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                                                                        Actualización interna (metadatos o campos ocultos)
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* Snapshot Data */}
                                            <div>
                                                <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                                                    <CustomServerIcon size={16} className="text-slate-400" />
                                                    Estado del Activo (al momento del registro)
                                                </h4>

                                                {/* Use TechnicalSpecs component to show the state */}
                                                {(selectedHistory.new_values?.hardware_info || selectedHistory.old_values?.hardware_info) ? (
                                                    <TechnicalSpecs data={selectedHistory.new_values?.hardware_info || selectedHistory.old_values?.hardware_info} />
                                                ) : (
                                                    <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center text-slate-500">
                                                        No hay información técnica detallada disponible en este registro.
                                                    </div>
                                                )}

                                                {/* General Info Snapshot if available */}
                                                <div className="mt-4 grid grid-cols-2 gap-4">
                                                    <div className="p-3 bg-slate-50 rounded border border-slate-100">
                                                        <span className="block text-xs text-slate-500 uppercase">Estado</span>
                                                        <span className="font-medium text-slate-700">
                                                            {(selectedHistory.new_values?.status || selectedHistory.old_values?.status) ?
                                                                (statusConfig[selectedHistory.new_values?.status || selectedHistory.old_values?.status]?.label || selectedHistory.new_values?.status)
                                                                : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 rounded border border-slate-100">
                                                        <span className="block text-xs text-slate-500 uppercase">Ubicación</span>
                                                        <span className="font-medium text-slate-700">
                                                            {/* Location ID is usually stored, verifying if name is available caused complexity, skipping for now */}
                                                            ID: {selectedHistory.new_values?.location_id || selectedHistory.old_values?.location_id || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <History size={48} className="mb-4 opacity-20" />
                                            <p>Selecciona una versión del historial <br /> para ver los detalles</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    ) : activeTab === 'details' ? (
                        <>
                            {/* Header Card */}
                            <Card className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-xs font-mono font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded">
                                        {asset.asset_tag || 'SIN-TAG'}
                                    </span>
                                    <Badge variant={status.variant}>
                                        <StatusIcon size={12} className="mr-1" />
                                        {status.label}
                                    </Badge>
                                </div>

                                <h1 className="text-2xl font-bold text-slate-900 m-0 mb-3">
                                    {asset.name}
                                </h1>
                                <p className="text-base text-slate-500 mb-6">
                                    {asset.manufacturer} {asset.model} - S/N: {asset.serial_number || 'N/A'}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                                            <MapPin size={16} className="text-slate-400" />
                                            <div>
                                                <div>{asset.location?.name || 'No asignada'}</div>
                                                {(asset.building || asset.floor || asset.office) && (
                                                    <div className="text-xs text-slate-500 font-normal">
                                                        {[asset.building, asset.floor, asset.office].filter(Boolean).join(' • ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-700 font-medium h-full">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Asignado a</label>
                                                <div className="flex items-center gap-2">
                                                    <User size={16} className="text-slate-400" />
                                                    {asset.assigned_user?.full_name || 'Sin asignar'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-700 font-medium h-full">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Grupo</label>
                                                <div className="flex items-center gap-2">
                                                    <Layers size={16} className="text-slate-400" />
                                                    {asset.asset_group ? (
                                                        <Link to={`/assets/groups/${asset.asset_group.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                                                            {asset.asset_group.name}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-slate-400 font-normal italic">Sin grupo</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-slate-700 font-medium h-full">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Departamento</label>
                                                <div className="flex items-center gap-2">
                                                    <Building size={16} className="text-slate-400" />
                                                    {(asset as any).department_team ? (
                                                        <span className="text-indigo-600 font-medium">{(asset as any).department_team.name}</span>
                                                    ) : (
                                                        <span className="text-slate-400 font-normal italic">Sin departamento</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* NEW: Custom Fields Section in General Tab */}
                                {asset.custom_fields && Object.keys(asset.custom_fields).length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-900 mb-4">Campos Personalizados</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {Object.entries(asset.custom_fields).map(([key, value]) => {
                                                if (['hardware', 'software', 'security', 'device_info', 'licenses'].includes(key)) return null;
                                                return (
                                                    <div key={key} className="bg-slate-50 p-3 rounded border border-slate-100">
                                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">{key}</div>
                                                        <div className="text-sm font-medium text-slate-800">{String(value)}</div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Recent Work Orders */}
                            <Card>
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                                    <h3 className="text-sm font-bold text-slate-900 m-0">Órdenes de Trabajo Recientes</h3>
                                </div>
                                <div>
                                    {asset.work_orders && asset.work_orders.length > 0 ? (
                                        <div className="flex flex-col">
                                            {asset.work_orders.map((wo, i) => (
                                                <Link
                                                    key={wo.id}
                                                    to={`/work-orders/${wo.id}`}
                                                    className="flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-semibold text-slate-900 text-sm">{wo.title}</div>
                                                        <div className="text-xs text-slate-500 mt-1">#{wo.number} • {formatRelativeTime(new Date(wo.created_at))}</div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300" />
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-slate-400 text-sm">
                                            No hay órdenes de trabajo registradas
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Recent Tickets */}
                            <Card>
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                                    <h3 className="text-sm font-bold text-slate-900 m-0">Tickets Asociados</h3>
                                </div>
                                <div>
                                    {asset.tickets && asset.tickets.length > 0 ? (
                                        <div className="flex flex-col">
                                            {asset.tickets.map((ticket, i) => (
                                                <Link
                                                    key={ticket.id}
                                                    to={`/tickets/${ticket.id}`}
                                                    className="flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-semibold text-slate-900 text-sm">{ticket.title}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-mono font-bold text-slate-500">#{ticket.number}</span>
                                                            <span className="text-xs text-slate-400">• {formatRelativeTime(new Date(ticket.created_at))}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant={ticket.status === 'open' || ticket.status === 'new' ? 'primary' : ticket.status === 'resolved' || ticket.status === 'closed' ? 'success' : 'neutral'} className="text-[10px] uppercase">
                                                            {ticket.status}
                                                        </Badge>
                                                        <ChevronRight size={16} className="text-slate-300" />
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-slate-400 text-sm">
                                            No hay tickets registrados
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </>
                    ) : (
                        <EspecificacionesTecnicas
                            assetId={asset.id}
                            hardwareInfo={asset.hardware_info as Record<string, unknown> | null}
                            customFields={asset.custom_fields as Record<string, unknown> | null}
                            categoriaId={asset.type?.ficha_tecnica ?? null}
                            nombre={asset.name}
                            modelo={asset.model}
                            fabricante={asset.manufacturer}
                            ultimoReporte={(asset as any).last_seen_at ?? null}
                            onCreateGroup={handleCreateGroup}
                            onGuardado={(nuevos) =>
                                setAsset(prev => prev ? { ...prev, custom_fields: nuevos as any } : prev)
                            }
                        />
                    )}
                </div>

                {/* Side Info */}
                <div className="flex flex-col gap-6">
                    {/* ── 11.2 Depreciation Card ── */}
                    <Card className="p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <TrendingDown size={16} className="text-slate-400" />
                            Depreciación
                        </h3>
                        {depreciation ? (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Valor actual</span>
                                    <span className="font-bold text-slate-800">${depreciation.currentValue.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Depreciado</span>
                                    <span className="font-semibold text-orange-600">{depreciation.deprecPct}%</span>
                                </div>
                                <Progress
                                    value={depreciation.deprecPct}
                                    className="h-2"
                                    indicatorClassName={depreciation.deprecPct >= 100 ? 'bg-red-500' : depreciation.deprecPct >= 75 ? 'bg-orange-500' : 'bg-indigo-500'}
                                />
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Vida útil restante</span>
                                    <span>
                                        {depreciation.remainingMonths > 0
                                            ? `${depreciation.remainingMonths} mes${depreciation.remainingMonths !== 1 ? 'es' : ''}`
                                            : 'Vida útil agotada'}
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-400 italic">
                                    Depreciación lineal a {USEFUL_LIFE_YEARS} años
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Sin datos de depreciación</p>
                        )}
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-4">Detalles Financieros</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de Compra</label>
                                <div className="text-sm font-medium text-slate-700">
                                    {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'No registrada'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Costo</label>
                                <div className="text-sm font-bold text-emerald-600">
                                    {asset.purchase_cost ? `$${asset.purchase_cost.toLocaleString()}` : '-'}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Shield size={16} className="text-slate-400" />
                            Seguro y Garantía
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-medium text-slate-500">Asegurado</label>
                                    <Badge variant={asset.has_insurance ? 'success' : 'neutral'}>
                                        {asset.has_insurance ? 'Sí' : 'No'}
                                    </Badge>
                                </div>
                                {asset.has_insurance && (
                                    <>
                                        <div className="text-sm font-medium text-slate-700 mt-2">
                                            {asset.insurer_name || 'Aseguradora no espec.'}
                                        </div>
                                        {asset.insurance_expiry && (
                                            <div className="text-xs text-slate-500 mt-1">
                                                Vence: {new Date(asset.insurance_expiry).toLocaleDateString()}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="pt-3 border-t border-slate-100">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Garantía</label>
                                <div className="text-sm font-medium text-slate-700">
                                    {asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : 'No registrada'}
                                </div>
                                {asset.vendor_name && (
                                    <div className="text-xs text-slate-500 mt-1">
                                        Vendor: {asset.vendor_name}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div >
    )
}
