import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { api } from './services/api';
import Login from './pages/Login';
import Timetable from './pages/Timetable';
import Enroll from './pages/Enroll';
import Staff from './pages/Staff';
import Programs from './pages/Programs';
import Cohorts from './pages/Cohorts';
import Trainees from './pages/Trainees';
import Learning from './pages/Learning';
import Finance from './pages/Finance';
import Resources from './pages/Resources';
import Dashboard from './pages/Dashboard';
import { LogOut, Calendar, LogIn, BookOpen, UsersRound, LibraryBig, CalendarRange, ContactRound, GraduationCap, WalletCards, FolderOpen, LayoutDashboard } from 'lucide-react';

const queryClient = new QueryClient();

/**
 * Protected Route wrapper component.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/**
 * Navbar Layout Component.
 */
function NavigationLayout() {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await api.logout();
        } finally {
            logout();
            navigate('/login');
        }
    };

    return (
        <div className="min-height-screen flex flex-col bg-slate-50 text-ink">
            {/* Premium Header/Navbar */}
            <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    {/* Branding Logo */}
                    <Link to="/timetable" className="flex items-center gap-3 transition-opacity hover:opacity-95">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-viva-blue text-white shadow-md shadow-viva-blue/20 font-bold text-xl">
                            V
                        </div>
                        <div className="flex flex-col">
                            <span className="font-display text-lg font-extrabold tracking-tight text-ink leading-tight">
                                VIVA <span className="text-viva-green">DIGITAL</span>
                            </span>
                            <span className="font-mono text-[9px] tracking-widest text-slate-400 uppercase font-bold">
                                Center
                            </span>
                        </div>
                    </Link>

                    {/* Navigation Items */}
                    <div className="flex items-center gap-6">
                        <Link to="/timetable" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                            <Calendar className="h-4 w-4" />
                            <span>Timetable</span>
                        </Link>

                        {isAuthenticated ? (
                            <>
                                <Link to="/dashboard" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                                    <LayoutDashboard className="h-4 w-4" />
                                    <span>Dashboard</span>
                                </Link>
                                <Link to="/enroll" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                                    <BookOpen className="h-4 w-4" />
                                    <span>Enroll Student</span>
                                </Link>
                                <Link to="/programs" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                                    <LibraryBig className="h-4 w-4" />
                                    <span>Programs</span>
                                </Link>
                                <Link to="/trainees" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                                    <ContactRound className="h-4 w-4" />
                                    <span>Trainees</span>
                                </Link>
                                <Link to="/learning" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                                    <GraduationCap className="h-4 w-4" />
                                    <span>Learning</span>
                                </Link>
                                {(user?.role === 'manager' || user?.role === 'admin') && (
                                    <Link to="/finance" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                                        <WalletCards className="h-4 w-4" />
                                        <span>Finance</span>
                                    </Link>
                                )}
                                <Link to="/resources" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                                    <FolderOpen className="h-4 w-4" />
                                    <span>Resources</span>
                                </Link>
                                {(user?.role === 'manager' || user?.role === 'admin') && (
                                    <Link to="/staff" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                                        <UsersRound className="h-4 w-4" />
                                        <span>Staff</span>
                                    </Link>
                                )}
                                {(user?.role === 'manager' || user?.role === 'admin') && (
                                    <Link to="/cohorts" className="flex items-center gap-1.5 py-2 font-display text-sm font-semibold text-slate-600 transition-colors hover:text-viva-blue">
                                        <CalendarRange className="h-4 w-4" />
                                        <span>Cohorts</span>
                                    </Link>
                                )}
                                <div className="h-4 w-px bg-slate-200" />
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col text-right">
                                        <span className="text-xs font-bold text-ink">{user?.name}</span>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{user?.role}</span>
                                    </div>
                                    <button 
                                        onClick={handleLogout} 
                                        className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50/50 transition-colors"
                                        title="Logout"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="flex items-center gap-1.5 rounded-full bg-viva-blue px-4 py-2 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition-all hover:bg-slate-900 hover:shadow-none">
                                    <LogIn className="h-4 w-4 inline mr-1" />
                                    <span>Login</span>
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            {/* Content Container */}
            <main className="mx-auto w-full max-w-6xl px-6 py-10 flex-grow">
                <Routes>
                    <Route path="/" element={<Navigate to="/timetable" replace />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/timetable" element={<Timetable />} />
                    <Route path="/login" element={<Login />} />
                    <Route 
                        path="/enroll" 
                        element={
                            <ProtectedRoute>
                                <Enroll />
                            </ProtectedRoute>
                        } 
                    />
                    <Route
                        path="/staff"
                        element={
                            <ProtectedRoute>
                                <Staff />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/resources"
                        element={
                            <ProtectedRoute>
                                <Resources />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/finance"
                        element={
                            <ProtectedRoute>
                                <Finance />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/learning"
                        element={
                            <ProtectedRoute>
                                <Learning />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/trainees"
                        element={
                            <ProtectedRoute>
                                <Trainees />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/cohorts"
                        element={
                            <ProtectedRoute>
                                <Cohorts />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/programs"
                        element={
                            <ProtectedRoute>
                                <Programs />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/timetable" replace />} />
                </Routes>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
                <p>&copy; {new Date().getFullYear()} Viva Digital Center. Dar es Salaam, Tanzania. All rights reserved.</p>
            </footer>
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
