import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'

export function AppLayout() {
    const [menuAbierto, setMenuAbierto] = useState(false)
    const location = useLocation()

    return (
        <div className="flex h-screen overflow-hidden font-sans text-slate-600 print:h-auto print:overflow-visible">
            <Sidebar open={menuAbierto} onClose={() => setMenuAbierto(false)} />

            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden print:h-auto print:overflow-visible">
                <TopNavbar onMenuClick={() => setMenuAbierto(true)} />

                <main className="flex-1 overflow-y-auto px-5 pb-6 pt-1 sm:px-8 print:h-auto print:overflow-visible print:px-0">
                    {/* La clave por ruta reinicia la animación en cada navegación,
                        de modo que el contenido entra en lugar de aparecer de golpe. */}
                    <div
                        key={location.pathname}
                        className="animar-aparecer mx-auto w-full max-w-[1600px] pb-10"
                    >
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
