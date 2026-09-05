import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface PortalNotification {
    id: string;
    data: {
        category: string;
        title: string;
        message: string;
        action_url: string | null;
    };
    read_at: string | null;
    created_at: string;
}

export default function NotificationBell() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const notificationsQuery = useQuery({
        queryKey: ['notifications'],
        queryFn: api.getNotifications,
        refetchInterval: 30_000,
        refetchIntervalInBackground: false,
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    const markRead = useMutation({
        mutationFn: api.markNotificationRead,
        onSuccess: refresh,
        onError: (error: Error) => toast.error(error.message),
    });
    const markAllRead = useMutation({
        mutationFn: api.markAllNotificationsRead,
        onSuccess: refresh,
        onError: (error: Error) => toast.error(error.message),
    });

    const data = notificationsQuery.data?.data;
    const notifications = (data?.notifications?.data || []) as PortalNotification[];
    const unreadCount = Number(data?.unread_count || 0);

    useEffect(() => {
        if (!open) return;

        const closeOnOutsideClick = (event: PointerEvent) => {
            if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('pointerdown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [open]);

    const openNotification = (notification: PortalNotification) => {
        if (!notification.read_at) markRead.mutate(notification.id);
        setOpen(false);
        if (notification.data.action_url) navigate(notification.data.action_url);
    };

    return (
        <div ref={panelRef} className="relative">
            <button
                type="button"
                aria-label={`${unreadCount} unread notifications`}
                onClick={() => setOpen((current) => !current)}
                className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            >
                {unreadCount > 0 ? <BellRing className="h-6 w-6 text-viva-blue" /> : <Bell className="h-6 w-6" />}
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-extrabold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b p-4">
                        <div><p className="font-display font-bold">Notifications</p><p className="text-xs text-slate-500">{unreadCount} unread</p></div>
                        {unreadCount > 0 && <button onClick={() => markAllRead.mutate()} className="flex items-center gap-1 text-xs font-bold text-viva-blue"><CheckCheck className="h-4 w-4" />Mark all read</button>}
                    </div>
                    <div className="max-h-[420px] overflow-y-auto">
                        {notifications.map((notification) => (
                            <button
                                key={notification.id}
                                onClick={() => openNotification(notification)}
                                className={`block w-full border-b p-4 text-left transition hover:bg-slate-50 ${notification.read_at ? 'bg-white' : 'bg-blue-50/70'}`}
                            >
                                <div className="flex gap-3">
                                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read_at ? 'bg-slate-200' : 'bg-viva-blue'}`} />
                                    <span>
                                        <span className="block text-sm font-bold">{notification.data.title}</span>
                                        <span className="mt-1 block text-xs leading-5 text-slate-600">{notification.data.message}</span>
                                        <span className="mt-2 block text-[10px] font-semibold uppercase text-slate-400">{new Date(notification.created_at).toLocaleString()}</span>
                                    </span>
                                </div>
                            </button>
                        ))}
                        {!notificationsQuery.isLoading && notifications.length === 0 && <p className="p-10 text-center text-sm text-slate-400">No notifications yet.</p>}
                        {notificationsQuery.isLoading && <p className="p-8 text-center text-sm text-slate-400">Loading notifications...</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
