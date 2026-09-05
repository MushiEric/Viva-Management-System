import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BellRing, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { api } from '../services/api';

export default function Profile() {
    const profileQuery = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
    const notificationSettingsQuery = useQuery({ queryKey: ['notification-settings'], queryFn: api.getNotificationSettings });
    const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
    const [passwords, setPasswords] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const changePassword = useMutation({
        mutationFn: api.changePassword,
        onSuccess: () => {
            setPasswords({ current_password: '', password: '', password_confirmation: '' });
            toast.success('Password changed successfully.');
        },
        onError: (error: Error) => toast.error(error.message),
    });
    const updateNotificationSettings = useMutation({
        mutationFn: api.updateNotificationSettings,
        onSuccess: () => toast.success('Notification settings updated.'),
        onError: (error: Error) => toast.error(error.message),
    });

    useEffect(() => {
        const enabled = notificationSettingsQuery.data?.data?.email_notifications_enabled;
        if (typeof enabled === 'boolean') setEmailNotificationsEnabled(enabled);
    }, [notificationSettingsQuery.data]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        changePassword.mutate(passwords);
    };

    const user = profileQuery.data;
    const emailNotificationsAvailable = notificationSettingsQuery.data?.data?.email_notifications_available === true;

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold">My Profile</h1>
                <p className="mt-1 text-sm text-slate-500">Review your account and update your password.</p>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                    <UserRound className="h-10 w-10 text-viva-blue" />
                    <h2 className="mt-4 font-display text-xl font-bold">{user?.name || 'Loading...'}</h2>
                    <div className="mt-5 space-y-3 text-sm">
                        <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {user?.email}</p>
                        <p className="flex items-center gap-2 capitalize"><ShieldCheck className="h-4 w-4 text-slate-400" /> Role: {user?.role}</p>
                    </div>
                </section>

                <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
                    <h2 className="flex items-center gap-2 font-display text-xl font-bold"><KeyRound className="h-5 w-5 text-viva-blue" /> Change Password</h2>
                    <label className="block text-sm font-semibold">Current Password
                        <input required type="password" className="mt-1 w-full rounded-xl border p-3 font-normal" value={passwords.current_password} onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })} />
                    </label>
                    <label className="block text-sm font-semibold">New Password
                        <input required minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}" type="password" className="mt-1 w-full rounded-xl border p-3 font-normal" value={passwords.password} onChange={(event) => setPasswords({ ...passwords, password: event.target.value })} />
                    </label>
                    <label className="block text-sm font-semibold">Confirm New Password
                        <input required minLength={8} type="password" className="mt-1 w-full rounded-xl border p-3 font-normal" value={passwords.password_confirmation} onChange={(event) => setPasswords({ ...passwords, password_confirmation: event.target.value })} />
                    </label>
                    <p className="text-xs text-slate-500">Use 8+ characters with uppercase, lowercase, number, and symbol.</p>
                    <button disabled={changePassword.isPending} className="rounded-xl bg-viva-blue px-5 py-3 font-bold text-white disabled:opacity-50">
                        {changePassword.isPending ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </div>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold"><BellRing className="h-5 w-5 text-viva-blue" />Notification Settings</h2>
                <p className="mt-1 text-sm text-slate-500">In-app alerts remain active. Portal email copies are currently disabled system-wide.</p>
                <div className="mt-5 space-y-3">
                    <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
                        <span><span className="block font-bold">Email notifications</span><span className="text-xs text-slate-500">{emailNotificationsAvailable ? 'Receive copies of your portal notifications by email.' : 'Temporarily disabled to reduce email usage.'}</span></span>
                        <input
                            type="checkbox"
                            checked={emailNotificationsEnabled}
                            disabled={!emailNotificationsAvailable}
                            onChange={(event) => setEmailNotificationsEnabled(event.target.checked)}
                            className="h-5 w-5 accent-viva-blue disabled:opacity-40"
                        />
                    </label>
                    <div className="flex items-center justify-between gap-4 rounded-xl border bg-slate-50 p-4">
                        <span><span className="block font-bold">In-app notifications</span><span className="text-xs text-slate-500">Required for all staff accounts and cannot be disabled.</span></span>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Always enabled</span>
                    </div>
                </div>
                <button
                    disabled={!emailNotificationsAvailable || updateNotificationSettings.isPending}
                    onClick={() => updateNotificationSettings.mutate(emailNotificationsEnabled)}
                    className="mt-5 rounded-xl bg-viva-blue px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                    {updateNotificationSettings.isPending ? 'Saving...' : 'Save Notification Settings'}
                </button>
            </section>
        </div>
    );
}
