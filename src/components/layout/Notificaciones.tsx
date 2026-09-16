/**
 * Avisos de la barra superior.
 *
 * La campana era decorativa: no mostraba nada. Ahora reúne lo que de verdad
 * reclama atención de quien ha iniciado sesión —tickets asignados sin
 * atender y compromisos de SLA vencidos— y lleva directo a ellos.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Inbox, CheckCircle2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { listar } from '@/lib/api'
import { formatRelativeTime, cn } from '@/lib/utils'

interface Aviso {
    id: string
    titulo: string
    detalle: string
    ruta: string
    urgente: boolean
    fecha?: string
}

/** Cada cuánto se vuelve a mirar si hay novedades. */
const INTERVALO_MS = 60_000

export function Notificaciones() {
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const [abierto, setAbierto] = useState(false)
    const [avisos, setAvisos] = useState<Aviso[]>([])
    const [cargando, setCargando] = useState(true)
    const panelRef = useRef<HTMLDivElement>(null)

    const esPersonal = profile?.role !== 'customer'

    const cargar = useCallback(async () => {
        if (!user?.id) return

        try {
            const ahora = new Date().toISOString()

            // A quien sólo reporta le interesan sus propios tickets; al
            // personal, lo que tiene asignado y lo que se le está venciendo.
            const [asignados, vencidos] = await Promise.all([
                listar<any>('tickets', {
                    limit: 8,
                    order: 'created_at',
                    dir: 'desc',
                    filtros: esPersonal
                        ? { assignee_id: user.id, 'status[in]': 'new,open' }
                        : { requester_id: user.id, 'status[in]': 'resolved' },
                }),
                esPersonal
                    ? listar<any>('tickets', {
                        limit: 8,
                        order: 'sla_due_at',
                        filtros: {
                            assignee_id: user.id,
                            'sla_due_at[lt]': ahora,
                            'status[nin]': 'resolved,closed',
                        },
                    })
                    : Promise.resolve([]),
            ])

            const idsVencidos = new Set(vencidos.map((t) => t.id))

            const lista: Aviso[] = [
                ...vencidos.map((t) => ({
                    id: t.id,
                    titulo: `#${t.number} · ${t.title}`,
                    detalle: 'El compromiso de atención está vencido',
                    ruta: `/tickets/${t.id}`,
                    urgente: true,
                    fecha: t.sla_due_at,
                })),
                ...asignados
                    .filter((t) => !idsVencidos.has(t.id))
                    .map((t) => ({
                        id: t.id,
                        titulo: `#${t.number} · ${t.title}`,
                        detalle: esPersonal
                            ? 'Asignado a ti, sin atender'
                            : 'Tu solicitud fue resuelta',
                        ruta: `/tickets/${t.id}`,
                        urgente: false,
                        fecha: t.created_at,
                    })),
            ]

            setAvisos(lista)
        } catch {
            // Un fallo aquí no debe estorbar el resto de la aplicación.
            setAvisos([])
        } finally {
            setCargando(false)
        }
    }, [user?.id, esPersonal])

    useEffect(() => {
        cargar()
        const t = setInterval(() => {
            if (document.visibilityState === 'visible') cargar()
        }, INTERVALO_MS)
        return () => clearInterval(t)
    }, [cargar])

    // Cerrar al hacer clic fuera
    useEffect(() => {
        if (!abierto) return
        const fuera = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setAbierto(false)
            }
        }
        const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
        document.addEventListener('mousedown', fuera)
        document.addEventListener('keydown', escape)
        return () => {
            document.removeEventListener('mousedown', fuera)
            document.removeEventListener('keydown', escape)
        }
    }, [abierto])

    const urgentes = avisos.filter((a) => a.urgente).length
    const hay = avisos.length > 0

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setAbierto((v) => !v)}
                aria-label={hay ? `Avisos: ${avisos.length} pendientes` : 'Avisos'}
                aria-expanded={abierto}
                className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
                <Bell size={20} />
                {hay && (
                    <span
                        className={cn(
                            'absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-white',
                            urgentes > 0 ? 'bg-red-500' : 'bg-indigo-500'
                        )}
                    >
                        {avisos.length > 9 ? '9+' : avisos.length}
                    </span>
                )}
            </button>

            {abierto && (
                <div className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Pendientes</p>
                            {urgentes > 0 && (
                                <p className="text-xs text-red-600">
                                    {urgentes} con el tiempo de atención vencido
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setAbierto(false)}
                            aria-label="Cerrar"
                            className="rounded p-1 text-slate-400 hover:bg-slate-100"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {cargando ? (
                            <p className="px-4 py-8 text-center text-sm text-slate-400">Cargando…</p>
                        ) : !hay ? (
                            <div className="px-4 py-10 text-center">
                                <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-400" />
                                <p className="mt-2 text-sm font-medium text-slate-900">Todo al día</p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {esPersonal
                                        ? 'No tienes tickets sin atender.'
                                        : 'No hay novedades en tus solicitudes.'}
                                </p>
                            </div>
                        ) : (
                            avisos.map((a) => (
                                <button
                                    key={a.id}
                                    onClick={() => { setAbierto(false); navigate(a.ruta) }}
                                    className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50"
                                >
                                    <span
                                        className={cn(
                                            'mt-0.5 shrink-0 rounded-md p-1.5',
                                            a.urgente ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                                        )}
                                    >
                                        {a.urgente ? <AlertTriangle size={14} /> : <Inbox size={14} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-slate-900">
                                            {a.titulo}
                                        </span>
                                        <span className={cn('block text-xs', a.urgente ? 'text-red-600' : 'text-slate-500')}>
                                            {a.detalle}
                                        </span>
                                        {a.fecha && (
                                            <span className="mt-0.5 block text-[11px] text-slate-400">
                                                {formatRelativeTime(new Date(a.fecha))}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    {hay && (
                        <button
                            onClick={() => { setAbierto(false); navigate('/tickets') }}
                            className="w-full border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center text-xs font-semibold text-indigo-600 transition hover:bg-slate-100"
                        >
                            Ver todos los tickets
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
