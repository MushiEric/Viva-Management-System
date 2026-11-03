import { Link } from 'react-router-dom'
import { Calendar, Login, UserAdd } from 'iconsax-react'

export function GuestHeader() {
    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <Link to="/timetable" className="shrink-0" aria-label="Viva Digital Center">
                    <img src="/viva_logo.jpeg" alt="Viva Digital Center" className="h-12 w-auto object-contain sm:h-14" />
                </Link>
                <div className="flex items-center gap-2 sm:gap-4">
                    <Link to="/timetable" className="inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-slate-600 hover:text-viva-blue">
                        <Calendar variant="Bold" size={16} color="currentColor" />
                        <span className="hidden sm:inline">Timetable</span>
                    </Link>
                    <Link to="/register" className="inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-slate-600 hover:text-viva-blue">
                        <UserAdd variant="Bold" size={16} color="currentColor" />
                        <span className="hidden sm:inline">Register</span>
                    </Link>
                    <Link to="/login" className="inline-flex items-center gap-1.5 rounded-full bg-viva-blue px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-viva-navy sm:px-4">
                        <Login variant="Bold" size={16} color="currentColor" />
                        <span>Login</span>
                    </Link>
                </div>
            </nav>
        </header>
    )
}
