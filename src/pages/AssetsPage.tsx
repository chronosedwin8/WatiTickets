import { Routes, Route } from 'react-router-dom'
import { AssetsList } from './assets/AssetsList'
import { AssetDetail } from './assets/AssetDetail'
import { AssetForm } from './assets/AssetForm'
import { AssetGroups } from './assets/groups/AssetGroups'
import { AssetGroupDetail } from './assets/groups/AssetGroupDetail'
import { AssetGroupForm } from './assets/groups/AssetGroupForm'

export function AssetsPage() {
    return (
        <Routes>
            <Route index element={<AssetsList />} />

            <Route path="groups" element={<AssetGroups />} />
            <Route path="groups/new" element={<AssetGroupForm />} />
            <Route path="groups/:id" element={<AssetGroupDetail />} />
            <Route path="groups/:id/edit" element={<AssetGroupForm />} />

            <Route path="new" element={<AssetForm />} />
            <Route path=":id" element={<AssetDetail />} />
            <Route path=":id/edit" element={<AssetForm />} />
        </Routes>
    )
}
