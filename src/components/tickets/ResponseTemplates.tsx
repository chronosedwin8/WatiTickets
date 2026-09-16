import { useState, useRef, useEffect } from 'react'
import { ChevronDown, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Template {
    id: string
    label: string
    text: string
}

const TEMPLATES: Template[] = [
    {
        id: 'received',
        label: 'Solicitud recibida',
        text: 'Hemos recibido tu solicitud y la estamos procesando. En breve un agente se pondrá en contacto contigo para brindarte asistencia. Gracias por tu paciencia.',
    },
    {
        id: 'escalated',
        label: 'Ticket escalado',
        text: 'El ticket ha sido escalado a un nivel de soporte superior para garantizar una resolución adecuada. Nuestro equipo especializado revisará el caso a la brevedad posible.',
    },
    {
        id: 'confirm_resolved',
        label: 'Confirmar resolución',
        text: 'Por favor confirma si el problema fue resuelto satisfactoriamente. Si aún tienes inconvenientes, responde este mensaje y continuaremos asistiendo.',
    },
    {
        id: 'more_info',
        label: 'Solicitar más información',
        text: 'Para poder continuar con la resolución de tu caso, necesitamos información adicional. ¿Podrías proporcionar más detalles sobre el problema o los pasos para reproducirlo?',
    },
    {
        id: 'scheduled',
        label: 'Intervención programada',
        text: 'Hemos programado una intervención técnica para resolver tu solicitud. Te notificaremos con anticipación la fecha y hora exactas. Por favor mantente disponible durante ese período.',
    },
    {
        id: 'closed_no_response',
        label: 'Cierre por falta de respuesta',
        text: 'Dado que no hemos recibido respuesta en los últimos días, procederemos a cerrar este ticket. Si el problema persiste, no dudes en abrir una nueva solicitud.',
    },
    {
        id: 'workaround',
        label: 'Solución temporal',
        text: 'Mientras trabajamos en la solución definitiva, te proporcionamos el siguiente procedimiento temporal que debería resolver el inconveniente de manera provisional.',
    },
    {
        id: 'resolved',
        label: 'Resolución completada',
        text: 'Nos complace informarte que el ticket ha sido resuelto exitosamente. Si tienes alguna duda adicional o el problema reaparece, no dudes en contactarnos. ¡Que tengas un excelente día!',
    },
]

interface ResponseTemplatesProps {
    onSelect: (text: string) => void
}

export function ResponseTemplates({ onSelect }: ResponseTemplatesProps) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    const handleSelect = (template: Template) => {
        onSelect(template.text)
        setOpen(false)
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    open
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50"
                )}
            >
                <FileText size={14} />
                Plantillas
                <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
            </button>

            {open && (
                <div className="absolute bottom-full mb-2 left-0 z-50 w-72 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Plantillas de respuesta</p>
                    </div>
                    <ul className="max-h-72 overflow-y-auto py-1">
                        {TEMPLATES.map(template => (
                            <li key={template.id}>
                                <button
                                    type="button"
                                    onClick={() => handleSelect(template)}
                                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors group"
                                >
                                    <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 mb-0.5">
                                        {template.label}
                                    </p>
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                        {template.text}
                                    </p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
