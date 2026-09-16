import { Menu } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { BuscadorGlobal } from './BuscadorGlobal'
import { Notificaciones } from './Notificaciones'

interface TopNavbarProps {
    onMenuClick: () => void
}

export function TopNavbar({ onMenuClick }: TopNavbarProps) {
    return (
        <div className="z-40 shrink-0 px-6 pb-4 pt-4 print:hidden">
            <header className="flex h-[62px] items-center justify-between rounded-xl bg-white/95 px-4 shadow-sm backdrop-blur-sm transition-all duration-300 sm:px-6">
                <div className="flex flex-1 items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        aria-label="Abrir menú"
                        className="-ml-2 p-1 text-slate-500 hover:text-slate-700 lg:hidden"
                    >
                        <Menu size={24} />
                    </button>

                    <BuscadorGlobal />
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                    <Notificaciones />
                    <UserMenu />
                </div>
            </header>
        </div>
    )
}
