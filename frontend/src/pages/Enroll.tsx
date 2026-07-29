import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface Cohort {
    cohort_id: number;
    cohort_name: string;
    course: { name: string };
    capacity: { available_seats: number; status: string };
}

interface Trainee {
    id: number;
    trainee_number: string;
    full_name: string;
}

export default function Enroll() {
    const queryClient = useQueryClient();
    const [cohortId, setCohortId] = useState(0);
    const [traineeId, setTraineeId] = useState(0);
    const [form, setForm] = useState({
        full_name: '',
        date_of_birth: '',
        gender: 'male',
        phone: '',
        email: '',
        tin: '',
        address: '',
        emergency_name: '',
        emergency_relationship: '',
        emergency_phone: '',
    });
    const [registrationForm, setRegistrationForm] = useState<File | null>(null);

    const timetable = useQuery({ queryKey: ['timetable'], queryFn: api.getTimetable });
    const trainees = useQuery({ queryKey: ['trainees'], queryFn: () => api.getTrainees() });

    const createTrainee = useMutation({
        mutationFn: () => {
            const payload = new FormData();
            payload.set('full_name', form.full_name);
            payload.set('date_of_birth', form.date_of_birth);
            payload.set('gender', form.gender);
            payload.set('phone', form.phone);
            payload.set('email', form.email);
            payload.set('tin', form.tin);
            payload.set('address', form.address);
            if (registrationForm) payload.set('registration_form', registrationForm);
            if (form.emergency_name) {
                payload.set('emergency_contact[full_name]', form.emergency_name);
                payload.set('emergency_contact[relationship]', form.emergency_relationship);
                payload.set('emergency_contact[phone]', form.emergency_phone);
            }

            return api.createTrainee(payload);
        },
        onSuccess: (response) => {
            setTraineeId(response.data.id);
            queryClient.invalidateQueries({ queryKey: ['trainees'] });
            toast.success('Trainee record created.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const enroll = useMutation({
        mutationFn: () => api.enroll({ cohort_id: cohortId, trainee_id: traineeId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
            toast.success('Enrollment completed.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const submitTrainee = (event: FormEvent) => {
        event.preventDefault();
        createTrainee.mutate();
    };

    const submitEnrollment = (event: FormEvent) => {
        event.preventDefault();
        enroll.mutate();
    };

    const cohortList = (timetable.data?.data || []) as Cohort[];
    const traineeList = (trainees.data?.data?.data || []) as Trainee[];

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="font-display text-2xl font-bold">Register Trainee</h1>
                <p className="mt-1 text-sm text-slate-500">Trainees are records only and do not receive login accounts.</p>
                <form className="mt-6 space-y-4" onSubmit={submitTrainee}>
                    <label className="block text-sm font-semibold text-slate-700">Full Name
                        <input required placeholder="Enter full name" className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm font-semibold text-slate-700">Date of Birth
                            <input required type="date" className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.date_of_birth} onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })} />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">Gender
                            <select className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm font-semibold text-slate-700">Phone Number
                            <input required placeholder="+255..." className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">Email <span className="font-normal text-slate-400">(optional)</span>
                            <input type="email" placeholder="name@example.com" className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                        </label>
                    </div>
                    <label className="block text-sm font-semibold text-slate-700">Address
                        <textarea required placeholder="Residential address" className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">Customer TIN <span className="font-normal text-slate-400">(optional)</span>
                        <input placeholder="TIN number for tax invoices" className="mt-1 w-full rounded-xl border p-3 font-normal" value={form.tin} onChange={(event) => setForm({ ...form, tin: event.target.value })} />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">Scanned Registration Form <span className="font-normal text-slate-400">(PDF, maximum 5 MB)</span>
                        <input type="file" accept="application/pdf" className="mt-1 w-full rounded-xl border bg-white p-3 font-normal" onChange={(event) => setRegistrationForm(event.target.files?.[0] || null)} />
                    </label>
                    <div className="rounded-xl bg-slate-50 p-4">
                        <p className="mb-3 text-xs font-bold uppercase text-slate-500">Emergency contact — required for minors</p>
                        <div className="space-y-3">
                            <input placeholder="Contact full name" className="w-full rounded-xl border p-3" value={form.emergency_name} onChange={(event) => setForm({ ...form, emergency_name: event.target.value })} />
                            <input placeholder="Relationship" className="w-full rounded-xl border p-3" value={form.emergency_relationship} onChange={(event) => setForm({ ...form, emergency_relationship: event.target.value })} />
                            <input placeholder="Contact phone" className="w-full rounded-xl border p-3" value={form.emergency_phone} onChange={(event) => setForm({ ...form, emergency_phone: event.target.value })} />
                        </div>
                    </div>
                    <button disabled={createTrainee.isPending} className="w-full rounded-xl bg-viva-blue p-3 font-bold text-white disabled:opacity-50">
                        {createTrainee.isPending ? 'Saving...' : 'Create Trainee'}
                    </button>
                </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-display text-2xl font-bold">Enroll Into Cohort</h2>
                <p className="mt-1 text-sm text-slate-500">Select an existing trainee and an available program session.</p>
                <form className="mt-6 space-y-4" onSubmit={submitEnrollment}>
                    <select required className="w-full rounded-xl border p-3" value={traineeId} onChange={(event) => setTraineeId(Number(event.target.value))}>
                        <option value={0}>Select trainee</option>
                        {traineeList.map((trainee) => <option key={trainee.id} value={trainee.id}>{trainee.trainee_number} — {trainee.full_name}</option>)}
                    </select>
                    <select required className="w-full rounded-xl border p-3" value={cohortId} onChange={(event) => setCohortId(Number(event.target.value))}>
                        <option value={0}>Select cohort</option>
                        {cohortList.map((cohort) => (
                            <option key={cohort.cohort_id} value={cohort.cohort_id} disabled={cohort.capacity.status === 'full'}>
                                {cohort.course.name} — {cohort.cohort_name} ({cohort.capacity.available_seats} seats)
                            </option>
                        ))}
                    </select>
                    <button disabled={!traineeId || !cohortId || enroll.isPending} className="w-full rounded-xl bg-viva-green p-3 font-bold text-white disabled:opacity-50">
                        {enroll.isPending ? 'Processing...' : 'Confirm Enrollment'}
                    </button>
                </form>
            </section>
        </div>
    );
}
