import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    CheckCircle2,
    Eye,
    Filter,
    Phone,
    RefreshCw,
    Search,
    Trash2,
    UserPlus,
    UserRound,
    X,
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

const blankForm = {
    name: '',
    email: '',
    phone: '',
    role: 'facilitator',
    password: '',
    password_confirmation: '',
};

export default function Staff() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);
    const isManager = currentUser?.role === 'manager';

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [form, setForm] = useState(blankForm);

    const staffQuery = useQuery({ queryKey: ['staff'], queryFn: api.getStaff });

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

    const createStaffMutation = useMutation({
        mutationFn: api.createStaff,
        onSuccess: () => {
            refresh();
            setIsCreateModalOpen(false);
            setForm(blankForm);
            toast.success('Staff account created and awaiting Manager approval.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const approveStaffMutation = useMutation({
        mutationFn: api.approveStaff,
        onSuccess: () => {
            refresh();
            toast.success('Staff account approved.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const deactivateStaffMutation = useMutation({
        mutationFn: api.deactivateStaff,
        onSuccess: () => {
            refresh();
            toast.success('Staff account deactivated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const handleSubmitCreate = (event: FormEvent) => {
        event.preventDefault();
        createStaffMutation.mutate(form);
    };

    const staff = (staffQuery.data?.data?.data || []) as StaffMember[];
    const filteredStaff = staff.filter((member) => {
        if (roleFilter !== 'all' && member.role !== roleFilter) return false;
        if (search) {
            const query = search.toLowerCase();
            return (
                member.name.toLowerCase().includes(query) ||
                member.email.toLowerCase().includes(query) ||
                (member.phone && member.phone.includes(query))
            );
        }
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-extrabold text-ink">Staff Directory</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage system staff accounts, approve pending users, and configure access permissions.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={refresh}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${staffQuery.isFetching ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-viva-blue px-4 py-2.5 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition hover:bg-slate-900"
                    >
                        <UserPlus className="h-4 w-4" />
                        <span>+ Create Staff Member</span>
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-viva-blue focus:bg-white focus:ring-1 focus:ring-viva-blue"
                        placeholder="Search by full name, email, or phone number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <label htmlFor="roleFilterSelect" className="text-xs font-bold text-slate-500">Role:</label>
                        <select
                            id="roleFilterSelect"
                            className="bg-transparent text-xs font-bold text-slate-800 outline-none"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            <option value="facilitator">Facilitator</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                        </select>
                    </div>

                    <span className="text-xs font-bold text-slate-400">
                        {filteredStaff.length} Record{filteredStaff.length === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            {/* Full-Width Data Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Staff Member</th>
                                <th className="px-6 py-4">Phone Number</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStaff.map((member) => (
                                <tr key={member.id} className={`transition hover:bg-slate-50/80 ${member.deleted_at ? 'opacity-50' : ''}`}>
                                    {/* Staff Name & Email */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-viva-blue/10 text-viva-blue font-bold">
                                                <UserRound className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/staff/${member.id}`)}
                                                    className="font-display font-bold text-slate-900 hover:text-viva-blue hover:underline text-left"
                                                >
                                                    {member.name}
                                                </button>
                                                <p className="text-xs text-slate-500">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Phone Number */}
                                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                                        {member.phone ? (
                                            <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1.5 hover:text-viva-blue">
                                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                <span>{member.phone}</span>
                                            </a>
                                        ) : (
                                            <span className="text-slate-400">Not provided</span>
                                        )}
                                    </td>

                                    {/* Role */}
                                    <td className="px-6 py-4">
                                        <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase text-viva-blue">
                                            {member.role}
                                        </span>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4">
                                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-extrabold capitalize ${member.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : member.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                                            {member.status}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/staff/${member.id}`)}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-viva-blue px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900"
                                                title="View Staff Details"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                <span>View Details</span>
                                            </button>

                                            {isManager && member.status === 'pending' && !member.deleted_at && (
                                                <button
                                                    type="button"
                                                    title="Approve Staff Account"
                                                    onClick={() => approveStaffMutation.mutate(member.id)}
                                                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    <span>Approve</span>
                                                </button>
                                            )}

                                            {!member.deleted_at && member.id !== currentUser?.id && (
                                                <button
                                                    type="button"
                                                    title="Deactivate Staff Account"
                                                    onClick={() =>
                                                        confirmToast({
                                                            title: `Deactivate ${member.name}?`,
                                                            message: 'The staff member will lose portal access and their active tokens will be revoked.',
                                                            confirmLabel: 'Deactivate Staff',
                                                            onConfirm: () => deactivateStaffMutation.mutate(member.id),
                                                        })
                                                    }
                                                    className="rounded-xl border border-slate-200 p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!filteredStaff.length && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        <UserRound className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                                        <p className="font-semibold text-slate-600">No staff accounts match your search or filter.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Staff Account Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-viva-blue" />
                                <h2 className="font-display text-xl font-bold text-ink">Create Staff Account</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitCreate} className="mt-6 space-y-4">
                            <div>
                                <label htmlFor="create_staff_name" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="create_staff_name"
                                    required
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    placeholder="Enter full name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="create_staff_email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="create_staff_email"
                                    required
                                    type="email"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    placeholder="staff@vivadigitalcenter.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="create_staff_phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Phone Number <span className="font-normal text-slate-400">(Optional)</span>
                                </label>
                                <input
                                    id="create_staff_phone"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    placeholder="+255 7XX XXX XXX"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="create_staff_role" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    System Role <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="create_staff_role"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value as 'manager' | 'admin' | 'facilitator' })}
                                >
                                    <option value="facilitator">Facilitator</option>
                                    <option value="admin">Admin</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="create_staff_password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Temporary Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="create_staff_password"
                                    required
                                    minLength={8}
                                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}"
                                    type="password"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    placeholder="Enter initial password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                />
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Must be 8+ characters with uppercase, lowercase, number, and symbol.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="create_staff_password_confirmation" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Confirm Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="create_staff_password_confirmation"
                                    required
                                    minLength={8}
                                    type="password"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    placeholder="Re-enter password"
                                    value={form.password_confirmation}
                                    onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="rounded-xl border border-slate-200 px-5 py-2.5 font-bold text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={createStaffMutation.isPending}
                                    className="rounded-xl bg-viva-blue px-6 py-2.5 font-bold text-white shadow-md shadow-viva-blue/20 disabled:opacity-50"
                                >
                                    {createStaffMutation.isPending ? 'Creating Account...' : 'Create Staff Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
