import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function ForgotPasswordPage() {
    const { resetPassword } = useAuth()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await resetPassword(email.trim())

        setLoading(false)
        if (error) {
            setError('No se pudo enviar el correo. Verifica la dirección e inténtalo de nuevo.')
        } else {
            setSent(true)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Mail className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Recuperar contraseña</h1>
                                <p className="text-indigo-200 text-sm">Te enviaremos un enlace de recuperación</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-7">
                        {sent ? (
                            /* Success state */
                            <div className="text-center space-y-4">
                                <div className="flex justify-center">
                                    <CheckCircle2 className="h-14 w-14 text-green-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Correo enviado</h2>
                                    <p className="text-slate-600 text-sm mt-1">
                                        Si <span className="font-medium text-slate-800">{email}</span> existe en el sistema,
                                        recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                                    </p>
                                    <p className="text-slate-500 text-xs mt-3">
                                        Revisa también la carpeta de spam.
                                    </p>
                                </div>
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        ) : (
                            /* Form state */
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <p className="text-slate-600 text-sm">
                                    Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace
                                    para restablecer tu contraseña.
                                </p>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                        Correo electrónico
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                                        placeholder="nombre@empresa.com"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !email.trim()}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                                </button>

                                <div className="text-center">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Volver al inicio de sesión
                                    </Link>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-xs mt-6">
                    TicketWati — Sistema de Gestión de Tickets
                </p>
            </div>
        </div>
    )
}

export default ForgotPasswordPage
