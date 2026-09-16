import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import {
    Cpu,
    HardDrive,
    Shield,
    Globe,
    Monitor,
    Printer,
    Usb,
    Info,
    Layers,
    Server,
    Package,
    Activity,
    Maximize2,
    Printer as PrintIcon,
} from 'lucide-react'

interface TechnicalSpecsProps {
    data: any
    onCreateGroup?: (manufacturer: string, model: string) => void
}

export function TechnicalSpecs({ data, onCreateGroup }: TechnicalSpecsProps) {
    const [activeSection, setActiveSection] = useState<string | null>(null)

    if (!data) {
        return (
            <Card className="p-8 text-center text-slate-500 italic">
                No hay información técnica disponible para este activo.
            </Card>
        )
    }

    // Guard against data being passed as a string
    let techData = data
    if (typeof data === 'string') {
        try {
            techData = JSON.parse(data)
        } catch (e) {
            if (import.meta.env.DEV) console.error('Error parsing technical data:', e)
        }
    }

    const { hardware, software, security, device_info, licenses } = techData || {}

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="flex flex-col gap-6 max-w-full print-container">
            {/* Header Actions */}
            <div className="flex justify-end no-print">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    icon={<PrintIcon size={16} />}
                >
                    Exportar Reporte PDF
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* --- Hardware Section --- */}
                <div className="space-y-6">
                    {/* CPU & Motherboard */}
                    <Card
                        className="p-6 relative group cursor-pointer hover:border-indigo-200 transition-all hover:shadow-md"
                        onClick={() => setActiveSection('cpu')}
                    >
                        <div className="absolute top-4 right-4 text-slate-300 group-hover:text-indigo-400 transition-colors no-print">
                            <Maximize2 size={16} />
                        </div>
                        <div className="flex items-center gap-2 mb-4 text-indigo-600">
                            <Cpu size={20} />
                            <h3 className="font-bold text-slate-900 m-0 text-sm uppercase">Procesador y Placa Base</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Cerebro del Sistema (CPU)</label>
                                <div className="text-sm text-slate-700 font-bold">
                                    {hardware?.cpu?.name || 'N/A'}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{hardware?.cpu?.arch}</span>
                                    <span className="text-xs bg-indigo-50 px-2 py-0.5 rounded text-indigo-600 font-medium">{hardware?.cpu?.hz_advertised}</span>
                                    <span className="text-xs text-slate-500">{hardware?.cpu?.cores_physical} Cores / {hardware?.cpu?.cores_logical} Hilos</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-50">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Placa Base (Motherboard)</label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div>
                                        <div className="text-[10px] text-slate-500">Fabricante</div>
                                        <div className="text-xs font-semibold text-slate-700">{hardware?.motherboard?.manufacturer || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-500">Modelo</div>
                                        <div className="text-xs font-semibold text-slate-700">{hardware?.motherboard?.model || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* RAM */}
                    <Card
                        className="p-6 relative group cursor-pointer hover:border-violet-200 transition-all hover:shadow-md"
                        onClick={() => setActiveSection('ram')}
                    >
                        <div className="absolute top-4 right-4 text-slate-300 group-hover:text-violet-400 transition-colors no-print">
                            <Maximize2 size={16} />
                        </div>
                        <div className="flex items-center gap-2 mb-4 text-violet-600">
                            <Server size={20} />
                            <h3 className="font-bold text-slate-900 m-0 text-sm uppercase">Memoria RAM Instalada</h3>
                        </div>
                        <div className="mb-4">
                            <div className="text-2xl font-black text-slate-900">
                                {hardware?.ram?.total_installed || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-500">Capacidad total detectada</div>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-hidden relative fade-bottom">
                            {hardware?.ram?.modules?.slice(0, 2).map((m: any, i: number) => (
                                <div key={i} className="bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-slate-700">{m.slot || `Módulo ${i + 1}`}</span>
                                        <span className="text-[9px] font-bold text-slate-500">{m.capacity} @ {m.speed}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">{m.manufacturer} - {m.part_number}</div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Network Adapters */}
                    <Card
                        className="p-6 relative group cursor-pointer hover:border-blue-200 transition-all hover:shadow-md"
                        onClick={() => setActiveSection('network')}
                    >
                        <div className="absolute top-4 right-4 text-slate-300 group-hover:text-blue-400 transition-colors no-print">
                            <Maximize2 size={16} />
                        </div>
                        <div className="flex items-center gap-2 mb-4 text-blue-600">
                            <Activity size={20} />
                            <h3 className="font-bold text-slate-900 m-0 text-sm uppercase">Adaptadores de Red</h3>
                        </div>
                        <div className="space-y-3">
                            {hardware?.network_adapters?.adapters?.slice(0, 2).map((adapter: any, i: number) => (
                                <div key={i} className="flex flex-col gap-1 p-3 bg-blue-50/30 rounded border border-blue-100/50">
                                    <div className="text-xs font-bold text-slate-800 line-clamp-1 truncate">
                                        {adapter.description}
                                    </div>
                                    <div className="text-[10px] font-mono text-blue-600">{Array.isArray(adapter.ip_address) ? adapter.ip_address[0] : adapter.ip_address}</div>
                                </div>
                            ))}
                            {(!hardware?.network_adapters?.adapters || hardware.network_adapters.adapters.length === 0) && (
                                <div className="text-sm text-slate-400 italic">No se encontraron adaptadores activos</div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* --- Peripherals & OS Section --- */}
                <div className="space-y-6">
                    {/* Storage */}
                    <Card
                        className="p-6 relative group cursor-pointer hover:border-emerald-200 transition-all hover:shadow-md"
                        onClick={() => setActiveSection('storage')}
                    >
                        <div className="absolute top-4 right-4 text-slate-300 group-hover:text-emerald-400 transition-colors no-print">
                            <Maximize2 size={16} />
                        </div>
                        <div className="flex items-center gap-2 mb-4 text-emerald-600">
                            <HardDrive size={20} />
                            <h3 className="font-bold text-slate-900 m-0 text-sm uppercase">Almacenamiento y Discos</h3>
                        </div>
                        <div className="space-y-4">
                            {hardware?.disks?.slice(0, 1).map((disk: any, i: number) => (
                                <div key={i} className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="text-sm font-bold text-slate-900 truncate mr-2">{disk.model}</div>
                                        <div className="text-xs font-black text-emerald-600">{disk.size}</div>
                                    </div>
                                    <div className="text-[10px] text-slate-500">SN: {disk.serial}</div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* OS & Licenses */}
                    <Card
                        className="p-6 relative group cursor-pointer hover:border-amber-200 transition-all hover:shadow-md"
                        onClick={() => setActiveSection('os')}
                    >
                        <div className="absolute top-4 right-4 text-slate-300 group-hover:text-amber-400 transition-colors no-print">
                            <Maximize2 size={16} />
                        </div>
                        <div className="flex items-center gap-2 mb-4 text-amber-600">
                            <Shield size={20} />
                            <h3 className="font-bold text-slate-900 m-0 text-sm uppercase">Sistema y Licenciamiento</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Sistema</label>
                                <div className="text-xs text-slate-800 font-bold truncate">{software?.system?.os} {software?.system?.release}</div>
                            </div>
                            <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Licencia</label>
                                <div className={`text-[8px] font-black px-1.5 py-0.5 rounded inline-block ${licenses?.status === 'Licensed' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {licenses?.status?.toUpperCase() || 'ERROR'}
                                </div>
                            </div>
                            <div className="col-span-2 border-t border-slate-100 pt-2 mt-1">
                                <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Último Usuario</label>
                                <div className="text-xs font-mono font-bold text-indigo-600 truncate" title={device_info?.last_logged_user}>{device_info?.last_logged_user || 'N/A'}</div>
                            </div>
                        </div>
                    </Card>

                    {/* Peripherals Detail */}
                    <Card
                        className="p-6 relative group cursor-pointer hover:border-slate-300 transition-all hover:shadow-md"
                        onClick={() => setActiveSection('peripherals')}
                    >
                        <div className="absolute top-4 right-4 text-slate-300 group-hover:text-slate-500 transition-colors no-print">
                            <Maximize2 size={16} />
                        </div>
                        <div className="flex items-center gap-2 mb-4 text-slate-600">
                            <Monitor size={20} />
                            <h3 className="font-bold text-slate-900 m-0 text-sm uppercase">Periféricos e Interfaz</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <span>Monitores</span>
                                    <span className="font-bold">{hardware?.monitors?.length || 0}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <span>Impresoras</span>
                                    <span className="font-bold">{hardware?.printers?.length || 0}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>USB Disponibles</span>
                                    <span className="font-bold">{hardware?.usb_devices?.length || 0}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* --- Software Catalog Section --- */}
            <Card
                className="p-6 relative group cursor-pointer hover:border-rose-200 transition-all hover:shadow-md"
                onClick={() => setActiveSection('software')}
            >
                <div className="absolute top-4 right-4 text-slate-300 group-hover:text-rose-400 transition-colors no-print">
                    <Maximize2 size={16} />
                </div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-rose-600">
                        <Package size={20} />
                        <h3 className="font-bold text-slate-900 m-0 text-sm uppercase">Catálogo de Software</h3>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                        {software?.installed_software?.length || 0} APPS
                    </div>
                </div>
                <div className="text-xs text-slate-500 italic">Haz clic para ver el catálogo completo de aplicaciones y sus versiones.</div>
            </Card>

            {/* Footer Metadata */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative no-print">
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
                            <Info size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Última Sincronización</div>
                            <div className="text-lg font-black">{data.generated_at ? new Date(data.generated_at).toLocaleString() : 'N/A'}</div>
                        </div>
                    </div>
                    <div className="text-right sr-only sm:not-sr-only">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">TicketWati Agent ID</div>
                        <div className="text-xs font-mono text-indigo-400 font-bold">{device_info?.device_name} :: {device_info?.serial_number}</div>
                    </div>
                </div>
                {/* Subtle background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
            </div>

            {/* Print Only Section - A unified view for the PDF */}
            <div className="print-only-content space-y-8 print:block hidden p-8">
                <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">REPORTE TÉCNICO DE ACTIVO</h1>
                        <p className="text-slate-500 font-medium">Inventario Detallado de Hardware y Software</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-slate-900">{device_info?.device_name}</div>
                        <div className="text-sm text-slate-500">S/N: {device_info?.serial_number}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Hardware Principal</h2>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] block font-bold text-slate-400 uppercase">Procesador</span>
                                    <p className="text-sm font-bold text-slate-900">{hardware?.cpu?.name}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] block font-bold text-slate-400 uppercase">Memoria RAM</span>
                                    <p className="text-sm font-bold text-slate-900">{hardware?.ram?.total_installed}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] block font-bold text-slate-400 uppercase">Placa Base</span>
                                    <p className="text-sm font-bold text-slate-900">{hardware?.motherboard?.manufacturer} {hardware?.motherboard?.model}</p>
                                </div>
                            </div>
                        </section>
                        <section>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Red y Periféricos</h2>
                            <div className="space-y-2">
                                <div className="text-xs">Monitores: {hardware?.monitors?.length}</div>
                                <div className="text-xs">Impresoras: {hardware?.printers?.length}</div>
                                <div className="text-xs">Dispositivos USB: {hardware?.usb_devices?.length}</div>
                            </div>
                        </section>
                    </div>
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Sistema Operativo</h2>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] block font-bold text-slate-400 uppercase">Versión de Windows</span>
                                    <p className="text-sm font-bold text-slate-900">{software?.system?.os} {software?.system?.release} ({software?.system?.version})</p>
                                </div>
                                <div>
                                    <span className="text-[10px] block font-bold text-slate-400 uppercase">Licencia</span>
                                    <p className="text-sm font-bold text-slate-900">{licenses?.status}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] block font-bold text-slate-400 uppercase">Último Usuario</span>
                                    <p className="text-sm font-bold text-slate-900 font-mono text-indigo-600">{device_info?.last_logged_user || 'N/A'}</p>
                                </div>
                            </div>
                        </section>
                        <section>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Seguridad</h2>
                            <div className="text-xs">AV: {security?.av_active}</div>
                            <div className="text-xs">TPM: {security?.tpm_present ? 'Activo' : 'No detectado'}</div>
                        </section>
                    </div>
                </div>

                <section className="pt-8">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Catálogo de Software</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                        {software?.installed_software?.slice(0, 100).map((s: any, i: number) => (
                            <div key={i} className="text-[9px] text-slate-600 truncate border-b border-slate-50 py-1">
                                <span className="font-bold">{s.name}</span> - v{s.version}
                            </div>
                        ))}
                    </div>
                    {software?.installed_software?.length > 100 && (
                        <p className="text-[9px] text-slate-400 mt-2">Muestra parcial de los primeros 100 de {software.installed_software.length} aplicaciones.</p>
                    )}
                </section>

                <div className="mt-auto pt-10 text-[10px] text-slate-400 flex justify-between border-t border-slate-100">
                    <div>Generado por TicketWati Agent :: {new Date().toLocaleString()}</div>
                    <div>Página 1 / 1</div>
                </div>
            </div>

            {/* --- Modals for Expansion --- */}
            {/* CPU Modal */}
            <Dialog
                isOpen={activeSection === 'cpu'}
                onClose={() => setActiveSection(null)}
                title="Detalle de Procesador y Placa Base"
            >
                <div className="space-y-6">
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                        <h4 className="text-xs font-black text-indigo-400 uppercase mb-4 tracking-widest">Unidad Central de Procesamiento</h4>
                        <div className="text-xl font-black text-slate-900 mb-2">{hardware?.cpu?.name}</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100/50">
                                <div className="text-[9px] text-slate-400 uppercase font-black">Arquitectura</div>
                                <div className="text-sm font-bold text-indigo-600">{hardware?.cpu?.arch}</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100/50">
                                <div className="text-[9px] text-slate-400 uppercase font-black">Frecuencia</div>
                                <div className="text-sm font-bold text-indigo-600">{hardware?.cpu?.hz_advertised}</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100/50">
                                <div className="text-[9px] text-slate-400 uppercase font-black">Cores</div>
                                <div className="text-sm font-bold text-indigo-600">{hardware?.cpu?.cores_physical}</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100/50">
                                <div className="text-[9px] text-slate-400 uppercase font-black">Hilos</div>
                                <div className="text-sm font-bold text-indigo-600">{hardware?.cpu?.cores_logical}</div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Información de Fabricante</h4>
                            {onCreateGroup && hardware?.motherboard?.manufacturer && hardware?.motherboard?.model && (
                                <Button
                                    size="sm"
                                    onClick={() => onCreateGroup(hardware.motherboard.manufacturer, hardware.motherboard.model)}
                                    className="bg-indigo-600 hover:bg-slate-700 text-white text-[10px] h-7 px-3"
                                >
                                    AGRUPAR EQUIPOS
                                </Button>
                            )}
                        </div>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100">
                                <tr><td className="py-2 text-slate-500">Fabricante</td><td className="py-2 font-bold text-right">{hardware?.motherboard?.manufacturer}</td></tr>
                                <tr><td className="py-2 text-slate-500">Modelo</td><td className="py-2 font-bold text-right">{hardware?.motherboard?.model}</td></tr>
                                <tr><td className="py-2 text-slate-500">Número de Serie</td><td className="py-2 font-mono font-bold text-right text-indigo-600">{hardware?.motherboard?.serial_number}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Dialog>

            {/* RAM Modal */}
            <Dialog
                isOpen={activeSection === 'ram'}
                onClose={() => setActiveSection(null)}
                title="Detalle de Memoria RAM"
            >
                <div className="space-y-6">
                    <div className="flex items-end gap-3 mb-6">
                        <div className="text-4xl font-black text-slate-900">{hardware?.ram?.total_installed}</div>
                        <div className="text-sm text-slate-400 font-bold uppercase mb-1">Capacidad Total</div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {hardware?.ram?.modules?.map((m: any, i: number) => (
                            <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{m.slot}</span>
                                    <span className="text-xs font-black text-slate-900">{m.capacity} @ {m.speed}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[9px] text-slate-400 uppercase font-black">Fabricante</div>
                                        <div className="text-xs font-bold text-slate-700">{m.manufacturer}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-slate-400 uppercase font-black">Serial</div>
                                        <div className="text-xs font-mono text-slate-700">{m.serial}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="text-[9px] text-slate-400 uppercase font-black">Part Number</div>
                                        <div className="text-xs font-mono text-slate-700">{m.part_number}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Dialog>

            {/* Storage Modal */}
            <Dialog
                isOpen={activeSection === 'storage'}
                onClose={() => setActiveSection(null)}
                title="Detalle de Almacenamiento"
            >
                <div className="space-y-8">
                    {hardware?.disks?.map((disk: any, i: number) => (
                        <div key={i} className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-lg font-black text-slate-900">{disk.model}</div>
                                    <div className="text-xs text-slate-400 font-mono">I/F: {disk.interface} | S/N: {disk.serial}</div>
                                </div>
                                <div className="bg-emerald-500 text-white px-3 py-1 rounded-lg font-black text-sm">{disk.size}</div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {disk.partitions?.map((p: any, j: number) => (
                                    <div key={j} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-black text-slate-800">{p.drive} ({p.filesystem})</span>
                                            <span className="text-xs text-slate-500">{p.free} libres de {p.size}</span>
                                        </div>
                                        {/* Simple Progress Bar */}
                                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500"
                                                style={{ width: `${100 - (parseFloat(p.free) / parseFloat(p.size) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Dialog>

            {/* Network Modal */}
            <Dialog
                isOpen={activeSection === 'network'}
                onClose={() => setActiveSection(null)}
                title="Configuración de Red"
            >
                <div className="space-y-4">
                    {hardware?.network_adapters?.adapters?.map((adapter: any, i: number) => (
                        <div key={i} className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                            <div className="font-bold text-slate-900 mb-4">{adapter.description}</div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-400 uppercase">Direcciones IP</span>
                                    <div className="text-right">
                                        {Array.isArray(adapter.ip_address) ? adapter.ip_address.map((ip: string, k: number) => (
                                            <div key={k} className="text-xs font-mono font-bold text-blue-600">{ip}</div>
                                        )) : <div className="text-xs font-mono font-bold text-blue-600">{adapter.ip_address}</div>}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-blue-100/50">
                                    <span className="text-xs font-black text-slate-400 uppercase">Dirección MAC</span>
                                    <span className="text-xs font-mono font-bold text-slate-700">{adapter.mac_address}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Dialog>

            {/* Peripherals Modal */}
            <Dialog
                isOpen={activeSection === 'peripherals'}
                onClose={() => setActiveSection(null)}
                title="Detalle de Periféricos e Interfaz"
            >
                <div className="space-y-8">
                    <section>
                        <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                            <Monitor size={14} /> Monitores y Pantallas
                        </h4>
                        <div className="space-y-2">
                            {hardware?.monitors?.map((m: any, i: number) => (
                                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-700">{m.name}</span>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase italic">{m.status}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                            <Printer size={14} /> Impresoras y Dispositivos de Salida
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {hardware?.printers?.map((p: any, i: number) => (
                                <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${p.default ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                    <span className="text-xs font-bold truncate mr-2">{p.name}</span>
                                    {p.default && <span className="text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Default</span>}
                                </div>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                            <Usb size={14} /> Lista Completa de Dispositivos USB
                        </h4>
                        <div className="bg-slate-50 rounded-2xl p-4 max-h-80 overflow-y-auto custom-scrollbar border border-slate-100">
                            <table className="w-full text-left">
                                <thead className="text-[9px] text-slate-400 font-black uppercase sticky top-0 bg-slate-50 pb-2">
                                    <tr><th className="pb-2">Dispositivo</th><th className="pb-2">Fabricante</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/50">
                                    {hardware?.usb_devices?.map((u: any, i: number) => (
                                        <tr key={i}>
                                            <td className="py-2 pr-4 text-[10px] font-bold text-slate-700">{u.name}</td>
                                            <td className="py-2 text-[10px] text-slate-400 italic">{u.manufacturer}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </Dialog>

            {/* Software Modal */}
            <Dialog
                isOpen={activeSection === 'software'}
                onClose={() => setActiveSection(null)}
                title="Catálogo Completo de Software"
            >
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-lg font-black text-slate-900">{software?.installed_software?.length || 0} Aplicaciones</div>
                        <div className="text-xs text-slate-400 italic font-medium">Sincronizado el {data.generated_at ? new Date(data.generated_at).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase">Nombre</th>
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase">Versión</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {software?.installed_software?.map((s: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-xs font-bold text-slate-800">{s.name}</td>
                                        <td className="p-4 text-xs font-mono text-slate-400">{s.version}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Dialog>

            {/* OS Modal */}
            <Dialog
                isOpen={activeSection === 'os'}
                onClose={() => setActiveSection(null)}
                title="Sistema y Licenciamiento Detallado"
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                            <h4 className="text-[10px] font-black text-amber-500 uppercase mb-4 tracking-widest">Estado de Licencia</h4>
                            <div className="text-2xl font-black text-slate-900 mb-2">{licenses?.status}</div>
                            <div className="text-xs font-mono text-slate-500 bg-white/50 p-2 rounded border border-amber-200/50 inline-block">Key: ****-****-****-{licenses?.key_last_5}</div>
                        </div>
                        <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100">
                            <h4 className="text-[10px] font-black text-rose-500 uppercase mb-4 tracking-widest">Seguridad Endpoint</h4>
                            <div className="text-lg font-black text-slate-900 mb-2 truncate" title={security?.av_active}>{security?.av_active || 'Sin Antivirus'}</div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">TPM 2.0:</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${security?.tpm_present ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                                    {security?.tpm_present ? 'Presente' : 'No Detectado'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Detalle del Sistema Operativo</h4>
                        <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    <tr><td className="p-4 text-slate-500">OS</td><td className="p-4 font-bold text-right">{software?.system?.os}</td></tr>
                                    <tr><td className="p-4 text-slate-500">Versión/Build</td><td className="p-4 font-bold text-right">{software?.system?.version}</td></tr>
                                    <tr><td className="p-4 text-slate-500">Arquitectura</td><td className="p-4 font-bold text-right">{software?.system?.architecture}</td></tr>
                                    <tr><td className="p-4 text-slate-500">Última Actualización</td><td className="p-4 font-bold text-right text-amber-600">{software?.last_update || 'N/A'}</td></tr>
                                    <tr><td className="p-4 text-slate-500">Último Usuario</td><td className="p-4 font-bold text-right text-indigo-600 font-mono">{device_info?.last_logged_user || 'N/A'}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Dialog>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
                
                .fade-bottom::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 40px;
                    background: linear-gradient(to top, white, transparent);
                    pointer-events: none;
                }

                @media print {
                    @page { margin: 1cm; size: auto; }
                    body { visibility: hidden; }
                    .print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    .print-container .print-only-content {
                        visibility: visible;
                        display: block !important;
                        width: 100% !important;
                    }
                    .print-container .print-only-content * {
                        visibility: visible;
                    }
                    .print-container > div:not(.print-only-content) {
                        display: none !important;
                    }
                    .no-print { display: none !important; }
                    
                    /* Reset colors for print */
                    * { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                }
            `}</style>
        </div>
    )
}
