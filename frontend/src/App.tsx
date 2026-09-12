import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { api } from './services/api';
import Login from './pages/Login';
import Timetable from './pages/Timetable';
import Enroll from './pages/Enroll';
import Staff from './pages/Staff';
import StaffDetails from './pages/StaffDetails';
import Programs from './pages/Programs';
import Cohorts from './pages/Cohorts';
import Trainees from './pages/Trainees';
import TraineeProfile from './pages/TraineeProfile';
import RegisterTrainee from './pages/RegisterTrainee';
import Learning from './pages/Learning';
import Finance from './pages/Finance';
import Resources from './pages/Resources';
import Dashboard from './pages/Dashboard';
import Enquiries from './pages/Enquiries';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import AuditLogs from './pages/AuditLogs';
import NotificationBell from './components/NotificationBell';
import { Activity, ChevronDown, LogOut, Calendar, LogIn, BookOpen, UsersRound, LibraryBig, CalendarRange, ContactRound, GraduationCap, WalletCards, FolderOpen, LayoutDashboard, Menu, MessageSquareText, Settings2, UserCircle, X } from 'lucide-react';

const queryClient = new QueryClient();

/**
 * Protected Route wrapper component.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function NavigationLayout() {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const isBusy = useIsFetching() + useIsMutating() > 0;
    const isOfficeAdmin = user?.role === 'manager' || user?.role === 'admin';
    const navigationItems = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: true },
        { to: '/timetable', label: 'Timetable', icon: Calendar, visible: true },
        { to: '/enroll', label: 'Enroll Student', icon: BookOpen, visible: true },
        { to: '/programs', label: 'Programs', icon: LibraryBig, visible: true },
        { to: '/trainees', label: 'Trainees', icon: ContactRound, visible: true },
        { to: '/learning', label: 'Learning', icon: GraduationCap, visible: true },
        { to: '/finance', label: 'Finance', icon: WalletCards, visible: isOfficeAdmin },
        { to: '/enquiries', label: 'Enquiries', icon: MessageSquareText, visible: isOfficeAdmin },
        { to: '/resources', label: 'Resources', icon: FolderOpen, visible: true },
        { to: '/staff', label: 'Staff', icon: UsersRound, visible: isOfficeAdmin },
        { to: '/cohorts', label: 'Cohorts', icon: CalendarRange, visible: isOfficeAdmin },
        { to: '/settings', label: 'Settings', icon: Settings2, visible: isOfficeAdmin },
        { to: '/audit-logs', label: 'Audit Logs', icon: Activity, visible: isOfficeAdmin },
    ];

    const handleLogout = async () => {
        try {
            await api.logout();
        } finally {
            logout();
            navigate('/login');
        }
    };

    return (
        <div className={`min-h-screen bg-slate-50 text-ink ${isAuthenticated ? 'lg:flex' : ''}`}>
            {isBusy && <div className="fixed inset-x-0 top-0 z-[100] h-1 animate-pulse bg-viva-blue" />}
            {isAuthenticated ? (
                <>
                    {sidebarOpen && (
                        <button
                            type="button"
                            aria-label="Close navigation"
                            className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="flex h-24 items-center justify-between border-b border-slate-100 px-6">
                            <Link to="/dashboard" onClick={() => setSidebarOpen(false)} aria-label="Viva Digital Center">
                                <img src="/viva_logo.jpeg" alt="Viva Digital Center" className="h-16 w-auto object-contain" />
                            </Link>
                            <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
                            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
                            {navigationItems.filter((item) => item.visible).map((item) => {
                                const Icon = item.icon;
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setSidebarOpen(false)}
                                        className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 font-display text-sm font-semibold transition-colors ${isActive ? 'bg-viva-blue text-white shadow-md shadow-viva-blue/20' : 'text-slate-600 hover:bg-slate-100 hover:text-viva-blue'}`}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" />
                                        <span>{item.label}</span>
                                    </NavLink>
                                );
                            })}
                        </nav>

                        <div className="border-t border-slate-100 p-4">
                            <div className="mb-3 rounded-xl bg-slate-50 px-3 py-3">
                                <p className="truncate text-sm font-bold text-ink">{user?.name}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{user?.role}</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </aside>
                </>
            ) : (
                <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
                    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
                    <Link to="/timetable" className="shrink-0 transition-opacity hover:opacity-90" aria-label="Viva Digital Center">
                            <img src="/viva_logo.jpeg" alt="Viva Digital Center" className="h-14 w-auto object-contain" />
                    </Link>
                        <Link to="/timetable" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                            <Calendar className="h-4 w-4" />
                            <span>Timetable</span>
                        </Link>
                        <Link to="/login" className="flex items-center gap-1.5 rounded-full bg-viva-blue px-4 py-2 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition-all hover:bg-slate-900 hover:shadow-none">
                            <LogIn className="h-4 w-4" />
                            <span>Login</span>
                        </Link>
                    </nav>
                </header>
            )}

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                {isAuthenticated && (
                    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6">
                        <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" aria-label="Open sidebar">
                            <Menu className="h-5 w-5" />
                        </button>
                        <p className="hidden font-display text-sm font-bold text-slate-500 lg:block">VIVA Management Portal</p>
                        <div className="flex items-center gap-2">
                            <NotificationBell />
                            <div className="relative">
                            <button onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100">
                                <UserCircle className="h-7 w-7 text-viva-blue" />
                                <span className="hidden text-left sm:block"><span className="block text-sm font-bold">{user?.name}</span><span className="block text-[10px] font-bold uppercase text-slate-400">{user?.role}</span></span>
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                            </button>
                            {profileOpen && (
                                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border bg-white shadow-xl">
                                    <div className="border-b p-4"><p className="font-bold">{user?.name}</p><p className="text-xs text-slate-500">{user?.email}</p><p className="mt-1 text-xs font-bold uppercase text-viva-blue">{user?.role}</p></div>
                                    <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-slate-50"><UserCircle className="h-4 w-4" /> Profile & Password</Link>
                                    <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Logout</button>
                                </div>
                            )}
                            </div>
                        </div>
                    </header>
                )}

                <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-8 sm:px-6 lg:px-8">
                    <Routes>
                        <Route path="/" element={<Navigate to="/timetable" replace />} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/timetable" element={<Timetable />} />
                        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                        <Route path="/enroll" element={<ProtectedRoute><Enroll /></ProtectedRoute>} />
                        <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
                        <Route path="/staff/:id" element={<ProtectedRoute><StaffDetails /></ProtectedRoute>} />
                        <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
                        <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
                        <Route path="/enquiries" element={<ProtectedRoute><Enquiries /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
                        <Route path="/learning" element={<ProtectedRoute><Learning /></ProtectedRoute>} />
                        <Route path="/trainees" element={<ProtectedRoute><Trainees /></ProtectedRoute>} />
                        <Route path="/trainees/new" element={<ProtectedRoute><RegisterTrainee /></ProtectedRoute>} />
                        <Route path="/trainees/:id" element={<ProtectedRoute><TraineeProfile /></ProtectedRoute>} />
                        <Route path="/cohorts" element={<ProtectedRoute><Cohorts /></ProtectedRoute>} />
                        <Route path="/programs" element={<ProtectedRoute><Programs /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/timetable" replace />} />
                    </Routes>
                </main>

                <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
                    <p>&copy; {new Date().getFullYear()} Viva Digital Center. Dar es Salaam, Tanzania. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
}

function App() {
    const initialize = useAuthStore((state) => state.initialize);

    useEffect(() => {
        initialize();
    }, [initialize]);

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <NavigationLayout />
            </BrowserRouter>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </QueryClientProvider>
    );
}

export default App;
