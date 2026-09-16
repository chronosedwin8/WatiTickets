import { useState, useEffect } from 'react'
import { profilesApi, teamsApi, type Profile, type UserRole, type Tenant, type Team } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

import { Loader2, Save, X, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'

interface EditMemberModalProps {
    member: Profile
    tenant: Tenant | null
    primaryColor: string
    onCancel: () => void
    onSuccess: () => void
}

export function EditMemberModal({ member, tenant, primaryColor, onCancel, onSuccess }: EditMemberModalProps) {
    const { profile: currentUserProfile } = useAuth()
    const isCurrentUserAdmin = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'owner'

    const [editData, setEditData] = useState({
        fullName: member.full_name || '',
        role: (member.role || 'agent') as UserRole,
        email: member.email || ''
    })
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')
    const [teams, setTeams] = useState<Team[]>([])
    const [loadingTeams, setLoadingTeams] = useState(false)
    const [savingMember, setSavingMember] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Password change state
    const [showPasswordSection, setShowPasswordSection] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [changingPassword, setChangingPassword] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

    useEffect(() => {
        if (tenant?.id) {
            loadTeams()
            loadUserTeam()
        }
    }, [tenant?.id, member.id])

    const loadTeams = async () => {
        if (!tenant?.id) return
        try {
            setLoadingTeams(true)
            const data = await teamsApi.getAll(tenant.id)
            setTeams(data)
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading teams', error)
        } finally {
            setLoadingTeams(false)
        }
    }

    const loadUserTeam = async () => {
        try {
            const userTeams = await teamsApi.getUserTeams(member.id)
            if (userTeams.length > 0) {
                setSelectedTeamId(userTeams[0])
            }
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading user team', error)
        }
    }

    const handleSaveMember = async () => {
        setSavingMember(true)
        setError(null)
        try {
            const selectedTeam = teams.find(t => t.id === selectedTeamId)
            const departmentName = selectedTeam?.name || null

            await profilesApi.update(member.id, {
                full_name: editData.fullName,
                role: editData.role,
                department: departmentName,
            })

            const currentTeams = await teamsApi.getUserTeams(member.id)

            if (selectedTeamId && (!currentTeams.includes(selectedTeamId) || currentTeams.length === 0)) {
                for (const teamId of currentTeams) {
                    await teamsApi.removeMember(teamId, member.id)
                }
                if (selectedTeamId) {
                    await teamsApi.addMember(selectedTeamId, member.id)
                }
            } else if (!selectedTeamId && currentTeams.length > 0) {
                for (const teamId of currentTeams) {
                    await teamsApi.removeMember(teamId, member.id)
                }
            }

            onSuccess()
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            setError('Error al actualizar el usuario.')
        } finally {
            setSavingMember(false)
        }
    }

    const handleChangePassword = async () => {
        setPasswordError(null)
        setPasswordSuccess(null)

        if (newPassword.length < 6) {
            setPasswordError('La contraseña debe tener al menos 6 caracteres.')
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Las contraseñas no coinciden.')
            return
        }

        setChangingPassword(true)

        try {
            await profilesApi.setPassword(member.id, newPassword)

            setPasswordSuccess('¡Contraseña actualizada exitosamente!')
            setNewPassword('')
            setConfirmPassword('')
            setShowNewPassword(false)
            setShowConfirmPassword(false)

            // Auto-hide success message after 3 seconds
            setTimeout(() => setPasswordSuccess(null), 3000)
        } catch (err: any) {
            if (import.meta.env.DEV) console.error('Password change error:', err)
            setPasswordError(err.message || 'Error al cambiar la contraseña.')
        } finally {
            setChangingPassword(false)
        }
    }

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        fontSize: '14px',
        border: '1.5px solid #E5E7EB',
        borderRadius: '8px',
        outline: 'none',
        boxSizing: 'border-box' as const,
    }

    const labelStyle = {
        display: 'block',
        fontSize: '12px',
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: '6px',
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
        }}>
            <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
                width: '100%',
                maxWidth: '460px',
                padding: '24px',
                margin: '16px',
                maxHeight: '90vh',
                overflowY: 'auto',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Editar Usuario</h3>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#9CA3AF',
                        }}
                    >
                        <X style={{ width: '20px', height: '20px' }} />
                    </button>
                </div>

                {error && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '14px',
                        borderRadius: '8px',
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={labelStyle}>Nombre Completo</label>
                        <input
                            type="text"
                            style={inputStyle}
                            value={editData.fullName}
                            onChange={e => setEditData({ ...editData, fullName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Email</label>
                        <input
                            type="email"
                            style={{
                                ...inputStyle,
                                backgroundColor: '#F3F4F6',
                                color: '#6B7280',
                            }}
                            value={editData.email}
                            disabled
                        />
                    </div>

                    {/* Department Selection */}
                    <div>
                        <label style={labelStyle}>Departamento</label>
                        <select
                            style={{
                                ...inputStyle,
                                backgroundColor: '#FFFFFF',
                            }}
                            value={selectedTeamId}
                            onChange={e => setSelectedTeamId(e.target.value)}
                            disabled={loadingTeams}
                        >
                            <option value="">-- Sin Departamento --</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Rol</label>
                        <select
                            style={{
                                ...inputStyle,
                                backgroundColor: '#FFFFFF',
                            }}
                            value={editData.role}
                            onChange={e => setEditData({ ...editData, role: e.target.value as UserRole })}
                        >
                            <option value="admin">Administrador</option>
                            <option value="manager">Gerente</option>
                            <option value="agent">Agente de Soporte</option>
                            <option value="technician">Técnico de Campo</option>
                            <option value="developer">Desarrollador</option>
                        </select>
                    </div>

                    {/* Password Change Section - Only for Admins */}
                    {isCurrentUserAdmin && (
                        <div style={{
                            marginTop: '4px',
                            borderTop: '1px solid #F3F4F6',
                            paddingTop: '16px',
                        }}>
                            {!showPasswordSection ? (
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordSection(true)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '10px 16px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: '#7C3AED',
                                        backgroundColor: '#F5F3FF',
                                        border: '1.5px dashed #C4B5FD',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#EDE9FE'
                                        e.currentTarget.style.borderColor = '#A78BFA'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#F5F3FF'
                                        e.currentTarget.style.borderColor = '#C4B5FD'
                                    }}
                                >
                                    <KeyRound style={{ width: '16px', height: '16px' }} />
                                    Cambiar Contraseña
                                </button>
                            ) : (
                                <div style={{
                                    backgroundColor: '#FAFAFA',
                                    border: '1.5px solid #E5E7EB',
                                    borderRadius: '12px',
                                    padding: '16px',
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '12px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <ShieldCheck style={{ width: '16px', height: '16px', color: '#7C3AED' }} />
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                                                Cambiar Contraseña
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowPasswordSection(false)
                                                setNewPassword('')
                                                setConfirmPassword('')
                                                setPasswordError(null)
                                                setPasswordSuccess(null)
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '2px',
                                                color: '#9CA3AF',
                                                fontSize: '12px',
                                            }}
                                        >
                                            <X style={{ width: '14px', height: '14px' }} />
                                        </button>
                                    </div>

                                    {passwordError && (
                                        <div style={{
                                            marginBottom: '12px',
                                            padding: '8px 12px',
                                            backgroundColor: '#FEF2F2',
                                            color: '#DC2626',
                                            fontSize: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid #FECACA',
                                        }}>
                                            {passwordError}
                                        </div>
                                    )}

                                    {passwordSuccess && (
                                        <div style={{
                                            marginBottom: '12px',
                                            padding: '8px 12px',
                                            backgroundColor: '#F0FDF4',
                                            color: '#16A34A',
                                            fontSize: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid #BBF7D0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            <ShieldCheck style={{ width: '14px', height: '14px' }} />
                                            {passwordSuccess}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div>
                                            <label style={{ ...labelStyle, fontSize: '11px' }}>Nueva Contraseña</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    style={{
                                                        ...inputStyle,
                                                        backgroundColor: '#FFFFFF',
                                                        paddingRight: '40px',
                                                        fontSize: '13px',
                                                    }}
                                                    value={newPassword}
                                                    onChange={e => setNewPassword(e.target.value)}
                                                    placeholder="Mínimo 6 caracteres"
                                                    minLength={6}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '10px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#9CA3AF',
                                                        padding: '2px',
                                                    }}
                                                >
                                                    {showNewPassword
                                                        ? <EyeOff style={{ width: '16px', height: '16px' }} />
                                                        : <Eye style={{ width: '16px', height: '16px' }} />
                                                    }
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ ...labelStyle, fontSize: '11px' }}>Confirmar Contraseña</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    style={{
                                                        ...inputStyle,
                                                        backgroundColor: '#FFFFFF',
                                                        paddingRight: '40px',
                                                        fontSize: '13px',
                                                        borderColor: confirmPassword && newPassword !== confirmPassword ? '#EF4444' : '#E5E7EB',
                                                    }}
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    placeholder="Repite la contraseña"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '10px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#9CA3AF',
                                                        padding: '2px',
                                                    }}
                                                >
                                                    {showConfirmPassword
                                                        ? <EyeOff style={{ width: '16px', height: '16px' }} />
                                                        : <Eye style={{ width: '16px', height: '16px' }} />
                                                    }
                                                </button>
                                            </div>
                                            {confirmPassword && newPassword !== confirmPassword && (
                                                <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                                                    Las contraseñas no coinciden
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleChangePassword}
                                            disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                padding: '8px 14px',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: '#FFFFFF',
                                                background: `linear-gradient(135deg, #7C3AED, #6D28D9)`,
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword ? 'not-allowed' : 'pointer',
                                                opacity: changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword ? 0.6 : 1,
                                                transition: 'all 0.2s',
                                                marginTop: '4px',
                                            }}
                                        >
                                            {changingPassword ? (
                                                <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                                            ) : (
                                                <KeyRound style={{ width: '14px', height: '14px' }} />
                                            )}
                                            {changingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '10px',
                            cursor: 'pointer',
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveMember}
                        disabled={savingMember}
                        style={{
                            padding: '10px 16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#FFFFFF',
                            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: savingMember ? 0.7 : 1,
                        }}
                    >
                        {savingMember ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: '16px', height: '16px' }} />}
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    )
}
