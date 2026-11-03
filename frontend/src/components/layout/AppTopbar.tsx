import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown2, HambergerMenu, Logout, User } from 'iconsax-react'
import NotificationBell from '@/components/NotificationBell'

interface AppTopbarProps {
    onOpenSidebar: () => void
    userName?: string
    userEmail?: string
    userRole?: string
    onLogout: () => void
}

export function AppTopbar({ onOpenSidebar, userName, userEmail, userRole, onLogout }: AppTopbarProps) {
    const [profileOpen, setProfileOpen] = useState(false)
    const profileRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!profileOpen) return

        const closeOnOutsideClick = (event: PointerEvent) => {
            if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false)
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setProfileOpen(false)
        }

        document.addEventListener('pointerdown', closeOnOutsideClick)
        document.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [profileOpen])

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
                <button type="button" onClick={onOpenSidebar} className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" aria-label="Open sidebar">
                    <HambergerMenu variant="Bold" size={20} color="currentColor" />
                </button>
                <p className="hidden font-display text-sm font-bold text-slate-500 lg:block">Viva Management Portal</p>
            </div>
            <div className="flex items-center gap-2">
                <NotificationBell />
                <div ref={profileRef} className="relative">
                    <button type="button" onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100" aria-expanded={profileOpen} aria-haspopup="menu">
                        <span className="flex size-9 items-center justify-center rounded-full bg-viva-blue/10 text-viva-blue">
                            <User variant="Bold" size={18} color="currentColor" />
                        </span>
                        <span className="hidden text-left sm:block">
                            <span className="block text-sm font-bold text-ink">{userName}</span>
                            <span className="block text-[10px] font-bold tracking-wide text-slate-400 uppercase">{userRole}</span>
                        </span>
                        <ArrowDown2 variant="Bold" size={14} color="currentColor" className="text-slate-400" />
                    </button>
                    {profileOpen ? (
                        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" role="menu">
                            <div className="border-b border-slate-100 p-4">
                                <p className="font-bold text-ink">{userName}</p>
                                <p className="truncate text-xs text-slate-500">{userEmail}</p>
                                <p className="mt-1 text-xs font-bold tracking-wide text-viva-blue uppercase">{userRole}</p>
                            </div>
                            <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                <User variant="Bold" size={16} color="currentColor" /> Profile & Password
                            </Link>
                            <button type="button" onClick={onLogout} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                                <Logout variant="Bold" size={16} color="currentColor" /> Logout
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    )
}
