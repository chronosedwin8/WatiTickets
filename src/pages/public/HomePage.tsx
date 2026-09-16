/**
 * Página pública de presentación.
 *
 * Está escrita para alguien que evalúa la herramienta y necesita decidir:
 * qué cambia frente a cómo trabaja hoy, qué cuesta de verdad, qué hace falta
 * para ponerla en marcha y qué pasa con sus datos. Nada de cifras de
 * clientes ni testimonios: sólo lo que el producto hace y lo que exige.
 */
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Ticket, Server, GitMerge, AlertTriangle, ShoppingBag, Hammer,
    BarChart3, BookOpen, CalendarOff, Calendar, ArrowRight, Check, X,
    ShieldCheck, Database, Cpu, Mail, Users, Zap, HardDrive, Clock,
    CircleDollarSign, Wrench, ChevronRight,
} from 'lucide-react'
import { usarSeo } from '@/lib/seo'
import { useTema } from '@/contexts/TemaContext'
import { BotonTema } from '@/components/layout/BotonTema'

// ─────────────────────────────────────────── Contenido
const MODULOS = [
    { icono: Ticket, titulo: 'Tickets', texto: 'Solicitudes de todos los departamentos con responsable, SLA por prioridad, fusión de duplicados y respuesta por correo.' },
    { icono: Server, titulo: 'Inventario', texto: 'Cada computador reporta solo su hardware, software y licencias. El resto del parque se registra con fichas propias por tipo de equipo.' },
    { icono: AlertTriangle, titulo: 'Problemas', texto: 'Agrupa incidentes que se repiten, documenta la causa raíz y guarda la solución temporal mientras se corrige de fondo.' },
    { icono: GitMerge, titulo: 'Cambios', texto: 'Solicitudes con análisis de riesgo, plan de reversión y aprobación por comité antes de tocar producción.' },
    { icono: ShoppingBag, titulo: 'Catálogo', texto: 'Lo que TI ofrece de forma estándar, con flujo de aprobación y tiempos de entrega visibles para quien pide.' },
    { icono: Hammer, titulo: 'Órdenes de trabajo', texto: 'Trabajo en campo con técnico asignado, evidencia fotográfica y firma de quien recibe.' },
    { icono: Calendar, titulo: 'Mantenimiento', texto: 'Planes que se repiten y generan sus actividades solos, listas para convertirse en tickets.' },
    { icono: BookOpen, titulo: 'Conocimiento', texto: 'Procedimientos documentados una vez, consultables por todo el equipo.' },
    { icono: CalendarOff, titulo: 'Ausencias', texto: 'Permisos e incapacidades con aprobación, evidencia y calendario del personal.' },
    { icono: BarChart3, titulo: 'Indicadores', texto: 'Tiempo real de resolución, cumplimiento de SLA, carga por persona y estado del parque.' },
]

/** Comparación honesta con el método que casi todos usan hoy. */
const COMPARACION = [
    {
        tema: 'Dónde llegan las solicitudes',
        antes: 'Correo, WhatsApp y de palabra en el pasillo',
        despues: 'Un solo lugar, con número de seguimiento',
    },
    {
        tema: 'Quién responde',
        antes: 'Quien vio el mensaje primero, si lo vio',
        despues: 'Un responsable asignado por departamento',
    },
    {
        tema: 'Cuánto se tarda',
        antes: 'Nadie lo sabe con certeza',
        despues: 'Medido por prioridad, con aviso al vencerse',
    },
    {
        tema: 'Qué se hizo la última vez',
        antes: 'En la memoria de quien lo resolvió',
        despues: 'En el historial del ticket y en la base de conocimiento',
    },
    {
        tema: 'Qué equipos hay',
        antes: 'Una hoja de cálculo desactualizada',
        despues: 'Inventario que se actualiza solo cada día',
    },
    {
        tema: 'Si esa persona se va',
        antes: 'Se va el conocimiento con ella',
        despues: 'Queda el registro y el trabajo se reasigna',
    },
]

