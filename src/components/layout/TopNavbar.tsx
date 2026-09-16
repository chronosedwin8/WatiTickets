import { Menu } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { BuscadorGlobal } from './BuscadorGlobal'
import { Notificaciones } from './Notificaciones'
import { BotonTema } from './BotonTema'

interface TopNavbarProps {
    onMenuClick: () => void
}

export function TopNavbar({ onMenuClick }: TopNavbarProps) {
    return (
        <div className="sticky top-0 z-40 shrink-0 px-5 pb-3 pt-4 sm:px-8 print:hidden">
            <header className="cristal flex h-[58px] items-center justify-between rounded-2xl px-3 shadow-sm sm:px-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <button
                        onClick={onMenuClick}
                        aria-label="Abrir menú"
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:hidden"
                    >
                        <Menu size={22} />
                    </button>

                    <BuscadorGlobal />
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    <BotonTema />
                    <Notificaciones />
                    <div className="mx-1 h-6 w-px bg-[var(--borde)]" />
                    <UserMenu />
                </div>
            </header>
        </div>
    )
}
