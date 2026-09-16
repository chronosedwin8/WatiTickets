/**
 * Contenido de la guía de uso.
 *
 * Se mantiene separado de la vista para que actualizar la documentación no
 * implique tocar el componente. Cada sección se identifica por su `id`, que
 * es también el ancla de la URL.
 */

export interface Bloque {
    tipo: 'parrafo' | 'pasos' | 'lista' | 'aviso' | 'tabla'
    texto?: string
    items?: string[]
    /** Sólo para 'aviso'. */
    estilo?: 'info' | 'atencion' | 'consejo'
    titulo?: string
    /** Sólo para 'tabla'. */
    columnas?: string[]
    filas?: string[][]
}

export interface Seccion {
    id: string
    titulo: string
    resumen: string
    bloques: Bloque[]
}

export interface Capitulo {
    id: string
    titulo: string
    descripcion: string
    secciones: Seccion[]
}

export const CAPITULOS: Capitulo[] = [
    // ══════════════════════════════════════════════════════════
    {
        id: 'primeros-pasos',
        titulo: 'Primeros pasos',
        descripcion: 'Qué es la plataforma, cómo entrar y cómo moverse por ella.',
        secciones: [
            {
                id: 'que-es',
                titulo: '¿Qué es TicketWati?',
                resumen: 'Para qué sirve y qué problema resuelve.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'TicketWati es el lugar donde se registran y resuelven las solicitudes de ' +
                            'toda la organización. En lugar de pedir ayuda por correo, WhatsApp o de ' +
                            'palabra —donde las peticiones se pierden— cada solicitud se convierte en un ' +
                            'ticket con responsable, fecha de compromiso y un historial de lo que se hizo.',
                    },
                    {
                        tipo: 'parrafo',
                        texto:
                            'Además del soporte, la plataforma mantiene el inventario de equipos, ' +
                            'planifica el mantenimiento preventivo, documenta procedimientos y mide ' +
                            'cuánto tarda el servicio en responder.',
                    },
                    {
                        tipo: 'lista',
                        titulo: 'Lo que puedes hacer aquí',
                        items: [
                            'Pedir ayuda y seguir el estado de tu solicitud',
                            'Atender solicitudes si formas parte de un equipo de soporte',
                            'Consultar qué equipos hay, dónde están y quién los usa',
                            'Programar mantenimientos que se repiten cada cierto tiempo',
                            'Solicitar permisos y ausencias',
                            'Consultar procedimientos en la base de conocimiento',
                        ],
                    },
                ],
            },
            {
                id: 'entrar',
                titulo: 'Entrar por primera vez',
                resumen: 'Cómo iniciar sesión y qué hacer si olvidaste tu contraseña.',
                bloques: [
                    {
                        tipo: 'pasos',
                        titulo: 'Iniciar sesión',
                        items: [
                            'Abre la dirección de la plataforma que te compartió tu organización.',
                            'Escribe el correo electrónico con el que te registraron.',
                            'Escribe tu contraseña y pulsa «Ingresar».',
                            'Verás el panel de inicio con lo que te corresponde según tu rol.',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'info',
                        titulo: 'No tengo cuenta',
                        texto:
                            'Las cuentas las crea el administrador de tu organización desde ' +
                            'Configuración → Equipo. Si no puedes entrar, pídele que te dé de alta ' +
                            'indicando tu correo y a qué departamento perteneces.',
                    },
                    {
                        tipo: 'pasos',
                        titulo: 'Olvidé mi contraseña',
                        items: [
                            'En la pantalla de acceso, pulsa «¿Recuperar contraseña?».',
                            'Escribe tu correo y envía la solicitud.',
                            'Recibirás un enlace válido durante una hora.',
                            'Abre el enlace y define tu nueva contraseña (mínimo 8 caracteres, con letras y números).',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'atencion',
                        texto:
                            'Si tras varios intentos fallidos la cuenta se bloquea, espera unos minutos ' +
                            'antes de volver a intentarlo. Es una protección contra accesos no autorizados.',
                    },
                ],
            },
            {
                id: 'roles',
                titulo: 'Los roles y qué puede hacer cada uno',
                resumen: 'Qué ve y qué puede modificar cada tipo de usuario.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'Lo que ves en el menú depende de tu rol. Un mismo usuario no necesita ' +
                            'aprender toda la plataforma: sólo la parte que le toca.',
                    },
                    {
                        tipo: 'tabla',
                        columnas: ['Rol', 'Qué hace', 'Alcance'],
                        filas: [
                            ['Administrador', 'Configura todo el sistema, crea usuarios y define permisos', 'Toda la organización'],
                            ['Gerente', 'Supervisa su área, aprueba solicitudes y revisa indicadores', 'Sus departamentos'],
                            ['Agente', 'Atiende y resuelve tickets', 'Los tickets de su equipo'],
                            ['Técnico', 'Ejecuta órdenes de trabajo y mantenimientos en campo', 'Su trabajo asignado'],
                            ['Desarrollador', 'Gestiona el tablero de desarrollo e historias', 'Proyectos asignados'],
                            ['Cliente / Usuario final', 'Crea solicitudes y sigue su estado', 'Sólo sus propios tickets'],
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'consejo',
                        texto:
                            'El administrador puede ajustar qué secciones ve cada rol desde ' +
                            'Configuración → Permisos de menú, así que tu menú puede diferir de esta tabla.',
                    },
                ],
            },
        ],
    },

    // ══════════════════════════════════════════════════════════
    {
        id: 'usuario-final',
        titulo: 'Guía para quien pide ayuda',
        descripcion: 'Para el rol Cliente: cómo pedir soporte y hacer seguimiento.',
        secciones: [
            {
                id: 'crear-ticket',
                titulo: 'Crear una solicitud',
                resumen: 'Cómo pedir ayuda y qué información incluir.',
                bloques: [
                    {
                        tipo: 'pasos',
                        titulo: 'Paso a paso',
                        items: [
                            'Entra a «Tickets» en el menú lateral.',
                            'Pulsa el botón «Nuevo Ticket».',
                            'Escribe un título breve pero concreto: «No imprime la impresora de secretaría» funciona mucho mejor que «Problema».',
                            'En la descripción cuenta qué pasó, desde cuándo y qué ya intentaste.',
                            'Elige el tipo: Incidente si algo dejó de funcionar, Solicitud si pides algo nuevo.',
                            'Selecciona la prioridad según cuánto te bloquea el trabajo.',
                            'Si tienes una captura de pantalla o un documento, adjúntalo.',
                            'Pulsa «Crear». Recibirás el número de ticket para hacer seguimiento.',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'consejo',
                        titulo: 'Un buen ticket se resuelve más rápido',
                        texto:
                            'Incluye el mensaje de error exacto, el nombre del equipo si lo sabes y a ' +
                            'qué hora ocurrió. Cada dato que aportas evita una pregunta de vuelta y ' +
                            'acorta la resolución.',
                    },
                    {
                        tipo: 'lista',
                        titulo: 'Cómo elegir la prioridad',
                        items: [
                            'Crítica: hay un servicio caído que afecta a muchas personas y no hay forma de trabajar',
                            'Alta: tú o tu área no pueden trabajar, pero existe una solución temporal',
                            'Media: molesta e interrumpe, pero puedes seguir trabajando',
                            'Baja: mejora o consulta que puede esperar',
                        ],
                    },
                ],
            },
            {
                id: 'seguimiento',
                titulo: 'Seguir tu solicitud',
                resumen: 'Cómo saber en qué va tu ticket y responder al equipo.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'En «Tickets» ves sólo los tuyos. Entra en cualquiera para leer las ' +
                            'respuestas del equipo de soporte y añadir información nueva desde el ' +
                            'cuadro de comentarios.',
                    },
                    {
                        tipo: 'tabla',
                        columnas: ['Estado', 'Qué significa'],
                        filas: [
                            ['Nuevo', 'Se registró y está en espera de que alguien lo tome'],
                            ['Abierto', 'Alguien lo tomó y está trabajando en él'],
                            ['Pendiente', 'El equipo espera una respuesta o un dato tuyo'],
                            ['En espera', 'Depende de un tercero: un proveedor, una compra, otra área'],
                            ['Resuelto', 'Se aplicó una solución; confirma si funcionó'],
                            ['Cerrado', 'El caso terminó'],
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'atencion',
                        texto:
                            'Si tu ticket está «Pendiente», probablemente te pidieron algo. Revisa los ' +
                            'comentarios: mientras no respondas, el trabajo queda detenido.',
                    },
                ],
            },
            {
                id: 'catalogo-usuario',
                titulo: 'Pedir del catálogo de servicios',
                resumen: 'Solicitar equipos, software o accesos ya definidos.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'El catálogo reúne lo que la organización ofrece de forma estándar: un ' +
                            'computador nuevo, una licencia, un acceso a un sistema. Pedirlo desde aquí ' +
                            'es más rápido que abrir un ticket, porque ya lleva el flujo de aprobación ' +
                            'y el tiempo de entrega definidos.',
                    },
                    {
                        tipo: 'pasos',
                        items: [
                            'Entra a «Catálogo de Servicios».',
                            'Filtra por tipo: hardware, software, acceso o servicio.',
                            'Abre el elemento que necesitas y revisa el tiempo estimado de entrega.',
                            'Pulsa solicitar y completa el formulario.',
                            'Si requiere aprobación, tu responsable recibirá el aviso.',
                        ],
                    },
                ],
            },
            {
                id: 'ausencias-usuario',
                titulo: 'Solicitar una ausencia',
                resumen: 'Permisos, incapacidades y días libres.',
                bloques: [
                    {
                        tipo: 'pasos',
                        items: [
                            'Entra a «Catálogo de Servicios» y elige «Reportar Ausencia».',
                            'Selecciona el motivo (permiso, incapacidad, vacaciones…).',
                            'Indica las fechas y, si es por horas, el horario.',
                            'Explica brevemente el motivo.',
                            'Adjunta el soporte si aplica: una incapacidad médica, por ejemplo.',
                            'Envía la solicitud y espera la respuesta de tu responsable.',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'info',
                        texto:
                            'Recibirás un correo cuando tu solicitud sea aprobada o rechazada, ' +
                            'siempre que el administrador haya configurado el envío de correo.',
                    },
                ],
            },
        ],
    },

    // ══════════════════════════════════════════════════════════
    {
        id: 'agente',
        titulo: 'Guía para agentes y técnicos',
        descripcion: 'Para quienes atienden y resuelven el trabajo del día a día.',
        secciones: [
            {
                id: 'atender',
                titulo: 'Atender tickets',
                resumen: 'El flujo completo desde que llega hasta que se cierra.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'En «Tickets» ves los de tu departamento. Puedes trabajar en vista de lista, ' +
                            'en vista dividida (lista y detalle a la vez) o en tablero Kanban, donde ' +
                            'arrastras las tarjetas entre columnas para cambiar su estado.',
                    },
                    {
                        tipo: 'pasos',
                        titulo: 'Flujo recomendado',
                        items: [
                            'Filtra por estado «Nuevo» para ver lo que aún no ha tomado nadie.',
                            'Abre el ticket y léelo completo antes de responder.',
                            'Asígnate a ti mismo (o a quien corresponda) desde el panel lateral.',
                            'Cambia el estado a «Abierto» para indicar que ya se está trabajando.',
                            'Escribe un primer comentario: aunque sea para decir que lo estás revisando. Esto detiene el reloj de primera respuesta del SLA.',
                            'Si necesitas datos, cambia a «Pendiente» y pregunta en un comentario público.',
                            'Cuando lo soluciones, describe qué hiciste y pásalo a «Resuelto».',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'consejo',
                        titulo: 'Escribe la solución, no sólo «listo»',
                        texto:
                            'Lo que escribas al resolver es lo que leerá quien atienda el mismo problema ' +
                            'dentro de seis meses. Si la solución sirve para más casos, conviértela en ' +
                            'un artículo de la base de conocimiento.',
                    },
                ],
            },
            {
                id: 'comentarios',
                titulo: 'Comentarios públicos e internos',
                resumen: 'Cuándo usar cada uno.',
                bloques: [
                    {
                        tipo: 'lista',
                        items: [
                            'Comentario público: lo ve quien pidió ayuda. Úsalo para preguntar, informar avances y explicar la solución.',
                            'Nota interna: sólo la ve el equipo de soporte. Úsala para coordinarte con compañeros o dejar detalles técnicos.',
                        ],
                    },
                    {
                        tipo: 'parrafo',
                        texto:
                            'Al responder puedes marcar «Enviar por correo» para que la respuesta llegue ' +
                            'también al buzón de quien solicitó, sin que tenga que entrar a la plataforma.',
                    },
                ],
            },
            {
                id: 'sla',
                titulo: 'Entender el SLA',
                resumen: 'Qué son esos indicadores de tiempo y por qué importan.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'El SLA es el compromiso de tiempo para atender según la prioridad. Cada ' +
                            'ticket muestra una barra de progreso que avanza hacia su fecha límite: ' +
                            'verde si hay margen, ámbar cuando se acerca y roja si ya se pasó.',
                    },
                    {
                        tipo: 'lista',
                        items: [
                            'Tiempo de primera respuesta: cuánto puede tardar el equipo en dar señales de vida',
                            'Tiempo de resolución: cuánto puede tardar en quedar solucionado',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'info',
                        texto:
                            'Los tiempos por prioridad los define el administrador en ' +
                            'Configuración → Políticas SLA, en horas.',
                    },
                ],
            },
            {
                id: 'fusionar',
                titulo: 'Fusionar tickets duplicados',
                resumen: 'Cuando varias personas reportan lo mismo.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'Si una caída de red genera ocho tickets, no tiene sentido responder ocho ' +
                            'veces. Al fusionar, los duplicados se cierran y quedan enlazados al ' +
                            'principal, conservando el registro de quién reportó cada uno.',
                    },
                    {
                        tipo: 'pasos',
                        items: [
                            'En la lista, marca las casillas de los tickets duplicados.',
                            'Pulsa «Fusionar» en la barra que aparece abajo.',
                            'Elige cuál será el ticket principal.',
                            'Confirma. Los demás quedan cerrados y enlazados, y el principal recibe un resumen.',
                        ],
                    },
                ],
            },
            {
                id: 'ordenes',
                titulo: 'Órdenes de trabajo',
                resumen: 'Trabajo en campo con evidencia y firma.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'Una orden de trabajo es tarea planificada sobre un activo o una sede: ' +
                            'revisar un aire acondicionado, instalar un proyector, hacer mantenimiento ' +
                            'a un laboratorio. A diferencia del ticket, se programa con fecha y técnico.',
                    },
                    {
                        tipo: 'pasos',
                        items: [
                            'Abre «Órdenes de Trabajo» y crea una nueva.',
                            'Indica el activo o la ubicación, y el tipo de trabajo.',
                            'Programa la fecha de inicio y fin previstas.',
                            'Asigna al técnico responsable.',
                            'Al ejecutarla, registra el inicio real y adjunta fotografías.',
                            'Cierra con las notas de finalización y la firma de quien recibe.',
                        ],
                    },
                ],
            },
        ],
    },

    // ══════════════════════════════════════════════════════════
    {
        id: 'inventario',
        titulo: 'Inventario tecnológico',
        descripcion: 'El registro de equipos y cómo se mantiene actualizado solo.',
        secciones: [
            {
                id: 'activos',
                titulo: 'Consultar y registrar activos',
                resumen: 'Qué información guarda cada equipo.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'En «Activos» está todo lo que la organización posee y controla: ' +
                            'computadores, impresoras, proyectores, servidores, equipos de red. ' +
                            'Cada ficha reúne datos administrativos (compra, garantía, seguro, ' +
                            'responsable) y datos técnicos.',
                    },
                    {
                        tipo: 'lista',
                        titulo: 'En cada ficha encuentras',
                        items: [
                            'Identificación: nombre, etiqueta y número de serie',
                            'Estado: en uso, en almacén, en mantenimiento, retirado',
                            'Ubicación: sede, edificio, piso y oficina',
                            'Persona responsable del equipo',
                            'Datos de compra, garantía y depreciación',
                            'Ficha técnica completa si el equipo reporta automáticamente',
                            'Historial de cambios de estado y de asignación',
                        ],
                    },
                ],
            },
            {
                id: 'agente-inventario',
                titulo: 'El agente de inventario automático',
                resumen: 'Cómo hacer que los equipos se registren solos.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'Existe un pequeño programa que se instala en cada computador con Windows. ' +
                            'Una vez al día recopila la ficha técnica del equipo y la envía a la ' +
                            'plataforma. Si el equipo ya está registrado actualiza sus datos; si es ' +
                            'nuevo, lo da de alta automáticamente.',
                    },
                    {
                        tipo: 'lista',
                        titulo: 'Qué información envía',
                        items: [
                            'Procesador, memoria RAM con detalle de módulos y placa base',
                            'Discos, particiones y espacio disponible',
                            'Adaptadores de red, direcciones IP y MAC',
                            'Sistema operativo, versión y última actualización instalada',
                            'Programas instalados y versiones de controladores',
                            'Estado de la licencia de Windows, TPM y antivirus activo',
                            'Monitores, impresoras y dispositivos USB conectados',
                            'Último usuario que inició sesión y último reinicio',
                        ],
                    },
                    {
                        tipo: 'pasos',
                        titulo: 'Instalación en un equipo',
                        items: [
                            'Pide al administrador la dirección del servidor y la clave del agente.',
                            'Copia el archivo del agente al equipo.',
                            'Configura esos dos datos en el archivo de configuración del agente.',
                            'Ejecútalo una vez para comprobar que el equipo aparece en «Activos».',
                            'Programa su ejecución diaria con el Programador de tareas de Windows.',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'atencion',
                        texto:
                            'El agente necesita permisos de administrador para leer toda la información ' +
                            'del sistema. Sin ellos funcionará, pero algunos datos quedarán vacíos.',
                    },
                ],
            },
            {
                id: 'grupos',
                titulo: 'Grupos de activos',
                resumen: 'Agrupar equipos idénticos para tratarlos en bloque.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'Si compraste treinta computadores iguales, un grupo te permite verlos ' +
                            'juntos, comparar su configuración y detectar cuáles se desviaron del ' +
                            'estándar: a cuál le falta memoria, cuál tiene software que no debería.',
                    },
                ],
            },
        ],
    },

    // ══════════════════════════════════════════════════════════
    {
        id: 'itsm',
        titulo: 'Problemas, cambios y mantenimiento',
        descripcion: 'Las prácticas que evitan que los incidentes se repitan.',
        secciones: [
            {
                id: 'problemas',
                titulo: 'Gestión de problemas',
                resumen: 'La diferencia entre apagar el fuego y evitar el incendio.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'Un ticket atiende un caso concreto. Un problema investiga por qué ese caso ' +
                            'se repite. Si cada lunes falla la misma impresora, los tickets la reinician ' +
                            'una y otra vez; el problema averigua la causa y la elimina.',
                    },
                    {
                        tipo: 'pasos',
                        items: [
                            'Crea el problema desde «Problemas» describiendo el patrón observado.',
                            'Enlaza los tickets relacionados como evidencia.',
                            'Documenta una solución temporal para que el equipo pueda seguir trabajando.',
                            'Investiga y registra la causa raíz cuando la encuentres.',
                            'Si la corrección afecta a sistemas en producción, abre un cambio.',
                            'Al cerrar, publica lo aprendido en la base de conocimiento.',
                        ],
                    },
                ],
            },
            {
                id: 'cambios',
                titulo: 'Gestión de cambios',
                resumen: 'Modificar sistemas en producción sin sobresaltos.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'Actualizar un servidor, cambiar la configuración de la red o migrar un ' +
                            'sistema son acciones que pueden dejar a toda la organización sin servicio. ' +
                            'El módulo de cambios obliga a planear la reversión antes de tocar nada.',
                    },
                    {
                        tipo: 'lista',
                        titulo: 'Toda solicitud de cambio incluye',
                        items: [
                            'Motivo: qué se gana con el cambio',
                            'Análisis de impacto: a quién afecta y durante cuánto tiempo',
                            'Análisis de riesgo: qué puede salir mal',
                            'Plan de reversión: cómo se vuelve atrás si falla',
                            'Ventana programada: cuándo se hará',
                            'Aprobación del comité antes de ejecutarse',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'consejo',
                        texto:
                            'Un cambio sin plan de reversión no debería aprobarse. Es la diferencia ' +
                            'entre una noche tranquila y una madrugada reconstruyendo un servidor.',
                    },
                ],
            },
            {
                id: 'planificador',
                titulo: 'Mantenimiento preventivo',
                resumen: 'Programar lo que se repite para que no se olvide.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'El planificador crea actividades que se repiten: revisar los servidores ' +
                            'cada mes, limpiar los equipos cada trimestre, renovar certificados cada ' +
                            'año. Defines el plan una vez y el sistema genera todas las ocurrencias.',
                    },
                    {
                        tipo: 'pasos',
                        items: [
                            'Entra a «Planificador» y crea un plan nuevo.',
                            'Ponle un título claro que describa la tarea.',
                            'Elige la frecuencia: diaria, semanal, mensual, anual o personalizada en días.',
                            'Define la fecha de inicio y, si aplica, la de fin.',
                            'Asigna el equipo y las personas responsables.',
                            'Guarda: el calendario se llenará con todas las actividades previstas.',
                        ],
                    },
                    {
                        tipo: 'parrafo',
                        texto:
                            'Cuando llegue la fecha de una actividad puedes convertirla en ticket con ' +
                            'un clic, para que quede registrada con el mismo seguimiento que cualquier ' +
                            'otro trabajo.',
                    },
                ],
            },
        ],
    },

    // ══════════════════════════════════════════════════════════
    {
        id: 'administracion',
        titulo: 'Guía del administrador',
        descripcion: 'Configuración inicial y mantenimiento de la plataforma.',
        secciones: [
            {
                id: 'configuracion-inicial',
                titulo: 'Puesta en marcha',
                resumen: 'El orden recomendado para dejar todo listo.',
                bloques: [
                    {
                        tipo: 'pasos',
                        titulo: 'Configura en este orden',
                        items: [
                            'Organización: nombre, logotipo y color de tu institución.',
                            'Sedes y edificios: dónde están físicamente los equipos y las personas.',
                            'Departamentos: crea un equipo por cada área que atenderá solicitudes.',
                            'Horario laboral: define la jornada para que el SLA no cuente noches ni fines de semana.',
                            'Categorías: clasifica los tipos de solicitud que recibes.',
                            'Políticas de SLA: establece los tiempos de respuesta por prioridad.',
                            'Equipo: da de alta a las personas y asígnales rol y departamento.',
                            'Permisos de menú: ajusta qué ve cada rol.',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'consejo',
                        texto:
                            'Empieza con pocos departamentos y pocas categorías. Es más fácil añadir ' +
                            'después que reorganizar una estructura que nadie entiende.',
                    },
                ],
            },
            {
                id: 'usuarios-admin',
                titulo: 'Gestionar personas',
                resumen: 'Altas, cambios de rol y bajas seguras.',
                bloques: [
                    {
                        tipo: 'pasos',
                        titulo: 'Dar de alta a alguien',
                        items: [
                            'Ve a Configuración → Equipo y pulsa «Crear usuario».',
                            'Introduce nombre, correo y una contraseña provisional.',
                            'Asigna el rol según lo que va a hacer.',
                            'Selecciona su departamento.',
                            'Al guardar, la cuenta queda lista para usarse de inmediato.',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'atencion',
                        titulo: 'Antes de eliminar a alguien',
                        texto:
                            'La plataforma te mostrará cuántos tickets y órdenes tiene asignados y te ' +
                            'permitirá reasignar ese trabajo a otra persona. Si eliminas sin reasignar, ' +
                            'ese trabajo queda sin responsable.',
                    },
                    {
                        tipo: 'parrafo',
                        texto:
                            'Para retirar el acceso de alguien que se fue temporalmente, es preferible ' +
                            'desactivar su cuenta en lugar de eliminarla: conserva el historial y puede ' +
                            'reactivarse.',
                    },
                ],
            },
            {
                id: 'correo-admin',
                titulo: 'Configurar el correo',
                resumen: 'Para que salgan las notificaciones.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'El envío de correo se configura en el servidor, no desde la interfaz: las ' +
                            'credenciales del proveedor no deben quedar guardadas en la base de datos ' +
                            'donde puedan leerse.',
                    },
                    {
                        tipo: 'pasos',
                        items: [
                            'Pide a quien administra el servidor que complete las variables SMTP en el archivo .env.',
                            'Reinicia el servicio para que tome la configuración.',
                            'Entra a Configuración → Correo y pulsa «Probar conexión».',
                            'Si responde correctamente, ya se enviarán las notificaciones.',
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'info',
                        texto:
                            'Funciona con cualquier proveedor SMTP: Microsoft 365, Google Workspace, ' +
                            'Amazon SES o un servidor de correo propio. Mientras no se configure, las ' +
                            'notificaciones quedan registradas en el log en lugar de enviarse.',
                    },
                ],
            },
            {
                id: 'indicadores-admin',
                titulo: 'Leer los indicadores',
                resumen: 'Qué mirar en Analytics y qué decisiones tomar.',
                bloques: [
                    {
                        tipo: 'tabla',
                        columnas: ['Indicador', 'Qué te dice', 'Qué hacer si va mal'],
                        filas: [
                            ['Tickets abiertos', 'Carga de trabajo acumulada', 'Revisa si falta personal o si hay casos estancados'],
                            ['Tiempo medio de resolución', 'Cuánto tarda el servicio', 'Busca qué tipo de caso está alargando el promedio'],
                            ['SLA incumplido', 'Compromisos vencidos', 'Revisa si los tiempos son realistas o si falta capacidad'],
                            ['Carga por persona', 'Reparto del trabajo', 'Redistribuye si alguien concentra demasiado'],
                            ['Satisfacción', 'Percepción de quien recibe el servicio', 'Lee los comentarios de las peores calificaciones'],
                        ],
                    },
                    {
                        tipo: 'aviso',
                        estilo: 'consejo',
                        texto:
                            'Si el SLA se incumple de forma sistemática, el problema rara vez es el ' +
                            'equipo: suele ser que los tiempos se fijaron sin mirar la capacidad real.',
                    },
                ],
            },
            {
                id: 'respaldos',
                titulo: 'Respaldos',
                resumen: 'Proteger la información.',
                bloques: [
                    {
                        tipo: 'parrafo',
                        texto:
                            'Toda la información vive en tu base de datos PostgreSQL. Programa una ' +
                            'copia automática diaria y comprueba de vez en cuando que esa copia ' +
                            'realmente se puede restaurar: un respaldo que nunca se probó no es un respaldo.',
                    },
                    {
                        tipo: 'lista',
                        titulo: 'Qué respaldar',
                        items: [
                            'La base de datos completa',
                            'La carpeta de archivos adjuntos del servidor',
                            'El archivo .env con la configuración (guárdalo en un lugar seguro)',
                        ],
                    },
                ],
            },
        ],
    },

    // ══════════════════════════════════════════════════════════
    {
        id: 'problemas-comunes',
        titulo: 'Problemas frecuentes',
        descripcion: 'Soluciones a las dudas que más se repiten.',
        secciones: [
            {
                id: 'faq',
                titulo: 'Preguntas habituales',
                resumen: 'Respuestas rápidas.',
                bloques: [
                    {
                        tipo: 'tabla',
                        columnas: ['Situación', 'Qué hacer'],
                        filas: [
                            ['No veo una sección del menú', 'Tu rol no tiene permiso. Pide al administrador que lo revise en Permisos de menú.'],
                            ['No llegan los correos', 'El servidor SMTP no está configurado. Revísalo en Configuración → Correo.'],
                            ['No puedo entrar', 'Comprueba el correo, usa «Recuperar contraseña» o pide al administrador que la restablezca.'],
                            ['No aparece un equipo en el inventario', 'Verifica que el agente esté instalado y que se ejecutó al menos una vez.'],
                            ['El SLA no se calcula', 'Falta definir la política para esa prioridad en Configuración → Políticas SLA.'],
                            ['No encuentro un ticket', 'Si eres usuario final sólo ves los tuyos; si eres agente, los de tu departamento.'],
                            ['No puedo adjuntar un archivo', 'Revisa el tamaño y el tipo. El límite lo define el administrador.'],
                        ],
                    },
                ],
            },
            {
                id: 'buenas-practicas',
                titulo: 'Buenas prácticas',
                resumen: 'Recomendaciones para que la plataforma sirva de verdad.',
                bloques: [
                    {
                        tipo: 'lista',
                        items: [
                            'Registra todo en tickets, incluso lo que resolviste en dos minutos: sin registro no hay estadística ni memoria.',
                            'Escribe títulos que se entiendan sin abrir el ticket.',
                            'Convierte en artículo cualquier solución que hayas explicado más de dos veces.',
                            'Revisa los tickets vencidos al empezar el día, antes que los nuevos.',
                            'Cierra los resueltos: un ticket que nadie cierra distorsiona los indicadores.',
                            'Usa notas internas para lo técnico y comentarios públicos para lo que el solicitante debe saber.',
                            'Mantén el inventario al día: es la base para planificar compras y renovaciones.',
                        ],
                    },
                ],
            },
        ],
    },
]
