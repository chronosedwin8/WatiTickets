/**
 * Tema claro u oscuro.
 *
 * Arranca con la preferencia del sistema operativo y recuerda la elección
 * de cada persona. Quien trabaja de noche en una mesa de ayuda agradece no
 * tener que ajustarlo cada vez que entra.
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

export type Tema = 'claro' | 'oscuro'

const CLAVE = 'tw.tema'

interface TemaContextType {
    tema: Tema
    alternar: () => void
    fijar: (t: Tema) => void
    /** True si el tema viene de la preferencia del sistema, sin elección propia. */
    siguiendoSistema: boolean
}

const TemaContext = createContext<TemaContextType | undefined>(undefined)

function preferenciaDelSistema(): Tema {
    if (typeof window === 'undefined') return 'claro'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

function guardado(): Tema | null {
    try {
        const v = localStorage.getItem(CLAVE)
        return v === 'claro' || v === 'oscuro' ? v : null
    } catch {
        return null
    }
}

/** Aplica el tema al documento. */
function aplicar(tema: Tema) {
    document.documentElement.dataset.theme = tema === 'oscuro' ? 'dark' : 'light'
    // Para que la barra del navegador en móvil acompañe al fondo.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', tema === 'oscuro' ? '#101223' : '#f4f4fb')
}

export function TemaProvider({ children }: { children: ReactNode }) {
    const [elegido, setElegido] = useState<Tema | null>(() => guardado())
    const [sistema, setSistema] = useState<Tema>(() => preferenciaDelSistema())

    const tema = elegido ?? sistema

    // Se aplica en cuanto cambia, sin esperar a que pinte nada más.
    useEffect(() => { aplicar(tema) }, [tema])

    // Si no hay elección propia, se sigue al sistema aunque cambie sobre la marcha.
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
        if (!mq) return
        const alCambiar = (e: MediaQueryListEvent) => setSistema(e.matches ? 'oscuro' : 'claro')
        mq.addEventListener('change', alCambiar)
        return () => mq.removeEventListener('change', alCambiar)
    }, [])

    const fijar = useCallback((t: Tema) => {
        setElegido(t)
        try { localStorage.setItem(CLAVE, t) } catch { /* almacenamiento bloqueado */ }
    }, [])

    const alternar = useCallback(() => {
        fijar(tema === 'oscuro' ? 'claro' : 'oscuro')
    }, [tema, fijar])

    return (
        <TemaContext.Provider value={{ tema, alternar, fijar, siguiendoSistema: elegido === null }}>
            {children}
        </TemaContext.Provider>
    )
}

export function useTema() {
    const ctx = useContext(TemaContext)
    if (!ctx) throw new Error('useTema debe usarse dentro de un TemaProvider')
    return ctx
}
