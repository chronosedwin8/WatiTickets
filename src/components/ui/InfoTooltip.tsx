import React from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
    text: string
    className?: string
}

export function InfoTooltip({ text, className }: InfoTooltipProps) {
    return (
        <div 
            className={cn("group relative inline-flex items-center", className)}
            tabIndex={0}
            role="tooltip"
            aria-label={text}
            aria-describedby={`tooltip-${text.replace(/\s+/g, '-').toLowerCase()}`}
        >
            <Info size={14} className="text-slate-400 hover:text-slate-600 cursor-help transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full" />
            <div 
                id={`tooltip-${text.replace(/\s+/g, '-').toLowerCase()}`}
                className="invisible group-hover:visible group-focus:visible opacity-0 group-hover:opacity-100 group-focus:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg transition-all duration-200 z-50 pointer-events-none"
            >
                {text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
        </div>
    )
}
