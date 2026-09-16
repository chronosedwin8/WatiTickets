import { useState } from 'react'
import { profilesApi, type Profile } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

interface MembersTableProps {
    members: Profile[]
    onEdit: (member: Profile) => void
    onDelete: (memberId: string) => void
}

export function MembersTable({ members, onEdit, onDelete }: MembersTableProps) {
    const [showActionsFor, setShowActionsFor] = useState<string | null>(null)

    const handleDeleteMember = async (memberId: string) => {
        // if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return
        onDelete(memberId)
        setShowActionsFor(null)
    }

    return (
        <div className="border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {members.length > 0 ? (
                        members.map((member) => (
                            <tr key={member.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                                {member.avatar_url ? (
                                                    <img className="h-10 w-10 rounded-full" src={member.avatar_url} alt="" />
                                                ) : (
                                                    member.full_name?.charAt(0) || 'U'
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{member.full_name || 'Sin Nombre'}</div>
                                            <div className="text-sm text-gray-500">{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge variant="info">
                                        {member.role || 'user'}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge variant="success" dot>
                                        Activo
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowActionsFor(showActionsFor === member.id ? null : member.id)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                        {showActionsFor === member.id && (
                                            <div className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 overflow-hidden">
                                                <button
                                                    onClick={() => {
                                                        onEdit(member)
                                                        setShowActionsFor(null)
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                                >
                                                    <Pencil className="h-4 w-4 text-slate-400" />
                                                    <span>Editar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMember(member.id)}
                                                    className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span>Eliminar</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                                No hay miembros encontrados
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
