import { Routes, Route } from 'react-router-dom'
import { KanbanBoard } from './development/KanbanBoard'
import { StoryForm } from './development/StoryForm'

export function DevelopmentPage() {
    return (
        <Routes>
            <Route index element={<KanbanBoard />} />
            <Route path="new-story" element={<StoryForm />} />
            <Route path=":id" element={<StoryForm />} />
        </Routes>
    )
}
