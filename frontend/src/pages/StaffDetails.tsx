import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    CheckCircle2,
    Mail,
    Phone,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UserRound,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { confirmToast } from '../components/ConfirmToast';

interface PermissionOverride {
    permission: string;
    allowed: boolean;
}

interface StaffMember {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: 'manager' | 'admin' | 'facilitator';
    status: 'pending' | 'approved' | 'inactive';
    deleted_at: string | null;
    permission_overrides: PermissionOverride[];
}

export default function StaffDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);
    const isManager = currentUser?.role === 'manager';
    const staffId = Number(id);

    const [overrides, setOverrides] = useState<Record<string, boolean>>({});

    const staffQuery = useQuery({
        queryKey: ['staff'],
        queryFn: api.getStaff,
    });

    const permissionsQuery = useQuery({
        queryKey: ['staff-permissions'],
        queryFn: api.getStaffPermissions,
        enabled: isManager,
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['staff'] });
        queryClient.invalidateQueries({ queryKey: ['staff-permissions'] });
    };

    const approveStaffMutation = useMutation({
        mutationFn: api.approveStaff,
        onSuccess: () => {
            refresh();
            toast.success('Staff account approved successfully.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const deactivateStaffMutation = useMutation({
        mutationFn: api.deactivateStaff,
        onSuccess: () => {
            refresh();
            toast.success('Staff account deactivated.');
            navigate('/staff');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const savePermissionsMutation = useMutation({
        mutationFn: () => api.updateStaffPermissions(staffId, overrides),
        onSuccess: () => {
            refresh();
            toast.success('Permission overrides updated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const staffList = (staffQuery.data?.data?.data || []) as StaffMember[];
    const member = staffList.find((s) => s.id === staffId);
    const permissions = (permissionsQuery.data?.data?.permissions || []) as string[];

    useEffect(() => {
        if (!member) return;
        setOverrides(Object.fromEntries(member.permission_overrides.map((item) => [item.permission, item.allowed])));
    }, [member]);

    if (staffQuery.isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-viva-blue border-t-transparent" />
            </div>
        );
    }

    if (!member) {
        return (
            <div className="py-16 text-center">
                <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-red-500" />
                <h2 className="font-display text-2xl font-bold text-ink">Staff Member Not Found</h2>
                <p className="mt-1 text-sm text-slate-500">The requested staff record does not exist or has been removed.</p>
                <Link to="/staff" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-viva-blue px-4 py-2.5 font-display text-sm font-bold text-white shadow-md">
                    <ArrowLeft className="h-4 w-4" /> Back to Staff Directory
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Navigation */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Link to="/staff" className="inline-flex items-center gap-1.5 text-xs font-bold text-viva-blue hover:underline">
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to Staff Directory
                    </Link>
                    <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">{member.name}</h1>
                    <p className="mt-0.5 text-xs text-slate-500">Staff Account Details & System Permissions</p>
                </div>

                <div className="flex items-center gap-2">
                    {isManager && member.status === 'pending' && !member.deleted_at && (
                        <button
                            type="button"
                            onClick={() => approveStaffMutation.mutate(member.id)}
                            disabled={approveStaffMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Approve Staff Account</span>
                        </button>
                    )}

                    {!member.deleted_at && member.id !== currentUser?.id && (
                        <button
                            type="button"
                            onClick={() =>
                                confirmToast({
                                    title: `Deactivate ${member.name}?`,
                                    message: 'The staff member will lose portal access and their active sessions will be revoked.',
                                    confirmLabel: 'Deactivate Staff',
                                    onConfirm: () => deactivateStaffMutation.mutate(member.id),
                                })
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Deactivate Account</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Overview Card */}
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-4">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-viva-blue/10 text-viva-blue font-bold">
                        <UserRound className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-base font-extrabold text-ink">{member.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</p>
                        <p className="truncate text-xs font-bold text-slate-700">{member.email}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Phone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
                        <p className="truncate text-xs font-bold text-slate-700">{member.phone || 'Not provided'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Status</p>
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold capitalize ${member.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : member.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                            {member.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Account Details Box */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h2 className="font-display text-lg font-bold text-ink border-b pb-2">Account Information</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{member.name}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{member.email}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{member.phone || 'Not provided'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Role</p>
                        <span className="mt-1 inline-block rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-viva-blue">
                            {member.role}
                        </span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approval Status</p>
                        <p className="mt-1 text-sm font-semibold capitalize text-slate-800">{member.status}</p>
                    </div>
                </div>
            </div>

            {/* Manager Only: Permission Overrides Section */}
            {isManager && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-viva-blue" />
                            <h2 className="font-display text-lg font-bold text-ink">Permission Overrides</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Configure custom access overrides for {member.name}. Unchecked permissions will default to standard role capabilities.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {permissions.map((permission) => (
                            <div key={permission} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                                <p className="mb-2.5 font-mono text-xs font-bold text-slate-800">{permission}</p>
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setOverrides({ ...overrides, [permission]: true })}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${overrides[permission] === true ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        Allow
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOverrides({ ...overrides, [permission]: false })}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${overrides[permission] === false ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        Deny
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = { ...overrides };
                                            delete next[permission];
                                            setOverrides(next);
                                        }}
                                        className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                                    >
                                        Default
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => savePermissionsMutation.mutate()}
                            disabled={savePermissionsMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-viva-blue px-6 py-2.5 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition hover:bg-slate-900 disabled:opacity-50"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            <span>{savePermissionsMutation.isPending ? 'Saving...' : 'Save Permission Overrides'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
