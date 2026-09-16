/**
 * Página pública de presentación — orientada a captación y posicionamiento.
 *
 * Es la primera pantalla que ve alguien que aún no tiene cuenta. Explica qué
 * resuelve el producto, para quién es y cómo empezar, y aporta el marcado
 * semántico y de datos estructurados que necesitan los buscadores.
 */
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Ticket, Server, GitMerge, AlertTriangle, ShoppingBag, Hammer,
    BarChart3, BookOpen, CalendarOff, Calendar, ArrowRight, Check,
    ShieldCheck, Database, Cpu, Mail, Users, Zap,
} from 'lucide-react'
import { usarSeo } from '@/lib/seo'

const MODULOS = [
    {
        icono: Ticket,
        titulo: 'Gestión de tickets',
        texto: 'Recibe, clasifica y resuelve solicitudes de todos los departamentos. Asignación múltiple, fusión de duplicados, SLA por prioridad y respuesta por correo.',
    },
    {
        icono: Server,
        titulo: 'Inventario tecnológico',
        texto: 'Cada equipo reporta su propio hardware y software de forma automática. Procesador, memoria, discos, red, licencias y programas instalados, siempre al día.',
    },
    {
        icono: AlertTriangle,
        titulo: 'Gestión de problemas',
        texto: 'Agrupa incidentes recurrentes, documenta la causa raíz y registra soluciones temporales para que el mismo fallo no vuelva a costarte horas.',
    },
    {
        icono: GitMerge,
        titulo: 'Control de cambios',
        texto: 'Solicitudes de cambio con análisis de riesgo, plan de reversión, aprobación por comité y calendario de ventanas de mantenimiento.',
    },
    {
        icono: ShoppingBag,
        titulo: 'Catálogo de servicios',
        texto: 'Publica lo que TI ofrece —equipos, software, accesos— con flujo de aprobación y tiempos de entrega claros para quien lo solicita.',
    },
    {
        icono: Hammer,
        titulo: 'Órdenes de trabajo',
        texto: 'Planifica el trabajo en campo, asigna técnicos, registra evidencias fotográficas y cierra con la firma de quien recibe.',
    },
    {
        icono: Calendar,
        titulo: 'Mantenimiento preventivo',
        texto: 'Define planes recurrentes y el sistema genera las actividades, las asigna y las convierte en tickets cuando llega la fecha.',
    },
    {
        icono: BarChart3,
        titulo: 'Indicadores',
        texto: 'Tiempo medio de resolución, cumplimiento de SLA, satisfacción, carga por persona y estado del parque informático.',
    },
    {
        icono: BookOpen,
        titulo: 'Base de conocimiento',
        texto: 'Documenta procedimientos una vez y deja que el equipo los consulte. Menos preguntas repetidas, menos dependencia de una sola persona.',
    },
    {
        icono: CalendarOff,
        titulo: 'Gestión de ausencias',
        texto: 'Solicitud, aprobación y calendario de ausencias del personal, con evidencias y avisos automáticos.',
    },
]

const BENEFICIOS = [
    {
        icono: Cpu,
        titulo: 'El inventario se mantiene solo',
        texto: 'Un agente ligero instalado en cada equipo envía su ficha técnica completa. Nadie tiene que llenar planillas ni recorrer oficinas contando computadores.',
    },
    {
        icono: ShieldCheck,
        titulo: 'Tus datos, en tu servidor',
        texto: 'Funciona sobre tu propia base de datos PostgreSQL. Sin suscripciones por usuario, sin depender de un proveedor externo y sin que la información salga de tu infraestructura.',
    },
    {
        icono: Users,
        titulo: 'Un sistema por departamento',
        texto: 'Sistemas, Comunicaciones, Mantenimiento o Talento Humano trabajan en el mismo lugar, cada uno viendo sólo lo suyo, con permisos por rol.',
    },
    {
        icono: Mail,
        titulo: 'Los correos se vuelven tickets',
        texto: 'Quien pide ayuda escribe un correo como siempre. El sistema lo convierte en ticket, lo asigna al equipo correcto y mantiene el hilo de la conversación.',
    },
]

const PARA_QUIEN = [
    'Colegios y universidades que gestionan aulas, laboratorios y equipos docentes',
    'Empresas con un área de TI pequeña que atiende a toda la organización',
    'Operaciones de mantenimiento con técnicos en campo y activos distribuidos',
    'Equipos que hoy resuelven por WhatsApp y correo, y pierden el rastro de lo pedido',
]

