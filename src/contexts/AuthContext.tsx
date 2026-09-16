/**
 * Contexto de autenticación.
 *
 * Gestiona la sesión contra la API propia: inicio de sesión, renovación
 * automática del token, cierre de sesión y recuperación de contraseña.
 */
import {
    createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode,
} from 'react'
import { http, sesion, alExpirarSesion, ApiError } from '@/lib/http'
import type { Profile, Tenant } from '@/types/database'

interface RespuestaSesion {
    accessToken: string
    refreshToken: string
    user: Profile
    tenant: Tenant | null
}

interface AuthContextType {
    user: Profile | null
    profile: Profile | null
    tenant: Tenant | null
    isLoading: boolean
    /** True mientras se comprueba la sesión al cargar la aplicación. */
    isAuthenticated: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (
        email: string,
        password: string,
        fullName: string,
        tenantSlug?: string
    ) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
    resetPassword: (email: string) => Promise<{ error: Error | null }>
    changePassword: (actual: string, nueva: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Profile | null>(null)
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const montado = useRef(true)

    useEffect(() => {
        montado.current = true
        return () => { montado.current = false }
    }, [])

    /** Carga el usuario de la sesión guardada, si la hay. */
    const cargarSesion = useCallback(async () => {
        if (!sesion.access && !sesion.refresh) {
            if (montado.current) setIsLoading(false)
            return
        }

        try {
            const datos = await http.get<{ user: Profile; tenant: Tenant | null }>('/auth/me')
            if (montado.current) {
                setUser(datos.user)
                setTenant(datos.tenant)
            }
        } catch {
            // El token ya no sirve: se limpia y se muestra el login.
            sesion.limpiar()
            if (montado.current) {
                setUser(null)
                setTenant(null)
            }
        } finally {
            if (montado.current) setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        cargarSesion()

        // Si el token caduca y no se puede renovar, se cierra la sesión.
        const cancelar = alExpirarSesion(() => {
            if (montado.current) {
                setUser(null)
                setTenant(null)
            }
        })

        return cancelar
    }, [cargarSesion])

    const signIn = useCallback(async (email: string, password: string) => {
        try {
            const datos = await http.post<RespuestaSesion>(
                '/auth/login',
                { email, password },
                { sinReintento: true }
            )

            sesion.guardar(datos.accessToken, datos.refreshToken)

            if (montado.current) {
                setUser(datos.user)
                setTenant(datos.tenant)
            }

            return { error: null }
        } catch (err) {
            return { error: err as Error }
        }
    }, [])

    const signUp = useCallback(
        async (email: string, password: string, fullName: string, tenantSlug?: string) => {
            try {
                await http.post('/auth/register', {
                    email,
                    password,
                    fullName,
                    tenantSlug,
                })
                // Tras el alta se inicia sesión para entrar directamente.
                return await signIn(email, password)
            } catch (err) {
                return { error: err as Error }
            }
        },
        [signIn]
    )

    const signOut = useCallback(async () => {
        const refreshToken = sesion.refresh
        try {
            if (refreshToken) {
                await http.post('/auth/logout', { refreshToken })
            }
        } catch {
            // Aunque el servidor no responda, la sesión local se cierra.
        } finally {
            sesion.limpiar()
            if (montado.current) {
                setUser(null)
                setTenant(null)
            }
        }
    }, [])

    const refreshProfile = useCallback(async () => {
        try {
            const datos = await http.get<{ user: Profile; tenant: Tenant | null }>('/auth/me')
            if (montado.current) {
                setUser(datos.user)
                setTenant(datos.tenant)
            }
        } catch {
            /* se mantiene el perfil actual si la recarga falla */
        }
    }, [])

    const resetPassword = useCallback(async (email: string) => {
        try {
            await http.post('/auth/forgot-password', { email })
            return { error: null }
        } catch (err) {
            return { error: err as Error }
        }
    }, [])

    const changePassword = useCallback(async (actual: string, nueva: string) => {
        try {
            await http.post('/auth/change-password', {
                currentPassword: actual,
                newPassword: nueva,
            })
            // El servidor invalida las sesiones: hay que volver a entrar.
            sesion.limpiar()
            if (montado.current) {
                setUser(null)
                setTenant(null)
            }
            return { error: null }
        } catch (err) {
            return { error: err as Error }
        }
    }, [])

    return (
        <AuthContext.Provider
            value={{
                user,
                profile: user, // el perfil y el usuario son la misma entidad
                tenant,
                isLoading,
                isAuthenticated: Boolean(user),
                signIn,
                signUp,
                signOut,
                refreshProfile,
                resetPassword,
                changePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider')
    }
    return context
}

export { ApiError }
