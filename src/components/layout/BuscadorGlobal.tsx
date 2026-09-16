/**
 * Buscador global.
 *
 * Se abre con Ctrl+K desde cualquier pantalla y busca a la vez en tickets,
 * activos y base de conocimiento. Antes el campo existía pero no hacía nada:
 * escribir en él no llevaba a ninguna parte.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Ticket, Server, BookOpen, Loader2, CornerDownLeft, X } from 'lucide-react'
import { analyticsApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Resultado {
    id: string
    titulo: string
    detalle: string
    ruta: string
    grupo: 'Tickets' | 'Activos' | 'Base de conocimiento'
}

const ICONOS = {
    'Tickets': Ticket,
    'Activos': Server,
    'Base de conocimiento': BookOpen,
} as const

export function BuscadorGlobal() {
    const navigate = useNavigate()
    const [abierto, setAbierto] = useState(false)
    const [termino, setTermino] = useState('')
    const [resultados, setResultados] = useState<Resultado[]>([])
    const [buscando, setBuscando] = useState(false)
    const [resaltado, setResaltado] = useState(0)

    const inputRef = useRef<HTMLInputElement>(null)
    const listaRef = useRef<HTMLDivElement>(null)

    // ── Ctrl+K abre, Escape cierra ───────────────────────────────
    useEffect(() => {
        const alPulsar = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setAbierto(true)
            }
            if (e.key === 'Escape') setAbierto(false)
        }
        window.addEventListener('keydown', alPulsar)
        return () => window.removeEventListener('keydown', alPulsar)
    }, [])

    useEffect(() => {
        if (abierto) {
            // El foco se pide tras pintar, si no el input aún no existe.
            requestAnimationFrame(() => inputRef.current?.focus())
        } else {
            setTermino('')
            setResultados([])
            setResaltado(0)
        }
    }, [abierto])

    // ── Búsqueda, esperando a que dejen de escribir ──────────────
    useEffect(() => {
        const texto = termino.trim()
        if (texto.length < 2) {
            setResultados([])
            setBuscando(false)
            return
        }

        setBuscando(true)
        const temporizador = setTimeout(async () => {
            try {
                const datos = await analyticsApi.buscar(texto)

                const juntos: Resultado[] = [
                    ...(datos.tickets ?? []).map((t: any) => ({
                        id: `ticket-${t.id}`,
                        titulo: `#${t.number} · ${t.title}`,
                        detalle: `${t.status ?? ''} · ${t.priority ?? ''}`.trim(),
                        ruta: `/tickets/${t.id}`,
                        grupo: 'Tickets' as const,
                    })),
                    ...(datos.activos ?? []).map((a: any) => ({
                        id: `activo-${a.id}`,
                        titulo: a.name,
                        detalle: [a.asset_tag, a.serial_number].filter(Boolean).join(' · ') || 'Sin etiqueta',
                        ruta: `/assets/${a.id}`,
                        grupo: 'Activos' as const,
                    })),
                    ...(datos.articulos ?? []).map((k: any) => ({
                        id: `kb-${k.id}`,
                        titulo: k.title,
                        detalle: k.status === 'published' ? 'Publicado' : 'Borrador',
                        ruta: `/knowledge-base/${k.id}`,
                        grupo: 'Base de conocimiento' as const,
                    })),
                ]

                setResultados(juntos)
                setResaltado(0)
            } catch {
                setResultados([])
            } finally {
                setBuscando(false)
            }
        }, 250)

        return () => clearTimeout(temporizador)
    }, [termino])

    const irA = useCallback((r: Resultado) => {
        setAbierto(false)
        navigate(r.ruta)
    }, [navigate])

    // ── Navegación con el teclado ────────────────────────────────
    const alTeclear = (e: React.KeyboardEvent) => {
        if (resultados.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setResaltado((i) => (i + 1) % resultados.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setResaltado((i) => (i - 1 + resultados.length) % resultados.length)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const elegido = resultados[resaltado]
            if (elegido) irA(elegido)
        }
    }

    // Mantiene visible la opción resaltada al moverse con las flechas.
    useEffect(() => {
        const nodo = listaRef.current?.querySelector<HTMLElement>(`[data-indice="${resaltado}"]`)
        nodo?.scrollIntoView({ block: 'nearest' })
    }, [resaltado])

    const agrupados = resultados.reduce<Record<string, Resultado[]>>((acc, r) => {
        ; (acc[r.grupo] ??= []).push(r)
        return acc
    }, {})

    return (
        <>
            {/* Disparador en la barra superior */}
            <button
                onClick={() => setAbierto(true)}
                className="hidden w-full max-w-sm items-center gap-2.5 rounded-lg border border-transparent bg-slate-50 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-200 hover:bg-white md:flex"
            >
                <Search size={17} className="shrink-0" />
                <span className="flex-1 text-left">Buscar tickets, activos, artículos…</span>
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                    Ctrl K
                </kbd>
            </button>

            {/* Versión compacta en móvil */}
            <button
                onClick={() => setAbierto(true)}
                aria-label="Buscar"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            >
                <Search size={20} />
            </button>

            {!abierto ? null : (
                <div
                    className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-sm"
                    onClick={() => setAbierto(false)}
                    role="presentation"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Buscador global"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        {/* Campo */}
                        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
                            {buscando
                                ? <Loader2 size={18} className="shrink-0 animate-spin text-indigo-500" />
                                : <Search size={18} className="shrink-0 text-slate-400" />}
                            <input
                                ref={inputRef}
                                value={termino}
                                onChange={(e) => setTermino(e.target.value)}
                                onKeyDown={alTeclear}
                                placeholder="Buscar tickets, activos o artículos…"
                                className="flex-1 border-0 bg-transparent py-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                            />
                            <button
                                onClick={() => setAbierto(false)}
                                aria-label="Cerrar"
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Resultados */}
                        <div ref={listaRef} className="max-h-[52vh] overflow-y-auto">
                            {termino.trim().length < 2 ? (
                                <p className="px-4 py-10 text-center text-sm text-slate-400">
                                    Escribe al menos dos letras para buscar.
                                </p>
                            ) : resultados.length === 0 && !buscando ? (
                                <div className="px-4 py-10 text-center">
                                    <p className="text-sm font-medium text-slate-900">
                                        Nada coincide con «{termino}»
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Prueba con el número del ticket, la etiqueta del equipo o su número de serie.
                                    </p>
                                </div>
                            ) : (
                                Object.entries(agrupados).map(([grupo, items]) => {
                                    const Icono = ICONOS[grupo as keyof typeof ICONOS]
                                    return (
                                        <div key={grupo} className="py-1.5">
                                            <p className="px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                {grupo}
                                            </p>
                                            {items.map((r) => {
                                                const indice = resultados.indexOf(r)
                                                const activo = indice === resaltado
                                                return (
                                                    <button
                                                        key={r.id}
                                                        data-indice={indice}
                                                        onClick={() => irA(r)}
                                                        onMouseEnter={() => setResaltado(indice)}
                                                        className={cn(
                                                            'flex w-full items-center gap-3 px-4 py-2.5 text-left transition',
                                                            activo ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                        )}
                                                    >
                                                        <Icono
                                                            size={16}
                                                            className={cn('shrink-0', activo ? 'text-indigo-600' : 'text-slate-400')}
                                                        />
                                                        <span className="min-w-0 flex-1">
                                                            <span className={cn(
                                                                'block truncate text-sm',
                                                                activo ? 'font-semibold text-indigo-900' : 'text-slate-900'
                                                            )}>
                                                                {r.titulo}
                                                            </span>
                                                            {r.detalle && (
                                                                <span className="block truncate text-xs text-slate-500">
                                                                    {r.detalle}
                                                                </span>
                                                            )}
                                                        </span>
                                                        {activo && (
                                                            <CornerDownLeft size={14} className="shrink-0 text-indigo-400" />
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Pie con las teclas */}
                        {resultados.length > 0 && (
                            <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Tecla>↑</Tecla><Tecla>↓</Tecla> moverse
                                </span>
                                <span className="flex items-center gap-1">
                                    <Tecla>Enter</Tecla> abrir
                                </span>
                                <span className="flex items-center gap-1">
                                    <Tecla>Esc</Tecla> cerrar
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

function Tecla({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
            {children}
        </kbd>
    )
}
