import { type Tenant } from '@/lib/api'

interface OrganizationSettingsProps {
    tenant: Tenant | null
}

export function OrganizationSettings({ tenant }: OrganizationSettingsProps) {
    return (
        <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Información de la Organización</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre de la organización
                    </label>
                    <input
                        type="text"
                        className="input"
                        defaultValue={tenant?.name || ''}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slug (URL)
                    </label>
                    <input
                        type="text"
                        className="input"
                        defaultValue={tenant?.slug || ''}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dominio personalizado
                    </label>
                    <input
                        type="text"
                        className="input"
                        placeholder="soporte.miempresa.com"
                        defaultValue={tenant?.domain || ''}
                    />
                </div>
            </div>
        </div>
    )
}
