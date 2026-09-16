/**
 * Ficha técnica adaptada al tipo de activo.
 *
 * Para los equipos que el agente automático no cubre —teléfonos, impresoras,
 * equipos de red, UPS…— muestra los campos que sí tienen sentido para su
 * categoría y permite completarlos a mano.
 */
import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/hooks/use-toast'
import { assetsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Pencil, Save, X, Check, Info, Sparkles } from 'lucide-react'
import {
    CATEGORIAS, obtenerCategoria, deducirCategoria, calcularCompletitud,
    formatearValor, type CampoTecnico, type CategoriaActivo,
} from './especificaciones'

interface Props {
    assetId: string
    /** Categoría del tipo asignado al activo, si lo tiene. */
    categoriaId?: string | null
    /** Nombre y modelo, para deducir la categoría cuando no hay tipo. */
    nombre?: string | null
    modelo?: string | null
    fabricante?: string | null
    /** Valores guardados en assets.custom_fields */
    valores?: Record<string, unknown> | null
    /** Se llama tras guardar, para que la vista superior recargue. */
    onGuardado?: (nuevos: Record<string, unknown>) => void
    /** Si el usuario puede editar la ficha. */
    editable?: boolean
}

export function FichaTecnicaPorTipo({
    assetId, categoriaId, nombre, modelo, fabricante,
    valores, onGuardado, editable = true,
}: Props) {
    const [editando, setEditando] = useState(false)
    const [guardando, setGuardando] = useState(false)
    const [borrador, setBorrador] = useState<Record<string, unknown>>({})
    const [categoriaElegida, setCategoriaElegida] = useState<string | null>(null)

    const valoresActuales = useMemo(() => valores ?? {}, [valores])

    // La categoría viene del tipo asignado; si no hay, se deduce del nombre.
    const deducida = useMemo(
        () => deducirCategoria(nombre, modelo, fabricante),
        [nombre, modelo, fabricante]
    )
    const esDeducida = !categoriaId
    const idActivo = categoriaElegida ?? categoriaId ?? deducida
    const categoria = obtenerCategoria(idActivo)

    const completitud = useMemo(
        () => calcularCompletitud(idActivo, valoresActuales),
        [idActivo, valoresActuales]
    )

    if (!categoria) {
        return (
            <Card className="p-8 text-center text-slate-500">
                No hay una ficha técnica definida para este tipo de activo.
            </Card>
        )
    }

    const comenzarEdicion = () => {
        setBorrador({ ...valoresActuales })
        setEditando(true)
    }

    const cancelar = () => {
        setBorrador({})
        setEditando(false)
    }

    const guardar = async () => {
        setGuardando(true)
        try {
            // Se guardan sólo los campos con contenido, para no llenar la
            // base de cadenas vacías.
            const limpio: Record<string, unknown> = {}
            for (const [clave, valor] of Object.entries(borrador)) {
                if (valor === '' || valor === undefined || valor === null) continue
                limpio[clave] = valor
            }

            await assetsApi.update(assetId, { custom_fields: limpio as any })

            toast({
                title: 'Ficha técnica guardada',
                description: 'La información del equipo quedó registrada.',
            })

            onGuardado?.(limpio)
            setEditando(false)
        } catch (err) {
            toast({
                title: 'No se pudo guardar',
                description: err instanceof Error ? err.message : 'Inténtalo de nuevo.',
                variant: 'destructive',
            })
        } finally {
            setGuardando(false)
        }
    }

    const Icono = categoria.icono

    return (
        <div className="space-y-5">
            {/* ── Cabecera ────────────────────────────────── */}
            <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="rounded-xl bg-indigo-50 p-3">
                            <Icono className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-slate-900">{categoria.nombre}</h3>
                                {esDeducida && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                        <Sparkles className="h-3 w-3" />
                                        Tipo sugerido
                                    </span>
                                )}
                            </div>
                            <p className="mt-0.5 text-sm text-slate-500">{categoria.descripcion}</p>

                            {esDeducida && (
                                <p className="mt-2 max-w-lg text-xs leading-relaxed text-amber-700">
                                    Este activo no tiene un tipo asignado. Se dedujo por su nombre para
                                    poder mostrarte una ficha útil. Asígnale el tipo correcto al editarlo
                                    para que quede fijo.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Progreso de la ficha */}
                        <div className="text-right">
                            <div className="font-mono text-sm font-bold text-slate-900">
                                {completitud.completos}/{completitud.total}
                            </div>
                            <div className="text-[11px] text-slate-500">campos completos</div>
                            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={cn(
                                        'h-full rounded-full transition-all',
                                        completitud.porcentaje >= 70 ? 'bg-emerald-500'
                                            : completitud.porcentaje >= 30 ? 'bg-amber-500'
                                                : 'bg-slate-300'
                                    )}
                                    style={{ width: `${completitud.porcentaje}%` }}
                                />
                            </div>
                        </div>

                        {editable && !editando && (
                            <Button variant="outline" size="sm" onClick={comenzarEdicion} icon={<Pencil size={15} />}>
                                Completar ficha
                            </Button>
                        )}
                    </div>
                </div>

                {/* Selector de categoría mientras se edita una deducida */}
                {editando && esDeducida && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <label htmlFor="categoria" className="mb-1.5 block text-sm font-medium text-slate-700">
                            ¿Qué tipo de activo es?
                        </label>
                        <select
                            id="categoria"
                            value={idActivo}
                            onChange={(e) => setCategoriaElegida(e.target.value)}
                            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {CATEGORIAS.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-slate-500">
                            Al cambiarlo se muestran los campos propios de ese tipo.
                        </p>
                    </div>
                )}
            </Card>

            {/* ── Grupos de campos ────────────────────────── */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {categoria.grupos.map((grupo) => {
                    const IconoGrupo = grupo.icono
                    return (
                        <Card key={grupo.titulo} className="p-5">
                            <div className="mb-4 flex items-center gap-2 text-indigo-600">
                                <IconoGrupo size={18} />
                                <h4 className="m-0 text-xs font-bold uppercase tracking-wide text-slate-900">
                                    {grupo.titulo}
                                </h4>
                            </div>

                            <dl className="space-y-4">
                                {grupo.campos.map((campo) => (
                                    <CampoFicha
                                        key={campo.clave}
                                        campo={campo}
                                        valor={editando ? borrador[campo.clave] : valoresActuales[campo.clave]}
                                        editando={editando}
                                        onChange={(v) => setBorrador((prev) => ({ ...prev, [campo.clave]: v }))}
                                    />
                                ))}
                            </dl>
                        </Card>
                    )
                })}
            </div>

            {/* ── Acciones de edición ─────────────────────── */}
            {editando && (
                <div className="sticky bottom-4 flex justify-end gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                    <Button variant="ghost" onClick={cancelar} icon={<X size={16} />}>
                        Cancelar
                    </Button>
                    <Button onClick={guardar} isLoading={guardando} icon={<Save size={16} />}>
                        Guardar ficha técnica
                    </Button>
                </div>
            )}

            {/* ── Ayuda cuando la ficha está vacía ────────── */}
            {!editando && completitud.completos === 0 && (
                <Card className="border-dashed p-6 text-center">
                    <Info className="mx-auto h-6 w-6 text-slate-300" />
                    <p className="mt-2 font-medium text-slate-900">Esta ficha aún está vacía</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                        {categoria.admiteAgente
                            ? 'Puedes completarla a mano, o instalar el agente de inventario en el equipo para que se llene automáticamente.'
                            : 'Este tipo de equipo no lo reporta el agente automático, así que sus datos se registran a mano.'}
                    </p>
                    {editable && (
                        <Button variant="outline" className="mt-4" onClick={comenzarEdicion} icon={<Pencil size={15} />}>
                            Completar ahora
                        </Button>
                    )}
                </Card>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────── Campo individual
function CampoFicha({
    campo, valor, editando, onChange,
}: {
    campo: CampoTecnico
    valor: unknown
    editando: boolean
    onChange: (v: unknown) => void
}) {
    const idCampo = `campo-${campo.clave}`

    if (!editando) {
        const vacio = valor === undefined || valor === null || valor === ''
        return (
            <div>
                <dt className="text-[10px] font-bold uppercase tracking-tight text-slate-400">
                    {campo.etiqueta}
                </dt>
                <dd className={cn('mt-0.5 text-sm', vacio ? 'italic text-slate-400' : 'font-semibold text-slate-700')}>
                    {campo.tipo === 'booleano' && !vacio ? (
                        <span className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
                            valor ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        )}>
                            {valor ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {valor ? 'Sí' : 'No'}
                        </span>
                    ) : (
                        formatearValor(campo, valor)
                    )}
                </dd>
            </div>
        )
    }

    const claseInput =
        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
        'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500'

    return (
        <div>
            <label htmlFor={idCampo} className="mb-1 block text-[10px] font-bold uppercase tracking-tight text-slate-500">
                {campo.etiqueta}
                {campo.unidad && <span className="ml-1 normal-case text-slate-400">({campo.unidad})</span>}
            </label>

            {campo.tipo === 'booleano' ? (
                <label className="flex cursor-pointer items-center gap-2.5 py-1">
                    <input
                        id={idCampo}
                        type="checkbox"
                        checked={Boolean(valor)}
                        onChange={(e) => onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">
                        {valor ? 'Sí' : 'No'}
                    </span>
                </label>
            ) : campo.tipo === 'lista' ? (
                <select
                    id={idCampo}
                    value={String(valor ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    className={claseInput}
                >
                    <option value="">— Sin definir —</option>
                    {campo.opciones?.map((op) => (
                        <option key={op} value={op}>{op}</option>
                    ))}
                </select>
            ) : campo.tipo === 'textarea' ? (
                <textarea
                    id={idCampo}
                    rows={3}
                    value={String(valor ?? '')}
                    placeholder={campo.ejemplo}
                    onChange={(e) => onChange(e.target.value)}
                    className={claseInput}
                />
            ) : (
                <input
                    id={idCampo}
                    type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text'}
                    value={String(valor ?? '')}
                    placeholder={campo.ejemplo}
                    onChange={(e) =>
                        onChange(campo.tipo === 'numero'
                            ? (e.target.value === '' ? '' : Number(e.target.value))
                            : e.target.value)
                    }
                    className={claseInput}
                />
            )}

            {campo.ayuda && (
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{campo.ayuda}</p>
            )}
        </div>
    )
}

export type { CategoriaActivo }
