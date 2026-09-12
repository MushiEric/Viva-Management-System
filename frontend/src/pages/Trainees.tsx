import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Download,
    Eye,
    Filter,
    Mail,
    Pencil,
    Phone,
    RefreshCw,
    Search,
    Trash2,
    UserPlus,
    UserRound,
    Users,
    X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { confirmToast } from '../components/ConfirmToast';

interface TraineeSummary {
    id: number;
    trainee_number: string;
    full_name: string;
    date_of_birth: string;
    gender: string;
    phone: string | null;
    email: string | null;
    tin: string | null;
    address: string | null;
    occupation: string | null;
    registration_form_path: string | null;
    enrollments_count: number;
    emergency_contact: EmergencyContact | null;
}

interface EmergencyContact {
    full_name: string;
    relationship: string;
    phone: string;
    alternate_phone?: string | null;
}

const blankForm = {
    full_name: '',
    date_of_birth: '',
    gender: 'male',
    phone: '',
    email: '',
    tin: '',
    address: '',
    occupation: '',
    emergency_name: '',
    emergency_relationship: '',
    emergency_phone: '',
    emergency_alternate_phone: '',
};

export default function Trainees() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const canManage = user?.role === 'manager' || user?.role === 'admin';

    const [search, setSearch] = useState('');
    const [genderFilter, setGenderFilter] = useState<string>('all');
    const [selectedTraineeId, setSelectedTraineeId] = useState<number | null>(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(blankForm);
    const [registrationForm, setRegistrationForm] = useState<File | null>(null);

    const traineesQuery = useQuery({
        queryKey: ['trainees', search, genderFilter],
        queryFn: () => api.getTrainees(search),
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['trainees'] });
    };

    const updateMutation = useMutation({
        mutationFn: () => {
            const payload = new FormData();
            payload.set('full_name', form.full_name);
            payload.set('date_of_birth', form.date_of_birth);
            payload.set('gender', form.gender);
            payload.set('phone', form.phone);
            payload.set('email', form.email);
            payload.set('tin', form.tin);
            payload.set('address', form.address);
            payload.set('occupation', form.occupation);
            if (registrationForm) payload.set('registration_form', registrationForm);
            if (form.emergency_name) {
                payload.set('emergency_contact[full_name]', form.emergency_name);
                payload.set('emergency_contact[relationship]', form.emergency_relationship);
                payload.set('emergency_contact[phone]', form.emergency_phone);
                payload.set('emergency_contact[alternate_phone]', form.emergency_alternate_phone);
            }

            return api.updateTrainee(selectedTraineeId!, payload);
        },
        onSuccess: () => {
            setEditing(false);
            setSelectedTraineeId(null);
            setRegistrationForm(null);
            refresh();
            toast.success('Trainee profile updated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const deactivateMutation = useMutation({
        mutationFn: api.deactivateTrainee,
        onSuccess: () => {
            refresh();
            toast.success('Trainee record deactivated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const rawTrainees = (traineesQuery.data?.data?.data || []) as TraineeSummary[];
    const filteredTrainees = rawTrainees.filter((t) => {
        if (genderFilter !== 'all' && t.gender !== genderFilter) return false;
        return true;
    });

    const handleEditClick = (trainee: TraineeSummary) => {
        setSelectedTraineeId(trainee.id);
        const emergency = trainee.emergency_contact;
        setForm({
            full_name: trainee.full_name,
            date_of_birth: trainee.date_of_birth,
            gender: trainee.gender,
            phone: trainee.phone || '',
            email: trainee.email || '',
            tin: trainee.tin || '',
            address: trainee.address || '',
            occupation: trainee.occupation || '',
            emergency_name: emergency?.full_name || '',
            emergency_relationship: emergency?.relationship || '',
            emergency_phone: emergency?.phone || '',
            emergency_alternate_phone: emergency?.alternate_phone || '',
        });
        setEditing(true);
    };

    const handleFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        updateMutation.mutate();
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-extrabold text-ink">Trainees Directory</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage registered students, view academic profiles, and manage enrollment records.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={refresh}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${traineesQuery.isFetching ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <Link
                        to="/enroll"
                        className="inline-flex items-center gap-2 rounded-xl bg-viva-blue px-4 py-2.5 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition hover:bg-slate-900"
                    >
                        <UserPlus className="h-4 w-4" />
                        <span>Enroll Student</span>
                    </Link>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-viva-blue focus:bg-white focus:ring-1 focus:ring-viva-blue"
                        placeholder="Search by name, trainee number, phone, or email..."
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
                        <span className="text-xs font-bold text-slate-500">Gender:</span>
                        <select
                            className="bg-transparent text-xs font-bold text-slate-800 outline-none"
                            value={genderFilter}
                            onChange={(e) => setGenderFilter(e.target.value)}
                        >
                            <option value="all">All Genders</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>

                    <span className="text-xs font-bold text-slate-400">
                        {filteredTrainees.length} Record{filteredTrainees.length === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Trainee / Number</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Gender & DOB</th>
                                <th className="px-6 py-4">Occupation & TIN</th>
                                <th className="px-6 py-4">Emergency Contact</th>
                                <th className="px-6 py-4">Courses</th>
                                <th className="px-6 py-4">Form</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTrainees.map((trainee) => (
                                <tr key={trainee.id} className="transition hover:bg-slate-50/80">
                                    {/* Trainee Details */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-viva-blue/10 text-viva-blue font-bold">
                                                <UserRound className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <Link
                                                    to={`/trainees/${trainee.id}`}
                                                    className="font-display font-bold text-slate-900 hover:text-viva-blue hover:underline"
                                                >
                                                    {trainee.full_name}
                                                </Link>
                                                <div className="mt-0.5 flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-slate-500">
                                                        {trainee.trainee_number}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Contact Info */}
                                    <td className="px-6 py-4">
                                        <div className="space-y-1 text-xs">
                                            {trainee.phone ? (
                                                <a href={`tel:${trainee.phone}`} className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-viva-blue">
                                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                    <span>{trainee.phone}</span>
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">No phone</span>
                                            )}
                                            {trainee.email ? (
                                                <a href={`mailto:${trainee.email}`} className="flex items-center gap-1.5 text-slate-500 hover:text-viva-blue truncate max-w-[180px]">
                                                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="truncate">{trainee.email}</span>
                                                </a>
                                            ) : (
                                                <span className="block text-[11px] text-slate-400">No email</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Gender & DOB */}
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${trainee.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {trainee.gender}
                                            </span>
                                            <p className="text-xs text-slate-500">{trainee.date_of_birth}</p>
                                        </div>
                                    </td>

                                    {/* Occupation & TIN */}
                                    <td className="px-6 py-4 text-xs">
                                        <p className="font-semibold text-slate-800">{trainee.occupation || 'N/A'}</p>
                                        {trainee.tin && (
                                            <p className="mt-0.5 font-mono text-[11px] text-slate-500">TIN: {trainee.tin}</p>
                                        )}
                                    </td>

                                    {/* Emergency Contact */}
                                    <td className="px-6 py-4 text-xs">
                                        {trainee.emergency_contact ? (
                                            <div>
                                                <p className="font-bold text-slate-800">{trainee.emergency_contact.full_name}</p>
                                                <p className="text-[11px] text-slate-500">
                                                    {trainee.emergency_contact.relationship} · {trainee.emergency_contact.phone}
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">Not recorded</span>
                                        )}
                                    </td>

                                    {/* Enrollments Count */}
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                            <Users className="h-3.5 w-3.5 text-viva-blue" />
                                            <span>{trainee.enrollments_count} Course{trainee.enrollments_count === 1 ? '' : 's'}</span>
                                        </span>
                                    </td>

                                    {/* Registration Form Download */}
                                    <td className="px-6 py-4">
                                        {trainee.registration_form_path ? (
                                            <button
                                                type="button"
                                                title="Download Scanned Form PDF"
                                                onClick={() => api.downloadTraineeRegistrationForm(trainee.id, trainee.trainee_number)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-viva-blue/30 bg-blue-50 px-2.5 py-1 text-xs font-bold text-viva-blue transition hover:bg-viva-blue hover:text-white"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                <span>PDF</span>
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-slate-400">None</span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/trainees/${trainee.id}`)}
                                                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-viva-blue hover:text-white"
                                                title="View Full Profile"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                <span>Profile</span>
                                            </button>

                                            {canManage && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditClick(trainee)}
                                                        className="rounded-xl border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-viva-blue"
                                                        title="Quick Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            confirmToast({
                                                                title: `Deactivate ${trainee.full_name}?`,
                                                                message: 'This will hide the trainee record from active use. Trainees with active enrollments cannot be deactivated.',
                                                                confirmLabel: 'Deactivate Trainee',
                                                                onConfirm: () => deactivateMutation.mutate(trainee.id),
                                                            })
                                                        }
                                                        className="rounded-xl border border-slate-200 p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                                        title="Deactivate Trainee"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!filteredTrainees.length && (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400">
                                        <UserRound className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                                        <p className="font-semibold text-slate-600">No trainee records match your filters.</p>
                                        <p className="mt-1 text-xs">Try clearing your search query or gender filter.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Edit Modal */}
            {editing && selectedTraineeId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h2 className="font-display text-xl font-bold text-ink">Edit Trainee Details</h2>
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Full Name
                                    <input
                                        required
                                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800"
                                        value={form.full_name}
                                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Date of Birth
                                    <input
                                        required
                                        type="date"
                                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800"
                                        value={form.date_of_birth}
                                        onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                                    />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Gender
                                    <select
                                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800"
                                        value={form.gender}
                                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Phone Number
                                    <input
                                        required
                                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Email Address
                                    <input
                                        type="email"
                                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Customer TIN
                                    <input
                                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800"
                                        value={form.tin}
                                        onChange={(e) => setForm({ ...form, tin: e.target.value })}
                                    />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500 md:col-span-2">
                                    Occupation
                                    <input
                                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800"
                                        value={form.occupation}
                                        onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                                    />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500 md:col-span-2">
                                    Physical Address
                                    <textarea
                                        required
                                        rows={2}
                                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800"
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500 md:col-span-2">
                                    Replace Registration Form (PDF, Max 5MB)
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs"
                                        onChange={(e) => setRegistrationForm(e.target.files?.[0] || null)}
                                    />
                                </label>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="mb-3 text-xs font-bold uppercase text-slate-500">Emergency Contact</p>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input
                                        className="rounded-xl border border-slate-200 p-3 text-sm"
                                        placeholder="Emergency contact name"
                                        value={form.emergency_name}
                                        onChange={(e) => setForm({ ...form, emergency_name: e.target.value })}
                                    />
                                    <input
                                        className="rounded-xl border border-slate-200 p-3 text-sm"
                                        placeholder="Relationship"
                                        value={form.emergency_relationship}
                                        onChange={(e) => setForm({ ...form, emergency_relationship: e.target.value })}
                                    />
                                    <input
                                        className="rounded-xl border border-slate-200 p-3 text-sm"
                                        placeholder="Emergency phone"
                                        value={form.emergency_phone}
                                        onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
                                    />
                                    <input
                                        className="rounded-xl border border-slate-200 p-3 text-sm"
                                        placeholder="Alternate phone"
                                        value={form.emergency_alternate_phone}
                                        onChange={(e) => setForm({ ...form, emergency_alternate_phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="rounded-xl border border-slate-200 px-5 py-2.5 font-bold text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={updateMutation.isPending}
                                    className="rounded-xl bg-viva-blue px-6 py-2.5 font-bold text-white shadow-md disabled:opacity-50"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