export function HomePage() {
    usarSeo({
        titulo: 'TicketWati · Mesa de ayuda e inventario tecnológico',
        descripcion:
            'Plataforma de mesa de ayuda e inventario de activos para organizaciones. ' +
            'Gestiona tickets por departamento, controla tu parque informático de forma ' +
            'automática y mide el servicio con indicadores. Instalable en tu propio servidor.',
        palabrasClave: [
            'mesa de ayuda', 'help desk', 'sistema de tickets', 'ITSM', 'ITIL',
            'inventario de activos', 'gestión de activos TI', 'CMDB', 'soporte técnico',
            'mantenimiento preventivo', 'órdenes de trabajo', 'software de soporte',
        ],
        tipo: 'website',
    })

    // Datos estructurados para que los buscadores entiendan de qué trata.
    useEffect(() => {
        const datos = {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'TicketWati',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
                'Mesa de ayuda e inventario tecnológico para organizaciones: tickets por ' +
                'departamento, gestión de activos, mantenimiento preventivo e indicadores de servicio.',
            featureList: MODULOS.map((m) => m.titulo),
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: 'Instalable en infraestructura propia.',
            },
        }

        const script = document.createElement('script')
        script.type = 'application/ld+json'
        script.textContent = JSON.stringify(datos)
        script.dataset.seo = 'homepage'
        document.head.appendChild(script)

        return () => {
            document.head.querySelectorAll('script[data-seo="homepage"]').forEach((n) => n.remove())
        }
    }, [])

    return (
        <div className="min-h-screen bg-white">
            <CabeceraPublica />

            <main>
                {/* ── Presentación ───────────────────────────────── */}
                <section className="relative overflow-hidden border-b border-slate-100">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_80%_-10%,#eef0ff_0%,transparent_60%)]"
                    />
                    <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
                        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                            <Zap className="h-3.5 w-3.5" />
                            Mesa de ayuda + inventario
                        </p>

                        <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                            Todo lo que tu equipo pide,{' '}
                            <span className="text-indigo-600">en un solo lugar</span>
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
                            TicketWati reúne las solicitudes de todos los departamentos, mantiene el
                            inventario de tus equipos al día sin trabajo manual y te muestra cuánto
                            tarda realmente tu servicio en responder.
                        </p>

                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
                            >
                                Entrar a la plataforma
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                to="/ayuda"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                <BookOpen className="h-4 w-4" />
                                Ver guía de uso
                            </Link>
                        </div>

                        <dl className="mt-16 grid grid-cols-2 gap-8 border-t border-slate-100 pt-10 sm:grid-cols-4">
                            {[
                                ['10', 'módulos integrados'],
                                ['7', 'roles con permisos'],
                                ['100%', 'en tu servidor'],
                                ['0', 'coste por usuario'],
                            ].map(([valor, etiqueta]) => (
                                <div key={etiqueta}>
                                    <dt className="text-3xl font-bold tracking-tight text-slate-900">{valor}</dt>
                                    <dd className="mt-1 text-sm text-slate-500">{etiqueta}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* ── Por qué ────────────────────────────────────── */}
                <section className="border-b border-slate-100 py-20" aria-labelledby="ventajas">
                    <div className="mx-auto max-w-6xl px-6">
                        <h2 id="ventajas" className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900">
                            Pensado para equipos que ya no dan abasto con el correo
                        </h2>
                        <p className="mt-4 max-w-2xl text-slate-600">
                            Si hoy las solicitudes llegan por mensajes sueltos y el inventario vive en
                            una hoja de cálculo desactualizada, esto es lo que cambia.
                        </p>

                        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
                            {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
                                <article
                                    key={titulo}
                                    className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/50"
                                >
                                    <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3">
                                        <Icono className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>
                                    <p className="mt-2 leading-relaxed text-slate-600">{texto}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Módulos ────────────────────────────────────── */}
                <section className="border-b border-slate-100 bg-slate-50 py-20" aria-labelledby="modulos">
                    <div className="mx-auto max-w-6xl px-6">
                        <h2 id="modulos" className="text-3xl font-bold tracking-tight text-slate-900">
                            Qué incluye
                        </h2>
                        <p className="mt-4 max-w-2xl text-slate-600">
                            Diez módulos que funcionan juntos. No hay que comprar complementos ni
                            integrar herramientas sueltas.
                        </p>

                        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {MODULOS.map(({ icono: Icono, titulo, texto }) => (
                                <article
                                    key={titulo}
                                    className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-md"
                                >
                                    <Icono className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                                    <h3 className="mt-4 font-semibold text-slate-900">{titulo}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{texto}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Inventario automático ──────────────────────── */}
                <section className="border-b border-slate-100 py-20" aria-labelledby="inventario">
                    <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-2">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                                Inventario sin trabajo manual
                            </p>
                            <h2 id="inventario" className="text-3xl font-bold tracking-tight text-slate-900">
                                Cada computador se registra solo
                            </h2>
                            <p className="mt-5 leading-relaxed text-slate-600">
                                Se instala un agente ligero en los equipos. Una vez al día envía su ficha
                                completa al sistema: qué procesador tiene, cuánta memoria, qué discos, qué
                                programas hay instalados, el estado de la licencia de Windows y quién fue
                                la última persona que inició sesión.
                            </p>
                            <ul className="mt-7 space-y-3">
                                {[
                                    'Alta automática: si el equipo es nuevo, se crea su ficha',
                                    'Identificación por número de serie, sin duplicados',
                                    'Historial de cambios de hardware y software',
                                    'Detección de equipos que dejaron de reportar',
                                ].map((linea) => (
                                    <li key={linea} className="flex items-start gap-3 text-slate-700">
                                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                                        <span>{linea}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                            <div className="mb-4 flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-red-400" />
                                <span className="h-3 w-3 rounded-full bg-amber-400" />
                                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                                <span className="ml-2 font-mono text-xs text-slate-400">
                                    agente de inventario
                                </span>
                            </div>
                            <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-slate-300">
                                <code>{`Recopilando información del equipo…
  ✓ Procesador    Intel Core i7-1165G7
  ✓ Memoria       16.00 GB
  ✓ Disco         SSD 512 GB · 61% libre
  ✓ Red           192.168.1.45
  ✓ Sistema       Windows 11 Pro
  ✓ Programas     142 detectados

Enviando a TicketWati…
  ✓ Inventario del equipo actualizado`}</code>
                            </pre>
                        </div>
                    </div>
                </section>

                {/* ── Para quién ─────────────────────────────────── */}
                <section className="border-b border-slate-100 bg-slate-50 py-20" aria-labelledby="para-quien">
                    <div className="mx-auto max-w-6xl px-6">
                        <h2 id="para-quien" className="text-3xl font-bold tracking-tight text-slate-900">
                            ¿Es para ti?
                        </h2>
                        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
                            {PARA_QUIEN.map((caso) => (
                                <div
                                    key={caso}
                                    className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5"
                                >
                                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                                    <p className="text-slate-700">{caso}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Tecnología ─────────────────────────────────── */}
                <section className="border-b border-slate-100 py-20" aria-labelledby="tecnologia">
                    <div className="mx-auto max-w-6xl px-6">
                        <h2 id="tecnologia" className="text-3xl font-bold tracking-tight text-slate-900">
                            Sobre qué está construido
                        </h2>
                        <p className="mt-4 max-w-2xl text-slate-600">
                            Tecnología estándar y conocida. Cualquier equipo de desarrollo puede
                            mantenerlo sin depender de servicios propietarios.
                        </p>
                        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {[
                                { icono: Database, nombre: 'PostgreSQL', detalle: 'Base de datos' },
                                { icono: Server, nombre: 'Node.js', detalle: 'Servidor de la API' },
                                { icono: Zap, nombre: 'React', detalle: 'Interfaz' },
                                { icono: ShieldCheck, nombre: 'JWT', detalle: 'Autenticación' },
                            ].map(({ icono: Icono, nombre, detalle }) => (
                                <div
                                    key={nombre}
                                    className="rounded-xl border border-slate-200 bg-white p-5 text-center"
                                >
                                    <Icono className="mx-auto h-6 w-6 text-slate-400" />
                                    <p className="mt-3 font-semibold text-slate-900">{nombre}</p>
                                    <p className="text-xs text-slate-500">{detalle}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Llamada final ──────────────────────────────── */}
                <section className="py-20">
                    <div className="mx-auto max-w-4xl px-6">
                        <div className="rounded-3xl bg-slate-900 px-8 py-14 text-center sm:px-14">
                            <h2 className="text-3xl font-bold tracking-tight text-white">
                                Empieza a ordenar el soporte hoy
                            </h2>
                            <p className="mx-auto mt-4 max-w-xl text-slate-300">
                                Si ya tienes una cuenta, entra y revisa tus tickets. Si aún no,
                                pide acceso al administrador de tu organización.
                            </p>
                            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 font-semibold text-slate-900 transition hover:bg-slate-100"
                                >
                                    Iniciar sesión
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    to="/ayuda"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-7 py-3.5 font-semibold text-white transition hover:bg-slate-800"
                                >
                                    Leer la guía
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <PieDePagina />
        </div>
    )
}

// ── Cabecera y pie compartidos por las páginas públicas ─────────────────
export function CabeceraPublica() {
    return (
        <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <Link to="/" className="flex items-center gap-2.5" aria-label="TicketWati, inicio">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
                        T
                    </span>
                    <span className="text-lg font-bold tracking-tight text-slate-900">TicketWati</span>
                </Link>

                <nav className="flex items-center gap-2 sm:gap-6" aria-label="Principal">
                    <Link
                        to="/ayuda"
                        className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:block"
                    >
                        Guía de uso
                    </Link>
                    <Link
                        to="/login"
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                        Entrar
                    </Link>
                </nav>
            </div>
        </header>
    )
}

export function PieDePagina() {
    return (
        <footer className="border-t border-slate-100 bg-slate-50">
            <div className="mx-auto max-w-6xl px-6 py-12">
                <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                                T
                            </span>
                            <span className="font-bold text-slate-900">TicketWati</span>
                        </div>
                        <p className="mt-3 max-w-md text-sm text-slate-500">
                            Mesa de ayuda e inventario tecnológico para organizaciones.
                        </p>
                    </div>

                    <nav className="flex gap-6 text-sm" aria-label="Pie de página">
                        <Link to="/ayuda" className="text-slate-600 hover:text-slate-900">
                            Guía de uso
                        </Link>
                        <Link to="/login" className="text-slate-600 hover:text-slate-900">
                            Iniciar sesión
                        </Link>
                    </nav>
                </div>

                <p className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-400">
                    © {new Date().getFullYear()} TicketWati. Todos los derechos reservados.
                </p>
            </div>
        </footer>
    )
}

export default HomePage
