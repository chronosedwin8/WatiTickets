import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { ticketsApi, type TicketWithRelations } from '@/lib/api'
import { cn } from '@/lib/utils'
import { AlertTriangle, User, TicketIcon } from 'lucide-react'
import { priorityConfig, statusConfig } from './constants'

interface TicketsKanbanProps {
    tickets: TicketWithRelations[]
    onTicketsChange: (tickets: TicketWithRelations[]) => void
}

const KANBAN_COLUMNS = [
    { id: 'new', label: 'Nuevo', color: 'blue' },
    { id: 'open', label: 'Abierto', color: 'indigo' },
    { id: 'pending', label: 'Pendiente', color: 'amber' },
    { id: 'on_hold', label: 'En Espera', color: 'slate' },
    { id: 'resolved', label: 'Resuelto', color: 'emerald' },
] as const

const priorityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const columnHeaderColors: Record<string, string> = {
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    slate: 'bg-slate-400',
    emerald: 'bg-emerald-500',
}

export function TicketsKanban({ tickets, onTicketsChange }: TicketsKanbanProps) {
    const [draggingId, setDraggingId] = useState<string | null>(null)

    const onDragStart = (start: { draggableId: string }) => {
        setDraggingId(start.draggableId)
    }

    const onDragEnd = async (result: DropResult) => {
        setDraggingId(null)
        const { destination, source, draggableId } = result

        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        const newStatus = destination.droppableId as TicketWithRelations['status']

        // Optimistic update
        const updatedTickets = tickets.map(t =>
            t.id === draggableId ? { ...t, status: newStatus } : t
        )
        onTicketsChange(updatedTickets)

        try {
            await ticketsApi.update(draggableId, { status: newStatus })
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error updating ticket status', err)
            // Revert on error
            onTicketsChange(tickets)
        }
    }

    return (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="overflow-x-auto pb-4 h-full">
                <div className="flex gap-4 min-w-max h-full items-start">
                    {KANBAN_COLUMNS.map((column) => {
                        const columnTickets = tickets.filter(t => t.status === column.id)

                        return (
                            <div key={column.id} className="w-72 flex-shrink-0 flex flex-col max-h-[calc(100vh-280px)]">
                                {/* Column Header */}
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <div className={cn('w-2.5 h-2.5 rounded-full', columnHeaderColors[column.color])} />
                                    <h3 className="font-bold text-slate-700 text-sm">{column.label}</h3>
                                    <span className="ml-auto bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {columnTickets.length}
                                    </span>
                                </div>

                                {/* Droppable Area */}
                                <Droppable droppableId={column.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={cn(
                                                "flex-1 p-2 rounded-xl transition-colors min-h-[120px] overflow-y-auto",
                                                snapshot.isDraggingOver
                                                    ? "bg-indigo-50/60 ring-2 ring-indigo-400/30"
                                                    : "bg-slate-50/60"
                                            )}
                                        >
                                            {columnTickets.map((ticket, index) => {
                                                const priority = priorityConfig[ticket.priority] || priorityConfig.medium
                                                const assigneeName = ticket.assignees?.[0]?.user?.full_name
                                                    || ticket.assignee?.full_name
                                                    || null

                                                return (
                                                    <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={cn(
                                                                    "bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-2.5 group hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing",
                                                                    snapshot.isDragging
                                                                        ? "shadow-xl rotate-1 scale-[1.02] z-50 border-indigo-400 ring-2 ring-indigo-200"
                                                                        : ""
                                                                )}
                                                            >
                                                                {/* Number + Priority */}
                                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                                    <Link
                                                                        to={`/tickets/${ticket.id}`}
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                                    >
                                                                        #{ticket.number}
                                                                    </Link>
                                                                    <span className={cn(
                                                                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                                        priorityColors[ticket.priority] || 'bg-slate-100 text-slate-500'
                                                                    )}>
                                                                        {priority.label}
                                                                    </span>
                                                                </div>

                                                                {/* Title */}
                                                                <Link
                                                                    to={`/tickets/${ticket.id}`}
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="block text-sm font-semibold text-slate-800 mb-3 line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors"
                                                                >
                                                                    {ticket.title}
                                                                </Link>

                                                                {/* Assignee */}
                                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                    {assigneeName ? (
                                                                        <>
                                                                            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0">
                                                                                {assigneeName[0]}
                                                                            </div>
                                                                            <span className="truncate">{assigneeName}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <AlertTriangle size={12} className="text-amber-400" />
                                                                            <span className="italic text-amber-500">Sin asignar</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                )
                                            })}
                                            {provided.placeholder}

                                            {columnTickets.length === 0 && !snapshot.isDraggingOver && (
                                                <div className="flex flex-col items-center justify-center h-20 text-slate-300 border-2 border-dashed border-slate-200 rounded-xl m-1">
                                                    <TicketIcon size={20} className="mb-1" />
                                                    <p className="text-xs">Vacío</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        )
                    })}
                </div>
            </div>
        </DragDropContext>
    )
}
