/**
 * Almacenamiento de archivos — estado y diagnóstico.
 *
 * Antes esta pantalla pedía las claves de AWS y las guardaba en la base de
 * datos en texto plano. Ahora el almacenamiento lo configura el servidor
 * mediante variables de entorno: las credenciales no pasan por el navegador
 * ni quedan almacenadas donde puedan leerse.
 */
import { useEffect, useState } from 'react'
import { HardDrive, Cloud, CheckCircle2, AlertCircle, Loader2, FileUp } from 'lucide-react'
import { http } from '@/lib/api'

interface Diagnostico {
    almacenamiento: {
        tipo: 'local' | 's3'
        destino: string
        tamanoMaximoMb: number
    }
    entorno: string
}

export function S3Settings() {
    const [datos, setDatos] = useState<Diagnostico | null>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        http.get<{ data: Diagnostico }>('/configuracion/diagnostico')
            .then(res => setDatos(res.data))
            .catch(err => setError(err.message))
            .finally(() => setCargando(false))
    }, [])

    if (cargando) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-red-700">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-medium">No se pudo consultar la configuración</p>
                        <p className="mt-1 text-sm">{error}</p>
                    </div>
                </div>
            </div>
        )
    }

    const esLocal = datos?.almacenamiento.tipo === 'local'

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-slate-900">Almacenamiento de archivos</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Dónde se guardan los adjuntos de tickets, artículos y activos.
                </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-indigo-50 p-3">
                        {esLocal
                            ? <HardDrive className="h-6 w-6 text-indigo-600" />
                            : <Cloud className="h-6 w-6 text-indigo-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-900">
                                {esLocal ? 'Disco del servidor' : 'Bucket S3'}
                            </h3>
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" /> Activo
                            </span>
                        </div>
                        <p className="mt-1 break-all font-mono text-sm text-slate-500">
                            {datos?.almacenamiento.destino}
                        </p>
                    </div>
                </div>

                <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Tamaño máximo por archivo
                        </dt>
                        <dd className="mt-1 flex items-center gap-2 text-sm text-slate-900">
                            <FileUp className="h-4 w-4 text-slate-400" />
                            {datos?.almacenamiento.tamanoMaximoMb} MB
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Entorno
                        </dt>
                        <dd className="mt-1 text-sm text-slate-900">{datos?.entorno}</dd>
                    </div>
                </dl>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                <p className="font-medium text-slate-900">¿Cómo se cambia?</p>
                <p className="mt-2 leading-relaxed">
                    El almacenamiento se define en el archivo <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">.env</code> del
                    servidor. Para usar un bucket S3 en lugar del disco local, ajusta{' '}
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">STORAGE_DRIVER=s3</code> junto a las
                    variables <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">S3_BUCKET</code>,{' '}
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">S3_REGION</code> y sus credenciales, y
                    reinicia el servicio.
                </p>
                <p className="mt-3 leading-relaxed">
                    Las credenciales viven sólo en el servidor: nunca se envían al navegador
                    ni se guardan en la base de datos.
                </p>
            </div>
        </div>
    )
}

export default S3Settings
