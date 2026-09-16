/**
 * Guía de uso — zona de ayuda pública.
 *
 * Documentación completa por roles. Es pública para que cualquiera pueda
 * consultarla sin iniciar sesión, y para que los buscadores la indexen.
 */
import { useMemo, useState, useEffect } from 'react'
import { Search, ChevronRight, Info, AlertTriangle, Lightbulb, BookOpen, X } from 'lucide-react'
import { CabeceraPublica, PieDePagina } from './HomePage'
import { CAPITULOS, type Bloque, type Capitulo } from './wiki-contenido'
import { usarSeo } from '@/lib/seo'
import { cn } from '@/lib/utils'

export function WikiPage() {
    const [busqueda, setBusqueda] = useState('')
    const [capituloActivo, setCapituloActivo] = useState<string>(CAPITULOS[0].id)
    const [menuAbierto, setMenuAbierto] = useState(false)

    usarSeo({
        titulo: 'Guía de uso · TicketWati',
        descripcion:
            'Manual completo de TicketWati: cómo crear y seguir tickets, atender solicitudes, ' +
            'gestionar el inventario de equipos, programar mantenimientos y configurar la ' +
            'plataforma. Explicado paso a paso para cada rol.',
        palabrasClave: [
            'manual mesa de ayuda', 'cómo crear un ticket', 'guía ITSM',
            'tutorial help desk', 'gestión de incidentes', 'manual inventario TI',
        ],
        tipo: 'article',
    })

    // Datos estructurados de preguntas frecuentes para los buscadores.
    useEffect(() => {
        const faq = CAPITULOS.flatMap((c) =>
            c.secciones.map((s) => ({
                '@type': 'Question',
                name: s.titulo,
                acceptedAnswer: { '@type': 'Answer', text: s.resumen },
            }))
        )

        const script = document.createElement('script')
        script.type = 'application/ld+json'
        script.dataset.seo = 'wiki'
        script.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq,
        })
        document.head.appendChild(script)

        return () => {
            document.head.querySelectorAll('script[data-seo="wiki"]').forEach((n) => n.remove())
        }
    }, [])

    // Filtra secciones por texto libre sobre título, resumen y contenido.
    const capitulosFiltrados = useMemo<Capitulo[]>(() => {
        const termino = busqueda.trim().toLowerCase()
        if (termino.length < 2) return CAPITULOS

        return CAPITULOS
            .map((cap) => ({
                ...cap,
                secciones: cap.secciones.filter((sec) => {
                    const texto = [
                        sec.titulo,
                        sec.resumen,
                        ...sec.bloques.flatMap((b) => [
                            b.texto ?? '',
                            b.titulo ?? '',
                            ...(b.items ?? []),
                            ...(b.filas?.flat() ?? []),
                        ]),
                    ].join(' ').toLowerCase()
                    return texto.includes(termino)
                }),
            }))
            .filter((cap) => cap.secciones.length > 0)
    }, [busqueda])

    const buscando = busqueda.trim().length >= 2
    const visibles = buscando
        ? capitulosFiltrados
        : capitulosFiltrados.filter((c) => c.id === capituloActivo)

    const totalResultados = capitulosFiltrados.reduce((n, c) => n + c.secciones.length, 0)

    return (
        <div className="min-h-screen bg-white">
            <CabeceraPublica />

            {/* Encabezado */}
            <div className="border-b border-slate-100 bg-slate-50">
                <div className="mx-auto max-w-6xl px-6 py-12">
                    <div className="flex items-center gap-2 text-sm text-indigo-600">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-medium">Centro de ayuda</span>
                    </div>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Guía de uso
                    </h1>
                    <p className="mt-3 max-w-2xl text-slate-600">
                        Todo lo que necesitas saber para usar la plataforma, organizado por rol.
                        Si es tu primera vez, empieza por «Primeros pasos».
                    </p>

                    <div className="relative mt-7 max-w-xl">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar en la guía: crear ticket, inventario, SLA…"
                            aria-label="Buscar en la guía de uso"
                            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-11 text-slate-900 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                aria-label="Limpiar búsqueda"
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {buscando && (
                        <p className="mt-3 text-sm text-slate-500" role="status">
                            {totalResultados === 0
                                ? 'No se encontró nada con ese término. Prueba con otra palabra.'
                                : `${totalResultados} resultado${totalResultados === 1 ? '' : 's'}`}
                        </p>
                    )}
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-6 py-10">
                <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-12">
                    {/* Índice */}
                    <aside className="mb-8 lg:mb-0">
                        <button
                            onClick={() => setMenuAbierto((v) => !v)}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 font-medium text-slate-700 lg:hidden"
                            aria-expanded={menuAbierto}
                        >
                            Contenido
                            <ChevronRight className={cn('h-4 w-4 transition', menuAbierto && 'rotate-90')} />
                        </button>

                        <nav
                            aria-label="Índice de la guía"
                            className={cn(
                                'mt-3 lg:sticky lg:top-24 lg:mt-0 lg:block',
                                menuAbierto ? 'block' : 'hidden'
                            )}
                        >
                            <ol className="space-y-1">
                                {CAPITULOS.map((cap, i) => {
                                    const activo = !buscando && cap.id === capituloActivo
                                    return (
                                        <li key={cap.id}>
                                            <button
                                                onClick={() => {
                                                    setCapituloActivo(cap.id)
                                                    setBusqueda('')
                                                    setMenuAbierto(false)
                                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                                }}
                                                className={cn(
                                                    'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition',
                                                    activo
                                                        ? 'bg-indigo-50 font-semibold text-indigo-700'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'mt-0.5 font-mono text-xs',
                                                        activo ? 'text-indigo-500' : 'text-slate-400'
                                                    )}
                                                >
                                                    {String(i + 1).padStart(2, '0')}
                                                </span>
                                                <span>{cap.titulo}</span>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ol>
                        </nav>
                    </aside>

                    {/* Contenido */}
                    <main>
                        {visibles.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
                                <Search className="mx-auto h-8 w-8 text-slate-300" />
                                <p className="mt-3 font-medium text-slate-900">Sin resultados</p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Prueba con «ticket», «inventario», «SLA» o «ausencia».
                                </p>
                            </div>
                        ) : (
                            visibles.map((cap) => (
                                <section key={cap.id} className="mb-14 last:mb-0">
                                    <header className="mb-8 border-b border-slate-100 pb-5">
                                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                            {cap.titulo}
                                        </h2>
                                        <p className="mt-2 text-slate-600">{cap.descripcion}</p>
                                    </header>

                                    <div className="space-y-12">
                                        {cap.secciones.map((sec) => (
                                            <article key={sec.id} id={sec.id} className="scroll-mt-24">
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    {sec.titulo}
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-500">{sec.resumen}</p>

                                                <div className="mt-5 space-y-5">
                                                    {sec.bloques.map((bloque, i) => (
                                                        <BloqueContenido key={i} bloque={bloque} />
                                                    ))}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            ))
                        )}
                    </main>
                </div>
            </div>

            <PieDePagina />
        </div>
    )
}

// ── Render de cada tipo de bloque ──────────────────────────────────────
function BloqueContenido({ bloque }: { bloque: Bloque }) {
    switch (bloque.tipo) {
        case 'parrafo':
            return <p className="leading-relaxed text-slate-700">{bloque.texto}</p>

        case 'pasos':
            return (
                <div>
                    {bloque.titulo && (
                        <p className="mb-3 font-medium text-slate-900">{bloque.titulo}</p>
                    )}
                    <ol className="space-y-3">
                        {bloque.items?.map((paso, i) => (
                            <li key={i} className="flex gap-4">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                                    {i + 1}
                                </span>
                                <span className="leading-relaxed text-slate-700">{paso}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )

        case 'lista':
            return (
                <div>
                    {bloque.titulo && (
                        <p className="mb-3 font-medium text-slate-900">{bloque.titulo}</p>
                    )}
                    <ul className="space-y-2">
                        {bloque.items?.map((item, i) => (
                            <li key={i} className="flex gap-3 leading-relaxed text-slate-700">
                                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )

        case 'aviso': {
            const estilos = {
                info: {
                    caja: 'border-sky-200 bg-sky-50',
                    icono: 'text-sky-600',
                    Icono: Info,
                },
                atencion: {
                    caja: 'border-amber-200 bg-amber-50',
                    icono: 'text-amber-600',
                    Icono: AlertTriangle,
                },
                consejo: {
                    caja: 'border-emerald-200 bg-emerald-50',
                    icono: 'text-emerald-600',
                    Icono: Lightbulb,
                },
            }[bloque.estilo ?? 'info']

            const { Icono } = estilos

            return (
                <aside className={cn('rounded-xl border p-4', estilos.caja)}>
                    <div className="flex gap-3">
                        <Icono className={cn('mt-0.5 h-5 w-5 shrink-0', estilos.icono)} aria-hidden="true" />
                        <div className="min-w-0">
                            {bloque.titulo && (
                                <p className="font-medium text-slate-900">{bloque.titulo}</p>
                            )}
                            <p className={cn('leading-relaxed text-slate-700', bloque.titulo && 'mt-1')}>
                                {bloque.texto}
                            </p>
                        </div>
                    </div>
                </aside>
            )
        }

        case 'tabla':
            return (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[520px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                {bloque.columnas?.map((col) => (
                                    <th
                                        key={col}
                                        scope="col"
                                        className="px-4 py-3 text-left font-semibold text-slate-700"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bloque.filas?.map((fila, i) => (
                                <tr key={i} className="border-b border-slate-100 last:border-0">
                                    {fila.map((celda, j) => (
                                        <td
                                            key={j}
                                            className={cn(
                                                'px-4 py-3 align-top',
                                                j === 0 ? 'font-medium text-slate-900' : 'text-slate-600'
                                            )}
                                        >
                                            {celda}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )

        default:
            return null
    }
}

export default WikiPage
