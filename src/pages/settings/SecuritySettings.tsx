import { Key, Shield } from 'lucide-react'

export function SecuritySettings() {
    return (
        <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Seguridad</h2>
            <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Key className="h-5 w-5 text-gray-600" />
                            <div>
                                <p className="font-medium text-gray-900">Cambiar contraseña</p>
                                <p className="text-sm text-gray-500">Última actualización hace 30 días</p>
                            </div>
                        </div>
                        <button className="btn btn-secondary">Cambiar</button>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-gray-600" />
                            <div>
                                <p className="font-medium text-gray-900">Autenticación de dos factores</p>
                                <p className="text-sm text-gray-500">Añade una capa extra de seguridad</p>
                            </div>
                        </div>
                        <button className="btn btn-secondary">Configurar</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
