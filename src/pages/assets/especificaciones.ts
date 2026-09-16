/**
 * Fichas técnicas por categoría de activo.
 *
 * No todo el inventario es un computador. El agente automático sólo cubre
 * equipos con Windows; un teléfono, una impresora o un switch necesitan
 * otros datos y se registran a mano.
 *
 * Aquí se declara qué información técnica tiene sentido para cada categoría.
 * La interfaz construye el formulario y la vista a partir de esta definición,
 * así que añadir un campo nuevo no requiere tocar ningún componente.
 */
import {
    Laptop, Smartphone, Printer, Network, Server, MonitorSmartphone,
    BatteryCharging, Video, Mouse, Boxes, Camera, Wifi, Phone,
    type LucideIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────── Tipos
export type TipoCampo = 'texto' | 'numero' | 'lista' | 'fecha' | 'booleano' | 'textarea'

export interface CampoTecnico {
    /** Clave con la que se guarda en assets.custom_fields */
    clave: string
    etiqueta: string
    tipo: TipoCampo
    /** Unidad que se muestra junto al valor: GB, pulgadas, VA… */
    unidad?: string
    /** Opciones cuando el tipo es 'lista' */
    opciones?: string[]
    /** Texto de ayuda bajo el campo */
    ayuda?: string
    /** Marcador dentro del campo vacío */
    ejemplo?: string
}

export interface GrupoCampos {
    titulo: string
    icono: LucideIcon
    campos: CampoTecnico[]
}

export interface CategoriaActivo {
    /** Identificador estable que se guarda en asset_types.category */
    id: string
    nombre: string
    descripcion: string
    icono: LucideIcon
    /** Si el agente automático puede cubrir esta categoría */
    admiteAgente: boolean
    grupos: GrupoCampos[]
}

// ─────────────────────────────────────────────── Catálogo
export const CATEGORIAS: CategoriaActivo[] = [
    // ══════════════════════════════════════ Cómputo
    {
        id: 'computo',
        nombre: 'Equipo de cómputo',
        descripcion: 'Computadores de escritorio, portátiles y todo-en-uno.',
        icono: Laptop,
        admiteAgente: true,
        grupos: [
            {
                titulo: 'Procesamiento',
                icono: Laptop,
                campos: [
                    { clave: 'cpu', etiqueta: 'Procesador', tipo: 'texto', ejemplo: 'Intel Core i5-1235U' },
                    { clave: 'ram_gb', etiqueta: 'Memoria RAM', tipo: 'numero', unidad: 'GB' },
                    { clave: 'almacenamiento', etiqueta: 'Almacenamiento', tipo: 'texto', ejemplo: 'SSD 512 GB' },
                    { clave: 'tipo_disco', etiqueta: 'Tipo de disco', tipo: 'lista', opciones: ['SSD', 'HDD', 'SSD + HDD', 'NVMe'] },
                ],
            },
            {
                titulo: 'Sistema',
                icono: MonitorSmartphone,
                campos: [
                    { clave: 'sistema_operativo', etiqueta: 'Sistema operativo', tipo: 'texto', ejemplo: 'Windows 11 Pro' },
                    { clave: 'licencia_so', etiqueta: 'Licencia', tipo: 'lista', opciones: ['OEM', 'Retail', 'Volumen', 'Sin licencia'] },
                    { clave: 'ofimatica', etiqueta: 'Suite ofimática', tipo: 'texto', ejemplo: 'Microsoft 365' },
                    { clave: 'antivirus', etiqueta: 'Antivirus', tipo: 'texto' },
                ],
            },
            {
                titulo: 'Conectividad',
                icono: Network,
                campos: [
                    { clave: 'direccion_ip', etiqueta: 'Dirección IP', tipo: 'texto', ejemplo: '192.168.1.50' },
                    { clave: 'direccion_mac', etiqueta: 'Dirección MAC', tipo: 'texto' },
                    { clave: 'nombre_red', etiqueta: 'Nombre en red', tipo: 'texto' },
                ],
            },
        ],
    },

    // ══════════════════════════════════════ Móviles
    {
        id: 'movil',
        nombre: 'Teléfono o tableta',
        descripcion: 'Teléfonos móviles, tabletas y dispositivos de mano.',
        icono: Smartphone,
        admiteAgente: false,
        grupos: [
            {
                titulo: 'Identificación del equipo',
                icono: Smartphone,
                campos: [
                    { clave: 'imei', etiqueta: 'IMEI', tipo: 'texto', ayuda: 'Se consulta marcando *#06# en el teléfono.' },
                    { clave: 'imei_2', etiqueta: 'IMEI secundario', tipo: 'texto', ayuda: 'Sólo en equipos con doble SIM.' },
                    { clave: 'sistema_operativo', etiqueta: 'Sistema operativo', tipo: 'lista', opciones: ['Android', 'iOS', 'HarmonyOS', 'Otro'] },
                    { clave: 'version_so', etiqueta: 'Versión', tipo: 'texto', ejemplo: 'Android 14' },
                ],
            },
            {
                titulo: 'Capacidades',
                icono: Boxes,
                campos: [
                    { clave: 'almacenamiento_gb', etiqueta: 'Almacenamiento', tipo: 'numero', unidad: 'GB' },
                    { clave: 'ram_gb', etiqueta: 'Memoria RAM', tipo: 'numero', unidad: 'GB' },
                    { clave: 'tamano_pantalla', etiqueta: 'Tamaño de pantalla', tipo: 'numero', unidad: 'pulgadas' },
                    { clave: 'salud_bateria', etiqueta: 'Salud de la batería', tipo: 'numero', unidad: '%', ayuda: 'Útil para decidir cuándo reemplazar el equipo.' },
                ],
            },
            {
                titulo: 'Línea telefónica',
                icono: Phone,
                campos: [
                    { clave: 'numero_linea', etiqueta: 'Número de línea', tipo: 'texto' },
                    { clave: 'operador', etiqueta: 'Operador', tipo: 'texto', ejemplo: 'Claro, Movistar, Tigo…' },
                    { clave: 'tipo_plan', etiqueta: 'Tipo de plan', tipo: 'lista', opciones: ['Pospago', 'Prepago', 'Corporativo', 'Sin línea'] },
                    { clave: 'plan_datos', etiqueta: 'Plan de datos', tipo: 'texto', ejemplo: '20 GB mensuales' },
                    { clave: 'vence_contrato', etiqueta: 'Vence el contrato', tipo: 'fecha' },
                ],
            },
            {
                titulo: 'Gestión y seguridad',
                icono: Wifi,
                campos: [
                    { clave: 'mdm', etiqueta: 'Administrado por MDM', tipo: 'booleano', ayuda: 'Si está inscrito en una plataforma de gestión de dispositivos.' },
                    { clave: 'cuenta_asociada', etiqueta: 'Cuenta asociada', tipo: 'texto', ejemplo: 'Apple ID o cuenta de Google' },
                    { clave: 'bloqueo_activo', etiqueta: 'Bloqueo de pantalla', tipo: 'booleano' },
                    { clave: 'accesorios', etiqueta: 'Accesorios entregados', tipo: 'textarea', ejemplo: 'Cargador, funda, protector de pantalla' },
                ],
            },
        ],
    },

    // ══════════════════════════════════════ Impresión
    {
        id: 'impresion',
        nombre: 'Impresora o multifuncional',
        descripcion: 'Impresoras, escáneres y equipos multifuncionales.',
        icono: Printer,
        admiteAgente: false,
        grupos: [
            {
                titulo: 'Características',
                icono: Printer,
                campos: [
                    { clave: 'tecnologia', etiqueta: 'Tecnología', tipo: 'lista', opciones: ['Láser', 'Inyección de tinta', 'Matriz de punto', 'Térmica', 'Sublimación'] },
                    { clave: 'color', etiqueta: 'Imprime a color', tipo: 'booleano' },
                    { clave: 'duplex', etiqueta: 'Impresión a doble cara', tipo: 'booleano' },
                    { clave: 'funciones', etiqueta: 'Funciones', tipo: 'texto', ejemplo: 'Imprime, escanea, copia, fax' },
                    { clave: 'formato_maximo', etiqueta: 'Formato máximo', tipo: 'lista', opciones: ['Carta', 'Oficio', 'A4', 'A3', 'Tabloide'] },
                    { clave: 'velocidad_ppm', etiqueta: 'Velocidad', tipo: 'numero', unidad: 'ppm', ayuda: 'Páginas por minuto según el fabricante.' },
                ],
            },
            {
                titulo: 'Consumibles',
                icono: Boxes,
                campos: [
                    { clave: 'referencia_toner', etiqueta: 'Referencia del tóner o cartucho', tipo: 'texto', ejemplo: 'HP 26A / CF226A', ayuda: 'Anotarla evita comprar el consumible equivocado.' },
                    { clave: 'rendimiento_paginas', etiqueta: 'Rendimiento del consumible', tipo: 'numero', unidad: 'páginas' },
                    { clave: 'ultimo_cambio_toner', etiqueta: 'Último cambio de consumible', tipo: 'fecha' },
                    { clave: 'contador_paginas', etiqueta: 'Contador de páginas', tipo: 'numero', unidad: 'páginas', ayuda: 'Se consulta en el informe de estado del equipo.' },
                ],
            },
            {
                titulo: 'Conexión',
                icono: Network,
                campos: [
                    { clave: 'conectividad', etiqueta: 'Conectividad', tipo: 'texto', ejemplo: 'Red, USB, Wi-Fi' },
                    { clave: 'direccion_ip', etiqueta: 'Dirección IP', tipo: 'texto' },
                    { clave: 'nombre_cola', etiqueta: 'Nombre en el servidor de impresión', tipo: 'texto' },
                    { clave: 'compartida', etiqueta: 'Compartida en red', tipo: 'booleano' },
                ],
            },
        ],
    },

    // ══════════════════════════════════════ Red
    {
        id: 'red',
        nombre: 'Equipo de red',
        descripcion: 'Switches, routers, puntos de acceso y firewalls.',
        icono: Network,
        admiteAgente: false,
        grupos: [
            {
                titulo: 'Capacidad',
                icono: Network,
                campos: [
                    { clave: 'tipo_equipo', etiqueta: 'Tipo', tipo: 'lista', opciones: ['Switch', 'Router', 'Punto de acceso', 'Firewall', 'Módem', 'Controladora'] },
                    { clave: 'puertos', etiqueta: 'Número de puertos', tipo: 'numero' },
                    { clave: 'velocidad_puertos', etiqueta: 'Velocidad de puertos', tipo: 'lista', opciones: ['100 Mbps', '1 Gbps', '2.5 Gbps', '10 Gbps'] },
                    { clave: 'poe', etiqueta: 'Alimenta por PoE', tipo: 'booleano', ayuda: 'Si entrega energía por el cable de red.' },
                    { clave: 'administrable', etiqueta: 'Administrable', tipo: 'booleano' },
                ],
            },
            {
                titulo: 'Configuración',
                icono: Wifi,
                campos: [
                    { clave: 'ip_gestion', etiqueta: 'IP de administración', tipo: 'texto' },
                    { clave: 'vlans', etiqueta: 'VLANs configuradas', tipo: 'texto', ejemplo: '10, 20, 30' },
                    { clave: 'version_firmware', etiqueta: 'Versión de firmware', tipo: 'texto' },
                    { clave: 'ultima_actualizacion_fw', etiqueta: 'Última actualización', tipo: 'fecha' },
                    { clave: 'respaldo_config', etiqueta: 'Configuración respaldada', tipo: 'booleano', ayuda: 'Clave para poder reponer el equipo si falla.' },
                ],
            },
            {
                titulo: 'Ubicación en la red',
                icono: Server,
                campos: [
                    { clave: 'rack', etiqueta: 'Rack o gabinete', tipo: 'texto' },
                    { clave: 'unidad_rack', etiqueta: 'Posición en el rack', tipo: 'texto', ejemplo: 'U12' },
                    { clave: 'equipo_superior', etiqueta: 'Conectado a', tipo: 'texto', ejemplo: 'Switch principal, puerto 24' },
                ],
            },
        ],
    },

    // ══════════════════════════════════════ Servidores
    {
        id: 'servidor',
        nombre: 'Servidor',
        descripcion: 'Servidores físicos, almacenamiento y virtualización.',
        icono: Server,
        admiteAgente: true,
        grupos: [
            {
                titulo: 'Recursos',
                icono: Server,
                campos: [
                    { clave: 'procesadores', etiqueta: 'Procesadores', tipo: 'texto', ejemplo: '2 × Intel Xeon Silver 4210' },
                    { clave: 'nucleos_totales', etiqueta: 'Núcleos totales', tipo: 'numero' },
                    { clave: 'ram_gb', etiqueta: 'Memoria RAM', tipo: 'numero', unidad: 'GB' },
                    { clave: 'almacenamiento_total', etiqueta: 'Almacenamiento total', tipo: 'texto', ejemplo: '4 × 1.2 TB SAS' },
                    { clave: 'configuracion_raid', etiqueta: 'Configuración RAID', tipo: 'lista', opciones: ['RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10', 'Sin RAID'] },
                ],
            },
            {
                titulo: 'Sistema y servicios',
                icono: MonitorSmartphone,
                campos: [
                    { clave: 'sistema_operativo', etiqueta: 'Sistema operativo', tipo: 'texto', ejemplo: 'Windows Server 2022 / Ubuntu 24.04' },
                    { clave: 'virtualizacion', etiqueta: 'Plataforma de virtualización', tipo: 'texto', ejemplo: 'VMware ESXi, Proxmox, Hyper-V' },
                    { clave: 'servicios', etiqueta: 'Servicios que aloja', tipo: 'textarea', ejemplo: 'Directorio activo, archivos, base de datos' },
                    { clave: 'respaldo_configurado', etiqueta: 'Respaldo configurado', tipo: 'booleano' },
                ],
            },
            {
                titulo: 'Gestión remota',
                icono: Network,
                campos: [
                    { clave: 'ip_gestion', etiqueta: 'IP de gestión (iDRAC / iLO)', tipo: 'texto' },
                    { clave: 'direccion_ip', etiqueta: 'IP de servicio', tipo: 'texto' },
                    { clave: 'rack', etiqueta: 'Rack o gabinete', tipo: 'texto' },
                    { clave: 'fuentes_redundantes', etiqueta: 'Fuentes redundantes', tipo: 'booleano' },
                ],
            },
        ],
    },

    // ══════════════════════════════════════ Pantallas
    {
        id: 'pantalla',
        nombre: 'Monitor o pantalla',
        descripcion: 'Monitores, televisores y pantallas interactivas.',
        icono: MonitorSmartphone,
        admiteAgente: false,
        grupos: [
            {
                titulo: 'Imagen',
                icono: MonitorSmartphone,
                campos: [
                    { clave: 'tamano_pulgadas', etiqueta: 'Tamaño', tipo: 'numero', unidad: 'pulgadas' },
                    { clave: 'resolucion', etiqueta: 'Resolución', tipo: 'lista', opciones: ['1366×768', '1920×1080 (Full HD)', '2560×1440 (QHD)', '3840×2160 (4K)'] },
                    { clave: 'tipo_panel', etiqueta: 'Tipo de panel', tipo: 'lista', opciones: ['IPS', 'VA', 'TN', 'OLED', 'LED'] },
                    { clave: 'frecuencia_hz', etiqueta: 'Frecuencia', tipo: 'numero', unidad: 'Hz' },
                    { clave: 'tactil', etiqueta: 'Pantalla táctil', tipo: 'booleano' },
                ],
            },
            {
                titulo: 'Conexiones',
                icono: Network,
                campos: [
                    { clave: 'entradas', etiqueta: 'Entradas disponibles', tipo: 'texto', ejemplo: 'HDMI ×2, VGA, DisplayPort' },
                    { clave: 'parlantes', etiqueta: 'Parlantes integrados', tipo: 'booleano' },
                    { clave: 'soporte_vesa', etiqueta: 'Soporte VESA', tipo: 'texto', ejemplo: '100×100 mm' },
                ],
            },
        ],
    },

    // ══════════════════════════════════════ Energía
    {
        id: 'energia',
        nombre: 'Equipo de energía',
        descripcion: 'UPS, reguladores y plantas eléctricas.',
        icono: BatteryCharging,
        admiteAgente: false,
        grupos: [
            {
                titulo: 'Capacidad',
                icono: BatteryCharging,
                campos: [
                    { clave: 'capacidad_va', etiqueta: 'Capacidad', tipo: 'numero', unidad: 'VA' },
                    { clave: 'potencia_w', etiqueta: 'Potencia real', tipo: 'numero', unidad: 'W' },
                    { clave: 'autonomia_min', etiqueta: 'Autonomía estimada', tipo: 'numero', unidad: 'minutos' },
                    { clave: 'tomas', etiqueta: 'Número de tomas', tipo: 'numero' },
                    { clave: 'tipo_ups', etiqueta: 'Tipo', tipo: 'lista', opciones: ['En línea (online)', 'Interactiva', 'Standby', 'Regulador'] },
                ],
            },
            {
                titulo: 'Baterías',
                icono: Boxes,
                campos: [
                    { clave: 'cantidad_baterias', etiqueta: 'Cantidad de baterías', tipo: 'numero' },
                    { clave: 'referencia_bateria', etiqueta: 'Referencia de batería', tipo: 'texto', ejemplo: '12V 9Ah' },
                    { clave: 'ultimo_cambio_bateria', etiqueta: 'Último cambio', tipo: 'fecha' },
                    { clave: 'proximo_cambio_bateria', etiqueta: 'Próximo cambio estimado', tipo: 'fecha', ayuda: 'Las baterías suelen durar entre 3 y 5 años.' },
                ],
            },
            {
                titulo: 'Equipos protegidos',
                icono: Server,
                campos: [
                    { clave: 'equipos_conectados', etiqueta: 'Qué protege', tipo: 'textarea', ejemplo: 'Servidor principal, switch de núcleo' },
                    { clave: 'carga_actual', etiqueta: 'Carga actual', tipo: 'numero', unidad: '%' },
                ],
            },
        ],
    },

    // ══════════════════════════════════════ Audiovisual
    {
        id: 'audiovisual',
        nombre: 'Equipo audiovisual',
        descripcion: 'Proyectores, cámaras, sonido y videoconferencia.',
        icono: Video,
        admiteAgente: false,
        grupos: [
            {
                titulo: 'Características',
                icono: Video,
                campos: [
                    { clave: 'tipo_equipo', etiqueta: 'Tipo', tipo: 'lista', opciones: ['Proyector', 'Cámara', 'Micrófono', 'Parlantes', 'Amplificador', 'Barra de videoconferencia'] },
                    { clave: 'resolucion', etiqueta: 'Resolución', tipo: 'texto', ejemplo: '1920×1080' },
                    { clave: 'brillo_lumenes', etiqueta: 'Brillo', tipo: 'numero', unidad: 'lúmenes', ayuda: 'Sólo aplica a proyectores.' },
                    { clave: 'horas_lampara', etiqueta: 'Horas de lámpara', tipo: 'numero', unidad: 'horas' },
                ],
            },
            {
                titulo: 'Instalación',
                icono: Camera,
                campos: [
                    { clave: 'entradas', etiqueta: 'Conexiones', tipo: 'texto', ejemplo: 'HDMI, VGA, USB-C' },
                    { clave: 'montaje', etiqueta: 'Tipo de montaje', tipo: 'lista', opciones: ['Techo', 'Pared', 'Mesa', 'Trípode', 'Móvil'] },
                    { clave: 'espacio', etiqueta: 'Espacio donde está instalado', tipo: 'texto', ejemplo: 'Aula 201, Sala de juntas' },
                ],
            },
        ],
    },

    // ══════════════════════════════════════ Periféricos
    {
        id: 'periferico',
        nombre: 'Periférico',
        descripcion: 'Teclados, ratones, escáneres, lectores y accesorios.',
        icono: Mouse,
        admiteAgente: false,
        grupos: [
            {
                titulo: 'Características',
                icono: Mouse,
                campos: [
                    { clave: 'tipo_equipo', etiqueta: 'Tipo', tipo: 'texto', ejemplo: 'Teclado, ratón, escáner, lector de código' },
                    { clave: 'conexion', etiqueta: 'Conexión', tipo: 'lista', opciones: ['USB', 'Inalámbrico', 'Bluetooth', 'PS/2'] },
                    { clave: 'requiere_pilas', etiqueta: 'Requiere pilas', tipo: 'booleano' },
                    { clave: 'equipo_asociado', etiqueta: 'Asociado al equipo', tipo: 'texto', ayuda: 'Nombre o etiqueta del computador con el que se usa.' },
                ],
            },
        ],
    },

    // ══════════════════════════════════════ Otro
    {
        id: 'otro',
        nombre: 'Otro tipo de activo',
        descripcion: 'Mobiliario, herramientas y equipos que no encajan en las demás categorías.',
        icono: Boxes,
        admiteAgente: false,
        grupos: [
            {
                titulo: 'Información general',
                icono: Boxes,
                campos: [
                    { clave: 'descripcion_tecnica', etiqueta: 'Descripción técnica', tipo: 'textarea' },
                    { clave: 'dimensiones', etiqueta: 'Dimensiones', tipo: 'texto', ejemplo: '120 × 60 × 75 cm' },
                    { clave: 'material', etiqueta: 'Material', tipo: 'texto' },
                    { clave: 'requiere_mantenimiento', etiqueta: 'Requiere mantenimiento periódico', tipo: 'booleano' },
                    { clave: 'periodicidad_mantenimiento', etiqueta: 'Cada cuánto', tipo: 'texto', ejemplo: 'Cada 6 meses' },
                ],
            },
        ],
    },
]

// ─────────────────────────────────────────────── Utilidades
const PORINDICE = new Map(CATEGORIAS.map((c) => [c.id, c]))

export function obtenerCategoria(id?: string | null): CategoriaActivo | undefined {
    return id ? PORINDICE.get(id) : undefined
}

/**
 * Deduce la categoría a partir del nombre o modelo del activo.
 *
 * Se usa cuando alguien no ha asignado tipo todavía: es mejor proponer una
 * ficha aproximada que mostrar una pantalla vacía.
 */
export function deducirCategoria(...textos: (string | null | undefined)[]): string {
    const t = textos.filter(Boolean).join(' ').toLowerCase()

    const reglas: [string, RegExp][] = [
        ['movil', /tel[eé]fono|celular|smartphone|iphone|xiaomi|samsung galaxy|motorola|tablet|tableta|ipad/],
        ['impresion', /impresora|printer|laserjet|deskjet|multifuncional|esc[aá]ner|scanner|plotter|copiadora/],
        ['red', /switch|router|firewall|access point|punto de acceso|cisco|mikrotik|ubiquiti|m[oó]dem|catalyst/],
        ['servidor', /servidor|server|poweredge|proliant|nas|storage|rack/],
        ['pantalla', /monitor|pantalla|televisor|smart tv|display|proyecci[oó]n interactiva/],
        ['energia', /ups|regulador|planta el[eé]ctrica|bater[ií]a|no break/],
        ['audiovisual', /proyector|videobeam|c[aá]mara|micr[oó]fono|parlante|sonido|videoconferencia/],
        ['periferico', /teclado|rat[oó]n|mouse|lector|diadema|audifono|aud[ií]fono|webcam|docking/],
        ['computo', /computador|equipo de c[oó]mputo|laptop|port[aá]til|macbook|thinkpad|desktop|pc|all.?in.?one/],
    ]

    for (const [categoria, patron] of reglas) {
        if (patron.test(t)) return categoria
    }
    return 'otro'
}

/** Todas las claves técnicas de una categoría, en orden. */
export function clavesDeCategoria(id: string): string[] {
    const cat = obtenerCategoria(id)
    if (!cat) return []
    return cat.grupos.flatMap((g) => g.campos.map((c) => c.clave))
}

/** Cuántos campos de la ficha están completos. */
export function calcularCompletitud(
    categoriaId: string,
    valores: Record<string, unknown> = {}
): { completos: number; total: number; porcentaje: number } {
    const claves = clavesDeCategoria(categoriaId)
    const completos = claves.filter((k) => {
        const v = valores[k]
        return v !== undefined && v !== null && v !== '' && v !== false
    }).length

    return {
        completos,
        total: claves.length,
        porcentaje: claves.length === 0 ? 0 : Math.round((completos / claves.length) * 100),
    }
}

/** Formatea un valor para mostrarlo en la ficha. */
export function formatearValor(campo: CampoTecnico, valor: unknown): string {
    if (valor === undefined || valor === null || valor === '') return '—'

    if (campo.tipo === 'booleano') return valor ? 'Sí' : 'No'

    if (campo.tipo === 'fecha') {
        const fecha = new Date(String(valor))
        if (Number.isNaN(fecha.getTime())) return String(valor)
        return fecha.toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })
    }

    const texto = String(valor)
    return campo.unidad ? `${texto} ${campo.unidad}` : texto
}
