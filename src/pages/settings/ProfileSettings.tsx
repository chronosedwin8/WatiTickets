import { Upload, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface ProfileSettingsProps {
    primaryColor: string
}

export function ProfileSettings({ primaryColor }: ProfileSettingsProps) {
    const { profile } = useAuth()

    return (
        <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Información de Perfil</h2>
            <div className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-medium">
                        {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <button className="btn btn-secondary">
                            <Upload className="h-4 w-4" />
                            Cambiar foto
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre completo
                        </label>
                        <input
                            type="text"
                            className="input"
                            defaultValue={profile?.full_name || ''}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Correo electrónico
                        </label>
                        <input
                            type="email"
                            className="input"
                            defaultValue={profile?.email || ''}
                            disabled
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Departamento
                        </label>
                        <input
                            type="text"
                            className="input"
                            defaultValue={profile?.department || ''}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rol
                        </label>
                        <input
                            type="text"
                            className="input"
                            defaultValue={profile?.role || ''}
                            disabled
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <button
                        className="btn btn-primary"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                    >
                        <Save className="h-4 w-4" />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    )
}
