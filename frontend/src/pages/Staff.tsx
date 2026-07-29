import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

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

export default function Staff() {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);
    const isManager = currentUser?.role === 'manager';
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [overrides, setOverrides] = useState<Record<string, boolean>>({});
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'facilitator',
        password: '',
        password_confirmation: '',
    });

    const staffQuery = useQuery({ queryKey: ['staff'], queryFn: api.getStaff });
    const permissionsQuery = useQuery({
        queryKey: ['staff-permissions'],
        queryFn: api.getStaffPermissions,
        enabled: isManager,
    });

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

    const createStaff = useMutation({
        mutationFn: api.createStaff,
        onSuccess: () => {
            refresh();
            setForm({ name: '', email: '', phone: '', role: 'facilitator', password: '', password_confirmation: '' });
            toast.success('Staff account created and awaiting Manager approval.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const approveStaff = useMutation({
        mutationFn: api.approveStaff,
        onSuccess: () => {
            refresh();
            toast.success('Staff account approved.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const deactivateStaff = useMutation({
        mutationFn: api.deactivateStaff,
        onSuccess: () => {
            refresh();
            toast.success('Staff account deactivated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const savePermissions = useMutation({
        mutationFn: () => api.updateStaffPermissions(selectedStaff!.id, overrides),
        onSuccess: () => {
            refresh();
            toast.success('Permission overrides updated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        createStaff.mutate(form);
    };

    const openPermissions = (staff: StaffMember) => {
        setSelectedStaff(staff);
        setOverrides(Object.fromEntries(staff.permission_overrides.map((item) => [item.permission, item.allowed])));
    };

    const staff = (staffQuery.data?.data?.data || []) as StaffMember[];
    const permissions = (permissionsQuery.data?.data?.permissions || []) as string[];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold text-ink">Staff Management</h1>
                <p className="mt-1 text-sm text-slate-500">Create staff accounts, approve access, and manage permission exceptions.</p>
            </header>

            <div className="grid gap-8 xl:grid-cols-[360px_1fr]">
                <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-viva-blue" />
                        <h2 className="font-display text-lg font-bold">Create Staff Account</h2>
                    </div>
                    <input required className="w-full rounded-xl border p-3" placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                    <input required type="email" className="w-full rounded-xl border p-3" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                    <input className="w-full rounded-xl border p-3" placeholder="Phone (optional)" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                    <select className="w-full rounded-xl border p-3" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                        <option value="facilitator">Facilitator</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                    </select>
                    <input required minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}" type="password" className="w-full rounded-xl border p-3" placeholder="Temporary password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
                    <input required minLength={8} type="password" className="w-full rounded-xl border p-3" placeholder="Confirm password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} />
                    <p className="text-xs text-slate-500">Use 8+ characters with uppercase, lowercase, number, and symbol.</p>
                    <button disabled={createStaff.isPending} className="w-full rounded-xl bg-viva-blue p-3 font-bold text-white disabled:opacity-50">
                        {createStaff.isPending ? 'Creating...' : 'Create Pending Account'}
                    </button>
                </form>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5">
                        <h2 className="font-display text-lg font-bold">Staff Accounts</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr><th className="p-4">Staff</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {staff.map((member) => (
                                    <tr key={member.id} className={member.deleted_at ? 'opacity-50' : ''}>
                                        <td className="p-4"><p className="font-bold text-ink">{member.name}</p><p className="text-xs text-slate-400">{member.email}</p></td>
                                        <td className="p-4 capitalize">{member.role}</td>
                                        <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${member.status === 'approved' ? 'bg-green-50 text-green-700' : member.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{member.status}</span></td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                {isManager && member.status === 'pending' && !member.deleted_at && <button title="Approve" onClick={() => approveStaff.mutate(member.id)} className="rounded-lg border p-2 text-green-600 hover:bg-green-50"><CheckCircle2 className="h-4 w-4" /></button>}
                                                {isManager && !member.deleted_at && <button title="Permissions" onClick={() => openPermissions(member)} className="rounded-lg border p-2 text-viva-blue hover:bg-blue-50"><ShieldCheck className="h-4 w-4" /></button>}
                                                {!member.deleted_at && member.id !== currentUser?.id && <button title="Deactivate" onClick={() => deactivateStaff.mutate(member.id)} className="rounded-lg border p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {isManager && selectedStaff && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold">Permission Overrides — {selectedStaff.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">Unchecked permissions use the predefined defaults for the staff role.</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {permissions.map((permission) => (
                            <div key={permission} className="rounded-xl border p-3">
                                <p className="mb-2 text-xs font-bold">{permission}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setOverrides({ ...overrides, [permission]: true })} className={`rounded-lg px-3 py-1 text-xs ${overrides[permission] === true ? 'bg-green-600 text-white' : 'bg-slate-100'}`}>Allow</button>
                                    <button onClick={() => setOverrides({ ...overrides, [permission]: false })} className={`rounded-lg px-3 py-1 text-xs ${overrides[permission] === false ? 'bg-red-600 text-white' : 'bg-slate-100'}`}>Deny</button>
                                    <button onClick={() => { const next = { ...overrides }; delete next[permission]; setOverrides(next); }} className="rounded-lg bg-slate-100 px-3 py-1 text-xs">Default</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => savePermissions.mutate()} disabled={savePermissions.isPending} className="mt-5 rounded-xl bg-viva-blue px-5 py-3 font-bold text-white disabled:opacity-50">Save Overrides</button>
                </section>
            )}
        </div>
    );
}