const PREGUNTAS = [
    {
        p: '¿Cuánto cuesta?',
        r: 'El software no tiene licencia por usuario. Lo que sí cuesta es la infraestructura donde lo pongas: un servidor o una máquina virtual, un dominio y, si quieres notificaciones, una cuenta de correo saliente. Para una organización mediana eso suele ser menos que la licencia mensual de una sola persona en una herramienta comercial.',
    },
    {
        p: '¿Dónde quedan mis datos?',
        r: 'En tu propia base de datos PostgreSQL, en el servidor que tú elijas. No hay un tercero que los guarde ni un proveedor que pueda cambiar sus condiciones. Los adjuntos se almacenan en disco o en un bucket tuyo.',
    },
    {
        p: '¿Cuánto toma ponerlo en marcha?',
        r: 'La instalación técnica es de una tarde: base de datos, servidor y configuración. Lo que realmente toma tiempo es acordar los departamentos, los tiempos de respuesta y quién atiende qué. Conviene empezar con un área y ampliar.',
    },
    {
        p: '¿Sirve si mi equipo de TI son dos personas?',
        r: 'Sobre todo entonces. Cuanto más pequeño es el equipo, más caro sale perder una solicitud o repetir un diagnóstico que ya se hizo. No hace falta usar los diez módulos: se puede empezar sólo con tickets.',
    },
    {
        p: '¿Qué pasa con los equipos que no son computadores?',
        r: 'El agente automático sólo cubre Windows. Teléfonos, impresoras, switches, UPS y proyectores tienen su propia ficha técnica con los campos que les corresponden —IMEI y plan de datos en un teléfono, referencia del tóner en una impresora, puertos y VLANs en un switch— y se registran a mano.',
    },
    {
        p: '¿Puede cada área ver sólo lo suyo?',
        r: 'Sí. Cada persona pertenece a uno o varios departamentos y ve el trabajo de esos departamentos. Quien sólo reporta incidencias ve únicamente las suyas. Esto se aplica en el servidor, no sólo en la pantalla.',
    },
    {
        p: '¿Se integra con el correo del colegio o la empresa?',
        r: 'Habla SMTP estándar, así que funciona con Microsoft 365, Google Workspace, Amazon SES o un servidor propio. Las respuestas a un ticket pueden salir por correo manteniendo el hilo de la conversación.',
    },
    {
        p: '¿Y si quiero modificarlo?',
        r: 'El código es tuyo y está construido con tecnología corriente: PostgreSQL, Node y React. Cualquier equipo de desarrollo puede mantenerlo sin depender de un proveedor concreto.',
    },
]

const REQUISITOS = [
    { icono: Database, titulo: 'PostgreSQL 16 o superior', texto: 'Donde vive toda la información.' },
    { icono: Server, titulo: 'Node.js 20 o superior', texto: 'Para el servidor de la aplicación.' },
    { icono: HardDrive, titulo: 'Un servidor o máquina virtual', texto: 'Basta con recursos modestos para una organización mediana.' },
    { icono: Mail, titulo: 'Una cuenta SMTP', texto: 'Opcional: sólo si quieres notificaciones por correo.' },
]

const ROLES = [
    {
        icono: Users,
        rol: 'Quien pide ayuda',
        texto: 'Abre un ticket, adjunta una captura y sigue su estado. Recibe aviso cuando le responden. No ve nada más.',
    },
    {
        icono: Wrench,
        rol: 'Quien atiende',
        texto: 'Ve la cola de su departamento ordenada por urgencia, con el reloj del SLA a la vista. Responde, documenta y cierra.',
    },
    {
        icono: BarChart3,
        rol: 'Quien dirige',
        texto: 'Mide cuánto se tarda de verdad, cómo se reparte la carga y qué se está incumpliendo, con datos y no con impresiones.',
    },
]

