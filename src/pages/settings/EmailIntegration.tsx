/**
 * Correo — estado, diagnóstico y preferencias.
 *
 * Las credenciales del proveedor de correo ya no se guardan en la base de
 * datos: el servidor habla SMTP con lo que se define en su archivo .env.
 * Aquí se comprueba la conexión y se ajustan las preferencias que sí son
 * propias de la organización (firma y valores por defecto).
 */
import { useEffect, useState } from 'react'
import {
    Mail, CheckCircle2, AlertCircle, Loader2, Save, Send, ServerCog,
} from 'lucide-react'
import { http, tenantSettingsApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { toast } from '@/hooks/use-toast'

interface Diagnostico {
    correo: {
        configurado: boolean
        conecta: boolean
        error: string | null
        remitente: string | null
    }
    entorno: string
}

interface Preferencias {
    id?: string
    email_signature: string
    email_default_type: string
    email_default_priority: string
}

const PREFERENCIAS_INICIALES: Preferencias = {
    email_signature: '',
    email_default_type: 'incident',
    email_default_priority: 'medium',
}

export function EmailIntegration() {
    const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null)
    const [prefs, setPrefs] = useState<Preferencias>(PREFERENCIAS_INICIALES)
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [probando, setProbando] = useState(false)

    useEffect(() => {
        const cargar = async () => {
            try {
                const [diag, ajustes] = await Promise.all([
                    http.get<{ data: Diagnostico }>('/configuracion/diagnostico'),
                    tenantSettingsApi.get().catch(() => null),
                ])
                setDiagnostico(diag.data)
                if (ajustes) {
                    setPrefs({
                        id: ajustes.id as string,
                        email_signature: (ajustes.email_signature as string) ?? '',
                        email_default_type: (ajustes.email_default_type as string) ?? 'incident',
                        email_default_priority: (ajustes.email_default_priority as string) ?? 'medium',
                    })
                }
            } catch (err) {
                toast({
                    title: 'No se pudo cargar la configuración',
                    description: err instanceof Error ? err.message : 'Error desconocido',
                    variant: 'destructive',
                })
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [])

    const guardar = async () => {
        setGuardando(true)
        try {
            const datos = {
                email_signature: prefs.email_signature,
                email_default_type: prefs.email_default_type,
                email_default_priority: prefs.email_default_priority,
            }

            if (prefs.id) {
                await tenantSettingsApi.update(prefs.id, datos)
            } else {
                const creado = await tenantSettingsApi.create(datos) as { id: string }
                setPrefs(p => ({ ...p, id: creado.id }))
            }

            toast({ title: 'Preferencias guardadas' })
        } catch (err) {
            toast({
                title: 'No se pudo guardar',
                description: err instanceof Error ? err.message : 'Error desconocido',
                variant: 'destructive',
            })
        } finally {
            setGuardando(false)
        }
    }

    const probarConexion = async () => {
        setProbando(true)
        try {
            const res = await http.get<{ data: Diagnostico }>('/configuracion/diagnostico')
            setDiagnostico(res.data)
            toast(
                res.data.correo.conecta
                    ? { title: 'Conexión correcta', description: 'El servidor de correo responde.' }
                    : {
                        title: 'Sin conexión con el correo',
                        description: res.data.correo.error ?? 'Revisa la configuración SMTP.',
                        variant: 'destructive',
                    }
            )
        } finally {
            setProbando(false)
        }
    }

    if (cargando) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
        )
    }

    const correo = diagnostico?.correo
    const ok = correo?.configurado && correo?.conecta

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-slate-900">Correo</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Estado del envío de notificaciones y respuestas de tickets.
                </p>
            </div>

            {/* Estado de la conexión */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-3 ${ok ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                        <Mail className={`h-6 w-6 ${ok ? 'text-emerald-600' : 'text-amber-600'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-slate-900">Servidor de correo saliente</h3>
                            {ok ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" /> Operativo
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                    <AlertCircle className="h-3 w-3" />
                                    {correo?.configurado ? 'No conecta' : 'Sin configurar'}
                                </span>
                            )}
                        </div>

                        <p className="mt-2 text-sm text-slate-600">
                            {correo?.configurado
                                ? <>Remitente: <span className="font-mono">{correo.remitente}</span></>
                                : 'Mientras no se configure, las notificaciones quedarán registradas en el log del servidor en lugar de enviarse.'}
                        </p>

                        {correo?.error && (
                            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                                {correo.error}
                            </p>
                        )}

                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={probarConexion}
                            isLoading={probando}
                            icon={<Send className="h-4 w-4" />}
                        >
                            Probar conexión
                        </Button>
                    </div>
                </div>
            </div>

            {/* Cómo se configura */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                <p className="flex items-center gap-2 font-medium text-slate-900">
                    <ServerCog className="h-4 w-4" /> ¿Cómo se configura?
                </p>
                <p className="mt-2 leading-relaxed">
                    El correo se define en el archivo <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">.env</code> del
                    servidor con las variables <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">SMTP_HOST</code>,{' '}
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">SMTP_PORT</code>,{' '}
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">SMTP_USER</code>,{' '}
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">SMTP_PASSWORD</code> y{' '}
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">MAIL_FROM</code>. Funciona con
                    cualquier proveedor SMTP: Microsoft&nbsp;365, Google Workspace, Amazon SES o un relay propio.
                </p>
            </div>

            {/* Preferencias de la organización */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-medium text-slate-900">Preferencias</h3>
                <p className="mt-1 text-sm text-slate-500">
                    Se aplican a los tickets que llegan por correo y a las respuestas que se envían.
                </p>

                <div className="mt-5 space-y-5">
                    <div>
                        <label htmlFor="firma" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Firma de los correos
                        </label>
                        <textarea
                            id="firma"
                            rows={4}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={'Equipo de Soporte\nMesa de ayuda'}
                            value={prefs.email_signature}
                            onChange={e => setPrefs({ ...prefs, email_signature: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="tipo" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Tipo por defecto
                            </label>
                            <select
                                id="tipo"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={prefs.email_default_type}
                                onChange={e => setPrefs({ ...prefs, email_default_type: e.target.value })}
                            >
                                <option value="incident">Incidente</option>
                                <option value="service_request">Solicitud de servicio</option>
                                <option value="problem">Problema</option>
                                <option value="change">Cambio</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="prioridad" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Prioridad por defecto
                            </label>
                            <select
                                id="prioridad"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={prefs.email_default_priority}
                                onChange={e => setPrefs({ ...prefs, email_default_priority: e.target.value })}
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={guardar} isLoading={guardando} icon={<Save className="h-4 w-4" />}>
                            Guardar preferencias
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EmailIntegration
