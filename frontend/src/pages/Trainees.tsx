import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowRightLeft, Download, Pencil, Search, Trash2, UserRound } from 'lucide-react';
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

interface Enrollment {
    id: number;
    status: string;
    progress_percentage: string;
    enrolled_at: string;
    cohort_id: number;
    cohort: {
        name: string;
        program_level?: { name: string; program: { name: string } };
    };
}

interface TimetableCohort {
    cohort_id: number;
    cohort_name: string;
    course: { name: string; parent_course: string | null };
    capacity: { status: string; available_seats: number };
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
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const canManage = user?.role === 'manager' || user?.role === 'admin';
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(blankForm);
    const [registrationForm, setRegistrationForm] = useState<File | null>(null);
    const [transfer, setTransfer] = useState({ enrollment_id: 0, cohort_id: 0, reason: '' });

    const traineesQuery = useQuery({ queryKey: ['trainees', search], queryFn: () => api.getTrainees(search) });
    const detailQuery = useQuery({ queryKey: ['trainee', selectedId], queryFn: () => api.getTrainee(selectedId!), enabled: !!selectedId });
    const timetableQuery = useQuery({ queryKey: ['timetable'], queryFn: api.getTimetable });
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['trainees'] });
        queryClient.invalidateQueries({ queryKey: ['trainee-options'] });
        queryClient.invalidateQueries({ queryKey: ['trainee', selectedId] });
        queryClient.invalidateQueries({ queryKey: ['timetable'] });
    };

    const update = useMutation({
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

            return api.updateTrainee(selectedId!, payload);
        },
        onSuccess: () => {
            setEditing(false);
            refresh();
            toast.success('Trainee profile updated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });
    const deactivate = useMutation({
        mutationFn: api.deactivateTrainee,
        onSuccess: () => {
            setSelectedId(null);
            refresh();
            toast.success('Trainee record deactivated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });
    const transferEnrollment = useMutation({
        mutationFn: () => api.transferEnrollment(transfer.enrollment_id, transfer.cohort_id, transfer.reason),
        onSuccess: () => {
            setTransfer({ enrollment_id: 0, cohort_id: 0, reason: '' });
            refresh();
            toast.success('Enrollment transferred with its learning and finance history.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const detail = detailQuery.data?.data;
    const selected = detail?.trainee as (TraineeSummary & { enrollments: Enrollment[] }) | undefined;
    const trainees = (traineesQuery.data?.data?.data || []) as TraineeSummary[];
    const cohorts = (timetableQuery.data?.data || []) as TimetableCohort[];

    useEffect(() => {
        if (!selected || !editing) return;
        const emergency = selected.emergency_contact;
        setForm({
            full_name: selected.full_name,
            date_of_birth: selected.date_of_birth,
            gender: selected.gender,
            phone: selected.phone || '',
            email: selected.email || '',
            tin: selected.tin || '',
            address: selected.address || '',
            occupation: selected.occupation || '',
            emergency_name: emergency?.full_name || '',
            emergency_relationship: emergency?.relationship || '',
            emergency_phone: emergency?.phone || '',
            emergency_alternate_phone: emergency?.alternate_phone || '',
        });
    }, [selected, editing]);

    const submitUpdate = (event: FormEvent) => {
        event.preventDefault();
        update.mutate();
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold">Trainees</h1>
                <p className="mt-1 text-sm text-slate-500">Search profiles, review enrollment history, edit authorized details, and transfer active training.</p>
            </header>

            <div className="relative max-w-xl">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input className="w-full rounded-xl border bg-white py-3 pl-10 pr-4" placeholder="Search name, trainee number, phone, or email" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    {trainees.map((trainee) => (
                        <button key={trainee.id} onClick={() => { setSelectedId(trainee.id); setEditing(false); }} className={`block w-full border-b p-4 text-left transition hover:bg-slate-50 ${selectedId === trainee.id ? 'bg-blue-50' : ''}`}>
                            <p className="font-bold">{trainee.full_name}</p>
                            <p className="mt-1 text-xs text-slate-500">{trainee.trainee_number} · {trainee.enrollments_count} enrollment(s)</p>
                        </button>
                    ))}
                    {!trainees.length && <p className="p-8 text-center text-sm text-slate-400">No trainee records found.</p>}
                </section>

                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                    {!selected ? (
                        <div className="py-16 text-center text-slate-400"><UserRound className="mx-auto mb-3 h-10 w-10" /><p>Select a trainee to view their profile.</p></div>
                    ) : editing ? (
                        <form onSubmit={submitUpdate} className="space-y-4">
                            <h2 className="font-display text-xl font-bold">Edit {selected.full_name}</h2>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-sm font-semibold">Full Name<input required className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
                                <label className="text-sm font-semibold">Date of Birth<input required type="date" className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.date_of_birth} onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })} /></label>
                                <label className="text-sm font-semibold">Gender<select className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="male">Male</option><option value="female">Female</option></select></label>
                                <label className="text-sm font-semibold">Phone Number<input required className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                                <label className="text-sm font-semibold">Email <span className="font-normal text-slate-400">(optional)</span><input type="email" className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                                <label className="text-sm font-semibold">Customer TIN <span className="font-normal text-slate-400">(optional)</span><input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.tin} onChange={(event) => setForm({ ...form, tin: event.target.value })} /></label>
                                <label className="text-sm font-semibold">Occupation<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.occupation} onChange={(event) => setForm({ ...form, occupation: event.target.value })} /></label>
                                <label className="text-sm font-semibold">Replace Registration Form <span className="font-normal text-slate-400">(PDF, max 5 MB)</span><input type="file" accept="application/pdf" className="mt-1 w-full rounded-xl border p-3 font-normal" onChange={(event) => setRegistrationForm(event.target.files?.[0] || null)} /></label>
                            </div>
                            <label className="block text-sm font-semibold">Address<textarea required className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
                            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
                                <input className="rounded-xl border p-3" placeholder="Emergency contact name" value={form.emergency_name} onChange={(event) => setForm({ ...form, emergency_name: event.target.value })} />
                                <input className="rounded-xl border p-3" placeholder="Relationship" value={form.emergency_relationship} onChange={(event) => setForm({ ...form, emergency_relationship: event.target.value })} />
                                <input className="rounded-xl border p-3" placeholder="Emergency phone" value={form.emergency_phone} onChange={(event) => setForm({ ...form, emergency_phone: event.target.value })} />
                                <input className="rounded-xl border p-3" placeholder="Alternate phone" value={form.emergency_alternate_phone} onChange={(event) => setForm({ ...form, emergency_alternate_phone: event.target.value })} />
                            </div>
                            <div className="flex gap-3"><button className="rounded-xl bg-viva-blue px-5 py-3 font-bold text-white">Save Profile</button><button type="button" onClick={() => setEditing(false)} className="rounded-xl border px-5 py-3 font-bold">Cancel</button></div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between gap-4">
                                <div><h2 className="font-display text-2xl font-extrabold">{selected.full_name}</h2><p className="text-sm text-slate-500">{selected.trainee_number}</p></div>
                                {canManage && <div className="flex gap-2"><button onClick={() => setEditing(true)} className="rounded-lg border p-2 text-viva-blue"><Pencil className="h-4 w-4" /></button><button onClick={() => confirmToast({ title: `Deactivate ${selected.full_name}?`, message: 'This hides the trainee record from active use. Trainees with active enrollments cannot be deactivated.', confirmLabel: 'Deactivate Trainee', onConfirm: () => deactivate.mutate(selected.id) })} className="rounded-lg border p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div>}
                            </div>
                            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-2">
                                <p><strong>Date of birth:</strong> {selected.date_of_birth}</p><p><strong>Gender:</strong> {selected.gender}</p>
                                <p><strong>Phone:</strong> {selected.phone || 'Not provided'}</p><p><strong>Email:</strong> {selected.email || 'Not provided'}</p>
                                <p><strong>Customer TIN:</strong> {selected.tin || 'Not provided'}</p>
                                <p><strong>Occupation:</strong> {selected.occupation || 'Not provided'}</p><p><strong>Address:</strong> {selected.address || 'Not provided'}</p>
                            </div>
                            {selected.registration_form_path && (
                                <button onClick={() => api.downloadTraineeRegistrationForm(selected.id, selected.trainee_number)} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold text-viva-blue">
                                    <Download className="h-4 w-4" /> Download Scanned Registration Form
                                </button>
                            )}
                            {selected.emergency_contact && <div className="rounded-xl border p-4 text-sm"><h3 className="mb-2 font-bold">Emergency Contact</h3><p>{selected.emergency_contact.full_name} · {selected.emergency_contact.relationship}</p><p>{selected.emergency_contact.phone}</p></div>}
                            <div>
                                <h3 className="mb-3 font-display text-lg font-bold">Enrollment History</h3>
                                <div className="space-y-3">
                                    {selected.enrollments.map((enrollment) => (
                                        <div key={enrollment.id} className="rounded-xl border p-4">
                                            <div className="flex justify-between"><div><p className="font-bold">{enrollment.cohort.program_level?.program.name || 'Legacy Program'} — {enrollment.cohort.program_level?.name || enrollment.cohort.name}</p><p className="text-xs text-slate-500">{enrollment.cohort.name} · {enrollment.status} · {enrollment.progress_percentage}% progress</p></div></div>
                                            {canManage && ['pending', 'active', 'ongoing'].includes(enrollment.status) && (
                                                <button onClick={() => setTransfer({ ...transfer, enrollment_id: enrollment.id })} className="mt-3 rounded-lg border px-3 py-2 text-xs font-bold text-viva-blue"><ArrowRightLeft className="mr-1 inline h-4 w-4" />Transfer</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {detail.invoices !== null && <div className="rounded-xl bg-slate-50 p-4 text-sm"><strong>Financial summary:</strong> {detail.invoices.length} invoice(s), {detail.payments.length} payment(s)</div>}
                        </div>
                    )}
                </section>
            </div>

            {transfer.enrollment_id > 0 && (
                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold">Transfer Enrollment</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
                        <select className="rounded-xl border p-3" value={transfer.cohort_id} onChange={(event) => setTransfer({ ...transfer, cohort_id: Number(event.target.value) })}>
                            <option value={0}>Select target cohort</option>
                            {cohorts.filter((cohort) => cohort.capacity.status !== 'full').map((cohort) => <option key={cohort.cohort_id} value={cohort.cohort_id}>{cohort.course.parent_course} — {cohort.course.name} · {cohort.cohort_name}</option>)}
                        </select>
                        <input className="rounded-xl border p-3" placeholder="Reason for transfer" value={transfer.reason} onChange={(event) => setTransfer({ ...transfer, reason: event.target.value })} />
                        <button disabled={!transfer.cohort_id || !transfer.reason || transferEnrollment.isPending} onClick={() => transferEnrollment.mutate()} className="rounded-xl bg-viva-blue px-5 py-3 font-bold text-white disabled:opacity-50">Confirm Transfer</button>
                    </div>
                </section>
            )}
        </div>
    );
}
