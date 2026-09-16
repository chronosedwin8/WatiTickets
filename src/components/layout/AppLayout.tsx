import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'

export function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen bg-[var(--body-bg)] overflow-hidden font-sans text-slate-600 print:h-auto print:overflow-visible print:bg-white">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-50 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative print:overflow-visible print:h-auto">
                <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto px-8 pt-4 pb-6 scrollbar-hide print:overflow-visible print:h-auto print:px-0">
                    <div className="max-w-[1600px] mx-auto w-full pb-10 animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
