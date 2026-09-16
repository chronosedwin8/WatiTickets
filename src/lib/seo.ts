/**
 * Metadatos para buscadores y redes sociales.
 *
 * La aplicación se renderiza en el navegador, así que el título y las
 * descripciones se fijan al montar cada página pública. Al salir de la
 * página se restauran los valores anteriores.
 */
import { useEffect } from 'react'

export interface OpcionesSeo {
    titulo: string
    descripcion: string
    palabrasClave?: string[]
    /** Ruta canónica; por defecto, la actual. */
    canonica?: string
    tipo?: 'website' | 'article'
    imagen?: string
}

/** Crea o actualiza una etiqueta <meta>. Devuelve cómo dejarla como estaba. */
function fijarMeta(atributo: 'name' | 'property', clave: string, valor: string): () => void {
    const selector = `meta[${atributo}="${clave}"]`
    let etiqueta = document.head.querySelector<HTMLMetaElement>(selector)
    const existia = Boolean(etiqueta)
    const anterior = etiqueta?.content

    if (!etiqueta) {
        etiqueta = document.createElement('meta')
        etiqueta.setAttribute(atributo, clave)
        document.head.appendChild(etiqueta)
    }
    etiqueta.content = valor

    return () => {
        if (!existia) {
            etiqueta?.remove()
        } else if (etiqueta && anterior !== undefined) {
            etiqueta.content = anterior
        }
    }
}

function fijarCanonica(url: string): () => void {
    let enlace = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const existia = Boolean(enlace)
    const anterior = enlace?.href

    if (!enlace) {
        enlace = document.createElement('link')
        enlace.rel = 'canonical'
        document.head.appendChild(enlace)
    }
    enlace.href = url

    return () => {
        if (!existia) enlace?.remove()
        else if (enlace && anterior) enlace.href = anterior
    }
}

/** Aplica los metadatos de la página mientras esté montada. */
export function usarSeo(opciones: OpcionesSeo): void {
    const { titulo, descripcion, palabrasClave, canonica, tipo = 'website', imagen } = opciones

    useEffect(() => {
        const tituloAnterior = document.title
        document.title = titulo

        const url = canonica ?? window.location.origin + window.location.pathname

        const limpiezas = [
            fijarMeta('name', 'description', descripcion),
            fijarMeta('name', 'robots', 'index, follow'),
            fijarCanonica(url),

            // Open Graph — así se ve al compartir el enlace.
            fijarMeta('property', 'og:title', titulo),
            fijarMeta('property', 'og:description', descripcion),
            fijarMeta('property', 'og:type', tipo),
            fijarMeta('property', 'og:url', url),
            fijarMeta('property', 'og:site_name', 'TicketWati'),
            fijarMeta('property', 'og:locale', 'es_ES'),

            // Tarjeta de X/Twitter
            fijarMeta('name', 'twitter:card', 'summary_large_image'),
            fijarMeta('name', 'twitter:title', titulo),
            fijarMeta('name', 'twitter:description', descripcion),
        ]

        if (palabrasClave?.length) {
            limpiezas.push(fijarMeta('name', 'keywords', palabrasClave.join(', ')))
        }
        if (imagen) {
            limpiezas.push(fijarMeta('property', 'og:image', imagen))
            limpiezas.push(fijarMeta('name', 'twitter:image', imagen))
        }

        return () => {
            document.title = tituloAnterior
            limpiezas.forEach((deshacer) => deshacer())
        }
    }, [titulo, descripcion, canonica, tipo, imagen, palabrasClave?.join(',')])
}

/**
 * Marca una página como no indexable.
 * Se usa en las pantallas internas: no tiene sentido que aparezcan en Google.
 */
export function usarSinIndexar(titulo?: string): void {
    useEffect(() => {
        const tituloAnterior = document.title
        if (titulo) document.title = `${titulo} · TicketWati`

        const limpiar = fijarMeta('name', 'robots', 'noindex, nofollow')

        return () => {
            document.title = tituloAnterior
            limpiar()
        }
    }, [titulo])
}
