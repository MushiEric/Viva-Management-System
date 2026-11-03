import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Toaster as HotToaster } from 'react-hot-toast';
import { Toaster } from '@/components/ui/sonner';
import { Activity, Book, Calendar, Calendar1, Element4, FolderOpen, MessageText, People, Profile2User, Setting2, Teacher, UserAdd, Wallet } from 'iconsax-react';
import { useAuthStore } from './store/authStore';
import { api } from './services/api';
import { AppSidebar, type SidebarItem } from './components/layout/AppSidebar';
import { AppTopbar } from './components/layout/AppTopbar';
import { GuestHeader } from './components/layout/GuestHeader';
import Login from './pages/Login';
import Timetable from './pages/Timetable';
import Enroll from './pages/Enroll';
import Enrollments from './pages/Enrollments';
import EnrollmentDetail from './pages/EnrollmentDetail';
import Staff from './pages/Staff';
import StaffAdd from './pages/StaffAdd';
import StaffDetails from './pages/StaffDetails';
import Programs from './pages/Programs';
import Cohorts from './pages/Cohorts';
import Trainees from './pages/Trainees';
import TraineeProfile from './pages/TraineeProfile';
import RegisterTrainee from './pages/RegisterTrainee';
import SelfRegister from './pages/SelfRegister';
import Learning from './pages/Learning';
import Finance from './pages/Finance';
import Resources from './pages/Resources';
import Dashboard from './pages/Dashboard';
import Enquiries from './pages/Enquiries';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import AuditLogs from './pages/AuditLogs';

const queryClient = new QueryClient();

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
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isBusy = useIsFetching() + useIsMutating() > 0;
    const isOfficeAdmin = user?.role === 'manager' || user?.role === 'admin';
    const isLogin = location.pathname === '/login';

    const navigationItems: SidebarItem[] = [
        { to: '/dashboard', label: 'Dashboard', icon: Element4, visible: true },
        { to: '/timetable', label: 'Timetable', icon: Calendar, visible: true },
        { to: '/enroll', label: 'Enroll Student', icon: UserAdd, visible: true },
        { to: '/programs', label: 'Programs', icon: Book, visible: true },
        { to: '/trainees', label: 'Trainees', icon: Profile2User, visible: true },
        { to: '/learning', label: 'Learning', icon: Teacher, visible: true },
        { to: '/finance', label: 'Finance', icon: Wallet, visible: isOfficeAdmin },
        { to: '/enquiries', label: 'Enquiries', icon: MessageText, visible: isOfficeAdmin },
        { to: '/resources', label: 'Resources', icon: FolderOpen, visible: true },
        { to: '/staff', label: 'Staff', icon: People, visible: isOfficeAdmin },
        { to: '/cohorts', label: 'Cohorts', icon: Calendar1, visible: isOfficeAdmin },
        { to: '/settings', label: 'Settings', icon: Setting2, visible: isOfficeAdmin },
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
            {isBusy && !isLogin ? <div className="fixed inset-x-0 top-0 z-[100] h-1 animate-pulse bg-viva-blue" /> : null}
            {isAuthenticated ? (
                <AppSidebar
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    items={navigationItems}
                    userName={user?.name}
                    userRole={user?.role}
                    onLogout={handleLogout}
                />
            ) : isLogin ? null : (
                <GuestHeader />
            )}

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                {isAuthenticated ? (
                    <AppTopbar
                        onOpenSidebar={() => setSidebarOpen(true)}
                        userName={user?.name}
                        userEmail={user?.email}
                        userRole={user?.role}
                        onLogout={handleLogout}
                    />
                ) : null}

                <main className={isLogin ? 'min-h-screen' : 'w-full flex-grow px-4 py-6 sm:px-6 lg:px-8'}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/timetable" replace />} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/timetable" element={<Timetable />} />
                        <Route path="/register" element={<SelfRegister />} />
                        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                        <Route path="/enroll" element={<ProtectedRoute><Enrollments /></ProtectedRoute>} />
                        <Route path="/enroll/new" element={<ProtectedRoute><Enroll /></ProtectedRoute>} />
                        <Route path="/enroll/:id" element={<ProtectedRoute><EnrollmentDetail /></ProtectedRoute>} />
                        <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
                        <Route path="/staff/new" element={<ProtectedRoute><StaffAdd /></ProtectedRoute>} />
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

                {isLogin ? null : (
                    <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
                        <p>&copy; {new Date().getFullYear()} Viva Digital Center. Dar es Salaam, Tanzania. All rights reserved.</p>
                    </footer>
                )}
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
            <Toaster position="top-right" />
            <HotToaster position="top-right" toastOptions={{ duration: 4000 }} />
        </QueryClientProvider>
    );
}

export default App;
