import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import {
    User,
    Users,
    Building2,
    Palette,
    Shield,
    Bell,
    Globe,
    Sliders,
    Database,
    Clock,
    Tags,
    Calendar,
    MapPin,
    CalendarOff
} from 'lucide-react'
import { Departments } from './settings/Departments'
import { S3Settings } from './settings/S3Settings'
import { ListConfigurationEditor } from '@/components/settings/ListConfigurationEditor'
import { ProfileSettings } from './settings/ProfileSettings'
import { OrganizationSettings } from './settings/OrganizationSettings'
import { TeamSettings } from './settings/TeamSettings'
import { BrandingSettings } from './settings/BrandingSettings'
import { SecuritySettings } from './settings/SecuritySettings'
import { NotificationSettings } from './settings/NotificationSettings'
import { IntegrationSettings } from './settings/IntegrationSettings'
import { PrioritySLASettings } from './settings/PrioritySLASettings'
import { TagsManagement } from './settings/TagsManagement'
import { BusinessHoursSettings } from './settings/BusinessHoursSettings'
import { LocationsSettings } from './settings/LocationsSettings'
import { AbsenceReasonsSettings } from './settings/AbsenceReasonsSettings'
import { CategoriesSettings } from './settings/CategoriesSettings'

const tabs = [
    { id: 'profile', name: 'Perfil', icon: User },
    { id: 'organization', name: 'Organización', icon: Building2 },
    { id: 'locations', name: 'Sedes y Edificios', icon: MapPin },
    { id: 'departments', name: 'Departamentos', icon: Sliders },
    { id: 'business_hours', name: 'Horario Laboral', icon: Calendar },
    { id: 'configuration', name: 'Listas y Tipos', icon: Database },
    // ... (rest of tabs unchanged up to render logic)
    // I will use replace_file_content on specific blocks to be safer

    { id: 'sla', name: 'Políticas SLA', icon: Clock },
    { id: 'categories', name: 'Categorías', icon: Tags },
    { id: 'absences', name: 'Motivos de Ausencia', icon: CalendarOff },
    { id: 'tags', name: 'Tags', icon: Tags },
    { id: 'members', name: 'Equipo', icon: Users },
    { id: 'branding', name: 'Marca', icon: Palette },
    { id: 'security', name: 'Seguridad', icon: Shield },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'integrations', name: 'Integraciones', icon: Globe },
    { id: 'storage', name: 'Almacenamiento', icon: Database },
]

export function SettingsPage() {
    const { profile } = useAuth()
    const { tenant, primaryColor } = useTenant()
    const [activeTab, setActiveTab] = useState('profile')

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>Configuración</h1>
                <p style={{ color: '#6B7280', marginTop: '4px' }}>Administra tu cuenta y organización</p>
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
                {/* Sidebar tabs */}
                <div style={{ width: '224px', flexShrink: 0 }}>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {tabs.filter(tab => {
                            if (profile?.role === 'customer') {
                                return ['profile', 'security'].includes(tab.id)
                            }
                            return true
                        }).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    backgroundColor: activeTab === tab.id ? primaryColor : 'transparent',
                                    color: activeTab === tab.id ? '#FFFFFF' : '#4B5563',
                                }}
                            >
                                <tab.icon style={{ width: '20px', height: '20px' }} />
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {activeTab === 'profile' && (
                        <ProfileSettings primaryColor={primaryColor} />
                    )}

                    {activeTab === 'departments' && (
                        <Departments tenant={tenant} primaryColor={primaryColor} />
                    )}

                    {activeTab === 'business_hours' && (
                        <BusinessHoursSettings />
                    )}

                    {activeTab === 'members' && (
                        <TeamSettings tenant={tenant} primaryColor={primaryColor} />
                    )}

                    {activeTab === 'configuration' && (
                        <ListConfigurationEditor tenant={tenant} primaryColor={primaryColor} />
                    )}

                    {activeTab === 'organization' && (
                        <OrganizationSettings tenant={tenant} />
                    )}

                    {activeTab === 'branding' && (
                        <BrandingSettings primaryColor={primaryColor} />
                    )}

                    {activeTab === 'security' && (
                        <SecuritySettings />
                    )}

                    {activeTab === 'notifications' && (
                        <NotificationSettings />
                    )}

                    {activeTab === 'integrations' && (
                        <IntegrationSettings />
                    )}

                    {activeTab === 'sla' && tenant && (
                        <PrioritySLASettings tenantId={tenant.id} />
                    )}

                    {activeTab === 'categories' && tenant && (
                        <CategoriesSettings tenantId={tenant.id} primaryColor={primaryColor} />
                    )}

                    {activeTab === 'tags' && tenant && (
                        <TagsManagement tenantId={tenant.id} />
                    )}

                    {activeTab === 'locations' && tenant && (
                        <LocationsSettings tenantId={tenant.id} primaryColor={primaryColor} />
                    )}

                    {activeTab === 'storage' && (
                        <S3Settings />
                    )}

                    {activeTab === 'absences' && (
                        <AbsenceReasonsSettings />
                    )}
                </div>
            </div>
        </div>
    )
}
