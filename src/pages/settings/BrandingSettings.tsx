import { Upload } from 'lucide-react'

interface BrandingSettingsProps {
    primaryColor: string
}

export function BrandingSettings({ primaryColor }: BrandingSettingsProps) {
    return (
        <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Personalización de Marca</h2>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo de la organización
                    </label>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Arrastra tu logo o haz clic para cargar</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG hasta 2MB</p>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color primario
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            className="h-10 w-20 rounded cursor-pointer"
                            defaultValue={primaryColor}
                        />
                        <input
                            type="text"
                            className="input max-w-32"
                            defaultValue={primaryColor}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
