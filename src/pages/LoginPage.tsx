import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, Loader2, Zap, ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'register'

export function LoginPage() {
    const [mode, setMode] = useState<AuthMode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [tenantSlug, setTenantSlug] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { signIn, signUp } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            if (mode === 'login') {
                const { error } = await signIn(email, password)
                if (error) throw error
            } else {
                const { error } = await signUp(email, password, fullName, tenantSlug || undefined)
                if (error) throw error
            }
            navigate('/')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error de autenticación'
            const friendlyErrors: Record<string, string> = {
                'email rate limit exceeded': 'Intenta de nuevo en unos momentos.',
                'Invalid login credentials': 'Credenciales incorrectas.',
                'Email not confirmed': 'Verifica tu correo electrónico.',
                'User already registered': 'El usuario ya existe.',
            }

            const friendly = Object.entries(friendlyErrors).find(([key]) =>
                errorMessage.toLowerCase().includes(key.toLowerCase())
            )

            setError(friendly ? friendly[1] : errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob" />
            <div className="absolute top-0 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-40 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-4000" />

            <div className="w-full max-w-[420px] mx-4 relative z-10">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 mb-4 transform hover:scale-105 transition-transform">
                        <span className="text-2xl font-bold">T</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {mode === 'login' ? 'Bienvenido a TicketWati' : 'Crea tu cuenta'}
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        {mode === 'login'
                            ? 'Gestiona tus servicios de TI en un solo lugar.'
                            : 'Únete a la plataforma líder de gestión de servicios.'}
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    {/* Mode Switcher */}
                    <div className="flex border-b border-slate-100 bg-slate-50/50">
                        <button
                            onClick={() => setMode('login')}
                            className={cn(
                                "flex-1 py-3.5 text-sm font-medium transition-all relative",
                                mode === 'login' ? "text-indigo-600 bg-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            Iniciar Sesión
                            {mode === 'login' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full mx-auto w-full transition-all" />
                            )}
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={cn(
                                "flex-1 py-3.5 text-sm font-medium transition-all relative",
                                mode === 'register' ? "text-indigo-600 bg-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            Registrarse
                            {mode === 'register' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full mx-auto w-full transition-all" />
                            )}
                        </button>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {mode === 'register' && (
                                <div className="space-y-4 animate-in slide-in-from-left-2 fade-in duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                                            placeholder="Ej. Juan Pérez"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Organización <span className="text-slate-400 font-normal lowercase">(slug)</span></label>
                                        <div className="flex rounded-lg border border-slate-200 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-500 transition-all">
                                            <span className="px-3 flex items-center text-slate-400 text-sm border-r border-slate-200 bg-slate-100/50">/</span>
                                            <input
                                                type="text"
                                                value={tenantSlug}
                                                onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                                className="flex-1 px-3 py-2.5 bg-transparent focus:outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400"
                                                placeholder="mi-empresa"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                                    placeholder="nombre@empresa.com"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Contraseña</label>
                                    {mode === 'login' && (
                                        <Link
                                            to="/forgot-password"
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                                        >
                                            ¿Recuperar contraseña?
                                        </Link>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 pr-10"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 animate-pulse-once">
                                    <Zap className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={cn(
                                    "w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition-all duration-200 flex items-center justify-center gap-2",
                                    isLoading && "opacity-80 cursor-wait",
                                    !isLoading && "hover:-translate-y-0.5"
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        {mode === 'login' ? 'Ingresar' : 'Comenzar Ahora'}
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Features Footer inside card */}
                    <div className="bg-slate-50/50 p-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                <Check size={10} strokeWidth={3} />
                            </div>
                            <span className="text-xs text-slate-500 font-medium">Free Tier</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <Check size={10} strokeWidth={3} />
                            </div>
                            <span className="text-xs text-slate-500 font-medium">No Credit Card</span>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                    &copy; 2026 TicketWati. Enterprise Service Management.
                </p>
            </div>
        </div>
    )
}
