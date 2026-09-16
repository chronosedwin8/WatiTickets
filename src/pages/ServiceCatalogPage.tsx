import { Routes, Route, Navigate } from 'react-router-dom'
import { ServiceCatalogList } from './service-catalog/ServiceCatalogList'
import { NewServiceItemForm } from './service-catalog/NewServiceItemForm'
import { ServiceItemDetail } from './service-catalog/ServiceItemDetail'
import { AbsenceRequestForm } from './service-catalog/AbsenceRequestForm'

export function ServiceCatalogPage() {
    return (
        <Routes>
            <Route index element={<ServiceCatalogList />} />
            <Route path="new" element={<NewServiceItemForm />} />
            <Route path="absence/new" element={<AbsenceRequestForm />} />
            <Route path=":id" element={<ServiceItemDetail />} />
            <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
    )
}
