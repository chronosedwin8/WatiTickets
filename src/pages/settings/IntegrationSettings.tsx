import { useNavigate } from 'react-router-dom'
import { Shield, Mail, MessageSquare, Users as UsersIcon, ArrowRight } from 'lucide-react'

export function IntegrationSettings() {
    const navigate = useNavigate()

    return (
        <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Integraciones y Configuración</h2>
            <div className="space-y-4">
                {/* Menu Permissions - Special Card */}
                <div
                    onClick={() => navigate('/settings/menu-permissions')}
                    className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-lg">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                                Permisos de Menú
                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">ADMIN</span>
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Personaliza qué ve cada rol en el menú lateral</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-indigo-600 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Email Integration - Special Card */}
                <div
                    onClick={() => navigate('/settings/email-integration')}
                    className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-lg">
                            <Mail className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                                Integración de Email
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">ADMIN</span>
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Configura Amazon SES para tickets por email</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Other Integrations */}
                {[
                    { name: 'Slack', description: 'Notificaciones en canales', connected: true, icon: MessageSquare },
                    { name: 'Azure AD', description: 'SSO y sincronización de usuarios', connected: false, icon: UsersIcon },
                    { name: 'Microsoft Teams', description: 'Tickets desde Teams', connected: false, icon: MessageSquare },
                ].map((integration) => (
                    <div key={integration.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                            <integration.icon className="h-5 w-5 text-gray-600" />
                            <div>
                                <p className="font-medium text-gray-900">{integration.name}</p>
                                <p className="text-sm text-gray-500">{integration.description}</p>
                            </div>
                        </div>
                        <button className={`px-4 py-2 rounded-lg font-medium transition-colors ${integration.connected
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}>
                            {integration.connected ? 'Configurar' : 'Conectar'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
