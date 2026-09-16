import { Routes, Route } from 'react-router-dom'
import { ProblemsList } from './problems/ProblemsList'
import { ProblemDetail } from './problems/ProblemDetail'
import { NewProblemForm } from './problems/NewProblemForm'

export function ProblemsPage() {
    return (
        <Routes>
            <Route index element={<ProblemsList />} />
            <Route path="new" element={<NewProblemForm />} />
            <Route path=":id" element={<ProblemDetail />} />
        </Routes>
    )
}
