/**
 * TenantContext — thin wrapper over AuthContext.
 *
 * The TenantProvider is kept for backward compatibility (App.tsx uses it),
 * but it does not create its own React Context — it simply renders children.
 * useTenant() derives all data directly from useAuth(), eliminating the
 * redundant intermediate Context layer identified in the security audit (3.3).
 */
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import type { Tenant } from '@/types/database'

interface TenantContextType {
    tenant: Tenant | null
    tenantId: string | null
    primaryColor: string
    logoUrl: string | null
}

/** No-op provider — kept for API compatibility with existing imports. */
export function TenantProvider({ children }: { children: ReactNode }) {
    return <>{children}</>
}

/** Derive tenant data directly from AuthContext — no extra Context overhead. */
export function useTenant(): TenantContextType {
    const { tenant } = useAuth()
    return {
        tenant,
        tenantId: tenant?.id ?? null,
        primaryColor: tenant?.primary_color ?? '#3B82F6',
        logoUrl: tenant?.logo_url ?? null,
    }
}
