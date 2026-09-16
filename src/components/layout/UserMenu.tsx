import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function UserMenu() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 focus:outline-none"
            >
                <div className="w-[38px] h-[38px] rounded-full relative shadow-sm ring-2 ring-transparent hover:ring-primary-200 transition-all">
                    <img
                        src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'John Doe'}&background=696CFF&color=fff`}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
            </button>

            {userMenuOpen && (
                <div className="absolute top-full right-0 mt-3 w-60 bg-white rounded-lg shadow-lg border border-[var(--slate-100)] py-2 animate-fade-in z-50 origin-top-right">
                    <div className="px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                            <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'John Doe'}&background=696CFF&color=fff`} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--slate-800)] truncate">{profile?.full_name || 'John Doe'}</p>
                            <p className="text-xs text-[var(--slate-500)] truncate">{profile?.role || 'Admin'}</p>
                        </div>
                    </div>
                    <div className="border-t border-[var(--slate-100)] my-1"></div>
                    <nav className="py-1">
                        <Link onClick={() => setUserMenuOpen(false)} to="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--slate-600)] hover:bg-[var(--slate-50)]">
                            <User size={16} /> Perfil
                        </Link>
                        <Link onClick={() => setUserMenuOpen(false)} to="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--slate-600)] hover:bg-[var(--slate-50)]">
                            <Settings size={16} /> Configuración
                        </Link>
                    </nav>
                    <div className="border-t border-[var(--slate-100)] my-1"></div>
                    <button
                        onClick={handleSignOut}
                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-[var(--slate-600)] hover:bg-[var(--slate-50)] transition-colors"
                    >
                        <LogOut size={16} />
                        Cerrar Sesión
                    </button>
                </div>
            )}
        </div>
    )
}
