import { Routes, Route } from 'react-router-dom'
import { WorkOrdersList } from './work-orders/WorkOrdersList'
import { WorkOrderDetail } from './work-orders/WorkOrderDetail'
import { NewWorkOrderForm } from './work-orders/NewWorkOrderForm'

export function WorkOrdersPage() {
    return (
        <Routes>
            <Route index element={<WorkOrdersList />} />
            <Route path=":id" element={<WorkOrderDetail />} />
            <Route path="new" element={<NewWorkOrderForm />} />
        </Routes>
    )
}
