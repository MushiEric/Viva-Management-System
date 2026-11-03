import { Link, NavLink } from 'react-router-dom'
import { CloseCircle, Logout, type Icon } from 'iconsax-react'

export interface SidebarItem {
    to: string
    label: string
    icon: Icon
    visible: boolean
}

interface AppSidebarProps {
    open: boolean
    onClose: () => void
    items: SidebarItem[]
    userName?: string
    userRole?: string
    onLogout: () => void
}

export function AppSidebar({ open, onClose, items, userName, userRole, onLogout }: AppSidebarProps) {
    return (
        <>
            {open ? (
                <button
                    type="button"
                    aria-label="Close navigation"
                    className="fixed inset-0 z-40 bg-viva-navy/40 lg:hidden"
                    onClick={onClose}
                />
            ) : null}
            <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-20 items-center justify-between border-b border-slate-100 px-4">
                    <Link to="/dashboard" onClick={onClose} aria-label="Viva Digital Center" className="min-w-0">
                        <img src="/viva_logo.jpeg" alt="Viva Digital Center" className="h-14 w-auto object-contain" />
                    </Link>
                    <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onClose} aria-label="Close sidebar">
                        <CloseCircle variant="Bold" size={22} color="currentColor" />
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                    {items.filter((item) => item.visible).map((item) => {
                        const Icon = item.icon
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={onClose}
                                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-viva-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-viva-blue'}`}
                            >
                                <Icon variant="Bold" size={20} color="currentColor" className="shrink-0" />
                                <span>{item.label}</span>
                            </NavLink>
                        )
                    })}
                </nav>

                <div className="border-t border-slate-100 p-3">
                    <div className="mb-2 rounded-xl bg-slate-50 px-3 py-3">
                        <p className="truncate text-sm font-bold text-ink">{userName}</p>
                        <p className="text-[11px] font-bold tracking-wide text-viva-blue uppercase">{userRole}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                        <Logout variant="Bold" size={20} color="currentColor" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
