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
        emergency_name: '',
        emergency_relationship: '',
        emergency_phone: '',
    });

    const timetable = useQuery({ queryKey: ['timetable'], queryFn: api.getTimetable });
    const trainees = useQuery({ queryKey: ['trainees'], queryFn: api.getTrainees });

    const createTrainee = useMutation({
        mutationFn: () => api.createTrainee({
            full_name: form.full_name,
            date_of_birth: form.date_of_birth,
            gender: form.gender,
            phone: form.phone || null,
            email: form.email || null,
            emergency_contact: form.emergency_name ? {
                full_name: form.emergency_name,
                relationship: form.emergency_relationship,
                phone: form.emergency_phone,
            } : null,
        }),
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
                    <input required placeholder="Full name" className="w-full rounded-xl border p-3" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
                    <div className="grid grid-cols-2 gap-3">
                        <input required type="date" className="rounded-xl border p-3" value={form.date_of_birth} onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })} />
                        <select className="rounded-xl border p-3" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Phone (optional)" className="rounded-xl border p-3" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                        <input type="email" placeholder="Email (optional)" className="rounded-xl border p-3" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                    </div>
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