export function HomePage() {
    usarSeo({
        titulo: 'TicketWati · Mesa de ayuda e inventario tecnológico',
        descripcion:
            'Mesa de ayuda e inventario de activos para organizaciones. Gestiona tickets por ' +
            'departamento, controla tu parque informático de forma automática y mide el servicio ' +
            'con indicadores. Se instala en tu propio servidor, sin licencia por usuario.',
        palabrasClave: [
            'mesa de ayuda', 'help desk', 'sistema de tickets', 'ITSM', 'ITIL',
            'inventario de activos', 'gestión de activos TI', 'CMDB', 'soporte técnico',
            'mantenimiento preventivo', 'órdenes de trabajo', 'software de soporte',
            'help desk autoalojado', 'mesa de ayuda para colegios',
        ],
        tipo: 'website',
    })

    // Datos estructurados: ayudan a que el buscador entienda la página y
    // muestre las preguntas frecuentes directamente en los resultados.
    useEffect(() => {
        const datos = [
            {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'TicketWati',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                description:
                    'Mesa de ayuda e inventario tecnológico para organizaciones: tickets por ' +
                    'departamento, gestión de activos, mantenimiento preventivo e indicadores.',
                featureList: MODULOS.map((m) => m.titulo),
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                    description: 'Se instala en infraestructura propia, sin licencia por usuario.',
                },
            },
            {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: PREGUNTAS.map((f) => ({
                    '@type': 'Question',
                    name: f.p,
                    acceptedAnswer: { '@type': 'Answer', text: f.r },
                })),
            },
        ]

        const nodos = datos.map((d) => {
            const s = document.createElement('script')
            s.type = 'application/ld+json'
            s.dataset.seo = 'homepage'
            s.textContent = JSON.stringify(d)
            document.head.appendChild(s)
            return s
        })

        return () => nodos.forEach((n) => n.remove())
    }, [])

    return (
        <div className="min-h-screen bg-[var(--fondo)]">
            <CabeceraPublica />

            <main>
                {/* ═══ Presentación ═══════════════════════════ */}
                <section className="relative overflow-hidden">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                        style={{
                            backgroundImage:
                                'radial-gradient(60% 55% at 12% -10%, rgba(124,77,255,.16) 0%, transparent 60%),' +
                                'radial-gradient(45% 45% at 92% 5%, rgba(6,182,212,.14) 0%, transparent 55%)',
                        }}
                    />
                    <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
                        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--borde)] bg-[var(--superficie)] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 shadow-sm">
                            <Zap className="h-3.5 w-3.5" />
                            Mesa de ayuda + inventario
                        </p>

                        <h1 className="max-w-3xl font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
                            Deja de perder solicitudes{' '}
                            <span className="texto-degradado">en el camino</span>
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
                            TicketWati reúne lo que pide tu organización, mantiene el inventario de
                            equipos al día sin trabajo manual y te dice cuánto tarda de verdad tu
                            servicio en responder. En tu propio servidor, sin pagar por usuario.
                        </p>

                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <Link to="/login" className="btn btn-primary px-7 py-3.5 text-base">
                                Entrar a la plataforma
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <a href="#comparacion" className="btn btn-secondary px-7 py-3.5 text-base">
                                Ver qué cambia
                            </a>
                        </div>

                        <dl className="mt-16 grid grid-cols-2 gap-8 border-t border-[var(--borde)] pt-10 sm:grid-cols-4">
                            {[
                                ['10', 'módulos integrados'],
                                ['7', 'roles con permisos'],
                                ['0', 'coste por usuario'],
                                ['100%', 'en tu servidor'],
                            ].map(([valor, etiqueta]) => (
                                <div key={etiqueta}>
                                    <dt className="font-display text-4xl font-extrabold tracking-tight text-slate-900">
                                        {valor}
                                    </dt>
                                    <dd className="mt-1 text-sm text-slate-500">{etiqueta}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* ═══ Antes y después ════════════════════════ */}
                <section id="comparacion" className="border-t border-[var(--borde)] py-20" aria-labelledby="t-comparacion">
                    <div className="mx-auto max-w-5xl px-6">
                        <h2 id="t-comparacion" className="font-display text-3xl font-bold tracking-tight text-slate-900">
                            Qué cambia respecto a cómo trabajas hoy
                        </h2>
                        <p className="mt-3 max-w-2xl text-slate-600">
                            Si las solicitudes llegan por mensajes sueltos y el inventario vive en una
                            hoja de cálculo, esto es lo que se mueve.
                        </p>

                        <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--borde)]">
                            <div className="grid grid-cols-[1fr] divide-y divide-[var(--borde)] sm:grid-cols-[1.1fr_1fr_1fr] sm:divide-y-0">
                                <div className="hidden bg-[var(--superficie-tenue)] px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 sm:block" />
                                <div className="hidden items-center gap-2 bg-[var(--superficie-tenue)] px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 sm:flex">
                                    <X className="h-3.5 w-3.5" /> Hoy
                                </div>
                                <div className="hidden items-center gap-2 bg-[var(--superficie-tenue)] px-5 py-3 text-xs font-bold uppercase tracking-wider text-primary-600 sm:flex">
                                    <Check className="h-3.5 w-3.5" /> Con TicketWati
                                </div>
                            </div>

                            {COMPARACION.map((fila, i) => (
                                <div
                                    key={fila.tema}
                                    className={`grid grid-cols-1 gap-1 border-t border-[var(--borde)] sm:grid-cols-[1.1fr_1fr_1fr] sm:gap-0 ${i % 2 ? 'bg-[var(--superficie-tenue)]' : 'bg-[var(--superficie)]'
                                        }`}
                                >
                                    <div className="px-5 pt-4 text-sm font-semibold text-slate-900 sm:py-4">
                                        {fila.tema}
                                    </div>
                                    <div className="flex items-start gap-2 px-5 py-2 text-sm text-slate-500 sm:py-4">
                                        <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                        {fila.antes}
                                    </div>
                                    <div className="flex items-start gap-2 px-5 pb-4 pt-2 text-sm font-medium text-slate-700 sm:py-4">
                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                        {fila.despues}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══ Cada quien ve lo suyo ══════════════════ */}
                <section className="border-t border-[var(--borde)] py-20" aria-labelledby="t-roles">
                    <div className="mx-auto max-w-6xl px-6">
                        <h2 id="t-roles" className="font-display text-3xl font-bold tracking-tight text-slate-900">
                            Cada quien ve lo que le toca
                        </h2>
                        <p className="mt-3 max-w-2xl text-slate-600">
                            No todos necesitan aprender toda la plataforma. El alcance se aplica en el
                            servidor: no es sólo que la pantalla oculte cosas.
                        </p>

                        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
                            {ROLES.map(({ icono: Icono, rol, texto }) => (
                                <article key={rol} className="card card-interactiva p-6">
                                    <div className="mb-4 inline-flex rounded-xl bg-primary-50 p-3">
                                        <Icono className="h-6 w-6 text-primary-600" />
                                    </div>
                                    <h3 className="font-display text-lg font-bold text-slate-900">{rol}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{texto}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══ Módulos ════════════════════════════════ */}
                <section className="border-t border-[var(--borde)] bg-[var(--superficie-tenue)] py-20" aria-labelledby="t-modulos">
                    <div className="mx-auto max-w-6xl px-6">
                        <h2 id="t-modulos" className="font-display text-3xl font-bold tracking-tight text-slate-900">
                            Diez módulos que ya vienen conectados
                        </h2>
                        <p className="mt-3 max-w-2xl text-slate-600">
                            No hay complementos que comprar ni herramientas sueltas que integrar.
                            Puedes empezar usando sólo tickets.
                        </p>

                        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {MODULOS.map(({ icono: Icono, titulo, texto }) => (
                                <article key={titulo} className="card card-interactiva p-5">
                                    <Icono className="h-6 w-6 text-primary-500" aria-hidden="true" />
                                    <h3 className="mt-3.5 font-display font-bold text-slate-900">{titulo}</h3>
                                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{texto}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══ Inventario automático ══════════════════ */}
                <section className="border-t border-[var(--borde)] py-20" aria-labelledby="t-inventario">
                    <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-2">
                        <div>
                            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary-600">
                                Sin trabajo manual
                            </p>
                            <h2 id="t-inventario" className="font-display text-3xl font-bold tracking-tight text-slate-900">
                                Cada computador se inventaría solo
                            </h2>
                            <p className="mt-5 leading-relaxed text-slate-600">
                                Se instala un programa pequeño en los equipos con Windows. Una vez al día
                                envía su ficha completa: procesador, memoria, discos, red, programas
                                instalados, estado de la licencia y quién fue la última persona que
                                inició sesión.
                            </p>
                            <ul className="mt-7 space-y-3">
                                {[
                                    'Si el equipo es nuevo, se da de alta solo',
                                    'Se identifica por número de serie, sin duplicados',
                                    'Avisa cuando un equipo lleva tiempo sin reportar',
                                    'El resto del parque tiene ficha propia según su tipo',
                                ].map((linea) => (
                                    <li key={linea} className="flex items-start gap-3 text-slate-700">
                                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                                        <span>{linea}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0f1120] p-6 shadow-2xl">
                            <div className="mb-4 flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-red-400" />
                                <span className="h-3 w-3 rounded-full bg-amber-400" />
                                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                                <span className="ml-2 font-mono text-xs text-slate-400">agente de inventario</span>
                            </div>
                            <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-slate-300">
                                <code>{`Recopilando información del equipo…
  ✓ Procesador    Intel Core Ultra 5 125U
  ✓ Memoria       31.48 GB
  ✓ Disco         SSD 512 GB · 61% libre
  ✓ Red           192.168.1.45
  ✓ Sistema       Windows 11 Pro
  ✓ Programas     197 detectados

Enviando a TicketWati…
  ✓ Inventario del equipo actualizado`}</code>
                            </pre>
                        </div>
                    </div>
                </section>

                {/* ═══ Qué cuesta ═════════════════════════════ */}
                <section className="border-t border-[var(--borde)] bg-[var(--superficie-tenue)] py-20" aria-labelledby="t-costo">
                    <div className="mx-auto max-w-5xl px-6">
                        <h2 id="t-costo" className="font-display text-3xl font-bold tracking-tight text-slate-900">
                            Qué cuesta de verdad
                        </h2>
                        <p className="mt-3 max-w-2xl text-slate-600">
                            Sin licencias por usuario. Estos son los gastos reales que sí vas a tener.
                        </p>

                        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
                            <div className="card p-6">
                                <CircleDollarSign className="h-6 w-6 text-emerald-500" />
                                <h3 className="mt-3.5 font-display font-bold text-slate-900">El software</h3>
                                <p className="mt-1.5 text-3xl font-extrabold text-slate-900">Sin costo</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    Sin licencia por usuario ni por agente. Añadir gente al equipo no
                                    cambia lo que pagas.
                                </p>
                            </div>
                            <div className="card p-6">
                                <Server className="h-6 w-6 text-primary-500" />
                                <h3 className="mt-3.5 font-display font-bold text-slate-900">La infraestructura</h3>
                                <p className="mt-1.5 text-3xl font-extrabold text-slate-900">Tu servidor</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    Una máquina virtual modesta y un dominio. Si ya tienes servidores,
                                    puede que no gastes nada más.
                                </p>
                            </div>
                            <div className="card p-6">
                                <Clock className="h-6 w-6 text-amber-500" />
                                <h3 className="mt-3.5 font-display font-bold text-slate-900">La puesta en marcha</h3>
                                <p className="mt-1.5 text-3xl font-extrabold text-slate-900">Una tarde</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    Instalar es rápido. Acordar departamentos y tiempos de respuesta es
                                    lo que de verdad lleva tiempo.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ═══ Requisitos ═════════════════════════════ */}
                <section className="border-t border-[var(--borde)] py-20" aria-labelledby="t-requisitos">
                    <div className="mx-auto max-w-6xl px-6">
                        <h2 id="t-requisitos" className="font-display text-3xl font-bold tracking-tight text-slate-900">
                            Qué necesitas para empezar
                        </h2>
                        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {REQUISITOS.map(({ icono: Icono, titulo, texto }) => (
                                <div key={titulo} className="card p-5">
                                    <Icono className="h-5 w-5 text-slate-400" />
                                    <p className="mt-3 font-semibold text-slate-900">{titulo}</p>
                                    <p className="mt-1 text-sm text-slate-500">{texto}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--borde)] bg-[var(--superficie-tenue)] p-5">
                            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
                            <p className="text-sm text-slate-600">
                                <span className="font-semibold text-slate-900">Tus datos no salen de tu infraestructura.</span>{' '}
                                Contraseñas cifradas, sesiones con caducidad, aislamiento entre
                                organizaciones aplicado en el servidor y adjuntos que sólo se sirven con
                                sesión válida.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ═══ Preguntas frecuentes ═══════════════════ */}
                <section className="border-t border-[var(--borde)] bg-[var(--superficie-tenue)] py-20" aria-labelledby="t-faq">
                    <div className="mx-auto max-w-4xl px-6">
                        <h2 id="t-faq" className="font-display text-3xl font-bold tracking-tight text-slate-900">
                            Preguntas que suelen hacer
                        </h2>

                        <div className="mt-10 space-y-3">
                            {PREGUNTAS.map(({ p, r }) => (
                                <details
                                    key={p}
                                    className="group card overflow-hidden p-0 [&[open]]:border-primary-300"
                                >
                                    <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 marker:content-none">
                                        {p}
                                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                                    </summary>
                                    <p className="border-t border-[var(--borde)] px-5 py-4 leading-relaxed text-slate-600">
                                        {r}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══ Tecnología ═════════════════════════════ */}
                <section className="border-t border-[var(--borde)] py-16" aria-labelledby="t-tecnologia">
                    <div className="mx-auto max-w-6xl px-6">
                        <h2 id="t-tecnologia" className="font-display text-2xl font-bold tracking-tight text-slate-900">
                            Construido con tecnología corriente
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600">
                            Sin piezas propietarias. Cualquier equipo de desarrollo puede mantenerlo.
                        </p>
                        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {[
                                { icono: Database, nombre: 'PostgreSQL', detalle: 'Base de datos' },
                                { icono: Server, nombre: 'Node.js', detalle: 'Servidor' },
                                { icono: Zap, nombre: 'React', detalle: 'Interfaz' },
                                { icono: Cpu, nombre: 'Python', detalle: 'Agente de inventario' },
                            ].map(({ icono: Icono, nombre, detalle }) => (
                                <div key={nombre} className="card p-5 text-center">
                                    <Icono className="mx-auto h-6 w-6 text-slate-400" />
                                    <p className="mt-3 font-display font-bold text-slate-900">{nombre}</p>
                                    <p className="text-xs text-slate-500">{detalle}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══ Cierre ═════════════════════════════════ */}
                <section className="px-6 py-20">
                    <div
                        className="mx-auto max-w-4xl overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-14"
                        style={{
                            backgroundImage:
                                'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500) 55%, var(--color-accent-500))',
                        }}
                    >
                        <h2 className="font-display text-3xl font-extrabold tracking-tight text-white">
                            Empieza por un solo departamento
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-white/85">
                            No hace falta desplegarlo en toda la organización el primer día. Un área,
                            dos semanas, y ya tendrás datos para decidir si sigue.
                        </p>
                        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                            <Link to="/login" className="btn btn-sobre-color px-7 py-3.5 text-base">
                                Iniciar sesión
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                to="/ayuda"
                                className="btn px-7 py-3.5 text-base text-white ring-1 ring-inset ring-white/35 hover:bg-white/10"
                            >
                                Leer la guía de uso
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <PieDePagina />
        </div>
    )
}

// ─────────────────────────────────────────── Cabecera y pie
export function CabeceraPublica() {
    const { tema } = useTema()

    return (
        <header className="sticky top-0 z-40 border-b border-[var(--borde)]">
            <div className="cristal">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
                    <Link to="/" className="flex items-center gap-2.5" aria-label="TicketWati, inicio">
                        <span
                            className="grid h-9 w-9 place-items-center rounded-xl font-display text-lg font-bold text-white"
                            style={{
                                backgroundImage: 'linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500))',
                                boxShadow: '0 6px 16px rgba(124,77,255,.32)',
                            }}
                        >
                            T
                        </span>
                        <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                            TicketWati
                        </span>
                    </Link>

                    <nav className="flex items-center gap-1 sm:gap-3" aria-label="Principal">
                        <Link
                            to="/ayuda"
                            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:block"
                        >
                            Guía de uso
                        </Link>
                        <BotonTema />
                        <Link to="/login" className="btn btn-primary" aria-label={`Entrar (tema ${tema})`}>
                            Entrar
                        </Link>
                    </nav>
                </div>
            </div>
        </header>
    )
}

export function PieDePagina() {
    return (
        <footer className="border-t border-[var(--borde)] bg-[var(--superficie-tenue)]">
            <div className="mx-auto max-w-6xl px-6 py-12">
                <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span
                                className="grid h-8 w-8 place-items-center rounded-lg font-display text-sm font-bold text-white"
                                style={{ backgroundImage: 'linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500))' }}
                            >
                                T
                            </span>
                            <span className="font-display font-bold text-slate-900">TicketWati</span>
                        </div>
                        <p className="mt-3 max-w-md text-sm text-slate-500">
                            Mesa de ayuda e inventario tecnológico para organizaciones.
                        </p>
                    </div>

                    <nav className="flex gap-6 text-sm" aria-label="Pie de página">
                        <Link to="/ayuda" className="text-slate-600 transition hover:text-slate-900">
                            Guía de uso
                        </Link>
                        <Link to="/login" className="text-slate-600 transition hover:text-slate-900">
                            Iniciar sesión
                        </Link>
                    </nav>
                </div>

                <p className="mt-8 border-t border-[var(--borde)] pt-6 text-xs text-slate-400">
                    © {new Date().getFullYear()} TicketWati. Todos los derechos reservados.
                </p>
            </div>
        </footer>
    )
}

export default HomePage
