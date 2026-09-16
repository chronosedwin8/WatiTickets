import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ticketsApi, type TicketWithRelations } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'

interface MergeTicketsModalProps {
    tickets: TicketWithRelations[]
    onClose: () => void
    onMergeComplete: () => void
}

export function MergeTicketsModal({ tickets, onClose, onMergeComplete }: MergeTicketsModalProps) {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [masterTicketId, setMasterTicketId] = useState<string>(tickets[0]?.id || '')

    const handleMerge = async () => {
        if (!profile?.id) return
        setLoading(true)
        try {
            const childIds = tickets.filter(t => t.id !== masterTicketId).map(t => t.id)
            if (childIds.length === 0) {
                toast({ title: 'Atención', description: 'Debes seleccionar al menos un ticket para fusionar (además del principal).', variant: 'destructive' })
                setLoading(false)
                return
            }

            await ticketsApi.merge(masterTicketId, childIds, profile.id)
            onMergeComplete()
        } catch (error) {
            if (import.meta.env.DEV) console.error(error)
            toast({ title: 'Error', description: 'Error al fusionar tickets', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={onClose} />
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                <div className="relative inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium leading-6 text-slate-900">Fusionar Tickets</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="mb-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-3 mb-4">
                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                            <div className="text-sm text-amber-800">
                                <p className="font-medium">Atención</p>
                                <p>Al fusionar, un ticket será el principal y los demás se cerrarán. Esta acción no se puede deshacer fácilmente.</p>
                            </div>
                        </div>

                        <p className="text-sm font-medium text-slate-700 mb-2">Selecciona el ticket principal (Master):</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {tickets.map(ticket => (
                                <label key={ticket.id} className={`flex items-start p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${masterTicketId === ticket.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200'}`}>
                                    <input
                                        type="radio"
                                        name="masterTicket"
                                        className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                        checked={masterTicketId === ticket.id}
                                        onChange={() => setMasterTicketId(ticket.id)}
                                    />
                                    <div className="ml-3 w-full">
                                        <div className="flex justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900">#{ticket.number}</span>
                                                <span className="text-xs text-slate-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                            </div>
                                            {masterTicketId === ticket.id && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">PRINCIPAL</span>}
                                        </div>
                                        <p className="text-sm text-slate-700 font-medium truncate">{ticket.title}</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Reportado por: {ticket.requester?.full_name || 'Desconocido'}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <Button variant="ghost" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleMerge}
                            isLoading={loading}
                            style={{ backgroundColor: '#4F46E5', color: 'white' }}
                        >
                            Fusionar ({tickets.length})
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
