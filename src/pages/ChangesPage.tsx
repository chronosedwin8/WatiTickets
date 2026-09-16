import { Routes, Route } from 'react-router-dom'
import { ChangesList } from './changes/ChangesList'
import { ChangeDetail } from './changes/ChangeDetail'
import { NewChangeForm } from './changes/NewChangeForm'

export function ChangesPage() {
    return (
        <Routes>
            <Route index element={<ChangesList />} />
            <Route path="new" element={<NewChangeForm />} />
            <Route path=":id" element={<ChangeDetail />} />
        </Routes>
    )
}
