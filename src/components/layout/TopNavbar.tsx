import { useState } from 'react'
import { Menu, Search, Bell } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { Input } from '@/components/ui/Input'

interface TopNavbarProps {
    onMenuClick: () => void
}

export function TopNavbar({ onMenuClick }: TopNavbarProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [hasNotifications] = useState(false)

    return (
        <div className="px-6 pt-4 pb-4 shrink-0 z-40 print:hidden">
            <header className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm h-[62px] px-4 sm:px-6 flex items-center justify-between transition-all duration-300">
                <div className="flex items-center flex-1 gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-1 -ml-2 text-slate-500 hover:text-slate-700"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="hidden md:flex items-center w-full max-w-sm relative">
                        <Search size={18} className="absolute left-3 text-slate-400" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar... (Ctrl+k)" 
                            className="pl-9 bg-slate-50 border-transparent focus:border-indigo-500 w-full"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-5">
                    <button className="text-[var(--slate-500)] hover:text-[var(--slate-800)] relative p-2 rounded-full hover:bg-[var(--slate-100)] transition-colors">
                        <Bell size={20} />
                        {hasNotifications && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>}
                    </button>

                    <UserMenu />
                </div>
            </header>
        </div>
    )
}
