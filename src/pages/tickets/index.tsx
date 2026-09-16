import { Routes, Route } from 'react-router-dom'
import { TicketsList } from './TicketsList'
import { TicketDetail } from './TicketDetail'
import { NewTicketForm } from './NewTicketForm'

export function TicketsPage() {
    return (
        <Routes>
            <Route index element={<TicketsList />} />
            <Route path="new" element={<NewTicketForm />} />
            <Route path=":id" element={<TicketDetail />} />
        </Routes>
    )
}
