/**
 * Pestaña de información técnica de un activo.
 *
 * Decide qué mostrar según el origen de los datos:
 *
 *   · Si el agente de inventario reportó el equipo, muestra el informe
 *     automático completo (procesador, discos, software instalado…).
 *   · Si no, muestra la ficha propia de su categoría, que se completa a mano.
 *     Es el caso de teléfonos, impresoras, equipos de red o UPS, que el
 *     agente no puede cubrir.
 *
 * Un equipo puede tener ambas: el informe automático y campos manuales que
 * el agente no conoce (número de línea, contrato, ubicación en el rack…).
 */
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Cpu, ClipboardList, RefreshCw, CircleAlert } from 'lucide-react'
import { TechnicalSpecs } from './TechnicalSpecs'
import { FichaTecnicaPorTipo } from './FichaTecnicaPorTipo'
import { deducirCategoria, obtenerCategoria } from './especificaciones'

interface Props {
    assetId: string
    /** Informe del agente de inventario, si lo hay. */
    hardwareInfo?: Record<string, unknown> | null
    /** Campos técnicos registrados a mano. */
    customFields?: Record<string, unknown> | null
    /** Categoría del tipo de activo asignado. */
    categoriaId?: string | null
    nombre?: string | null
    modelo?: string | null
    fabricante?: string | null
    /** Última vez que el agente reportó. */
    ultimoReporte?: string | null
    onCreateGroup?: (manufacturer: string, model: string) => void
    onGuardado?: (nuevos: Record<string, unknown>) => void
    editable?: boolean
}

type Vista = 'agente' | 'ficha'

/** ¿El informe del agente tiene contenido real? */
function tieneDatosDeAgente(info: unknown): boolean {
    if (!info || typeof info !== 'object') return false
    const obj = info as Record<string, unknown>
    // El agente siempre envía device_info y hardware. Un objeto vacío, o con
    // sólo claves sueltas, significa que nunca reportó.
    return Boolean(obj.device_info || obj.hardware || obj.software)
}

export function EspecificacionesTecnicas({
    assetId, hardwareInfo, customFields, categoriaId,
    nombre, modelo, fabricante, ultimoReporte,
    onCreateGroup, onGuardado, editable = true,
}: Props) {
    const hayAgente = tieneDatosDeAgente(hardwareInfo)
    const [vista, setVista] = useState<Vista>(hayAgente ? 'agente' : 'ficha')

    const categoria = obtenerCategoria(
        categoriaId ?? deducirCategoria(nombre, modelo, fabricante)
    )

    return (
        <div className="space-y-5">
            {/* ── Origen de los datos ─────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 no-print">
                <div className="flex items-center gap-3">
                    <div className={cn('rounded-lg p-2', hayAgente ? 'bg-emerald-50' : 'bg-slate-100')}>
                        {hayAgente
                            ? <RefreshCw className="h-5 w-5 text-emerald-600" />
                            : <ClipboardList className="h-5 w-5 text-slate-500" />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">
                            {hayAgente ? 'Reportado automáticamente' : 'Registro manual'}
                        </p>
                        <p className="text-xs text-slate-500">
                            {hayAgente ? (
                                ultimoReporte
                                    ? `Última lectura del agente: ${new Date(ultimoReporte).toLocaleString('es', {
                                        day: '2-digit', month: 'long', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}`
                                    : 'Datos enviados por el agente de inventario.'
                            ) : categoria?.admiteAgente ? (
                                'El agente de inventario aún no ha reportado este equipo.'
                            ) : categoria ? (
                                `Este tipo de equipo —${categoria.nombre.toLowerCase()}— no lo cubre el agente automático.`
                            ) : (
                                'Los datos de este equipo se registran a mano.'
                            )}
                        </p>
                    </div>
                </div>

                {/* Sólo se ofrece elegir vista si existen las dos */}
                {hayAgente && (
                    <div className="flex rounded-lg border border-slate-200 p-0.5">
                        <BotonVista activa={vista === 'agente'} onClick={() => setVista('agente')} icono={Cpu}>
                            Informe del agente
                        </BotonVista>
                        <BotonVista activa={vista === 'ficha'} onClick={() => setVista('ficha')} icono={ClipboardList}>
                            Ficha del tipo
                        </BotonVista>
                    </div>
                )}
            </div>

            {/* ── Aviso cuando el equipo dejó de reportar ─── */}
            {hayAgente && ultimoReporte && esAntiguo(ultimoReporte) && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 no-print">
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div className="text-sm">
                        <p className="font-medium text-slate-900">Este equipo lleva tiempo sin reportar</p>
                        <p className="mt-0.5 text-slate-600">
                            La información puede estar desactualizada. Comprueba que el agente siga
                            instalado y que la tarea programada se esté ejecutando.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Contenido ───────────────────────────────── */}
            {vista === 'agente' && hayAgente ? (
                <TechnicalSpecs data={hardwareInfo} onCreateGroup={onCreateGroup} />
            ) : (
                <FichaTecnicaPorTipo
                    assetId={assetId}
                    categoriaId={categoriaId}
                    nombre={nombre}
                    modelo={modelo}
                    fabricante={fabricante}
                    valores={customFields}
                    onGuardado={onGuardado}
                    editable={editable}
                />
            )}
        </div>
    )
}

function BotonVista({
    activa, onClick, icono: Icono, children,
}: {
    activa: boolean
    onClick: () => void
    icono: typeof Cpu
    children: React.ReactNode
}) {
    return (
        <button
            onClick={onClick}
            aria-pressed={activa}
            className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                activa ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            )}
        >
            <Icono size={14} />
            {children}
        </button>
    )
}

/** Un equipo que no reporta en 30 días probablemente perdió el agente. */
function esAntiguo(fecha: string): boolean {
    const dias = (Date.now() - new Date(fecha).getTime()) / 86_400_000
    return Number.isFinite(dias) && dias > 30
}

export default EspecificacionesTecnicas
