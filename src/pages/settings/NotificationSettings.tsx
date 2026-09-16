export function NotificationSettings() {
    return (
        <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Notificaciones</h2>
            <div className="space-y-4">
                {['Nuevos tickets asignados', 'Comentarios en mis tickets', 'Alertas de SLA', 'Resumen diario'].map((item) => (
                    <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">{item}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    )
}
