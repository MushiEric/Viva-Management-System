import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { api } from '../services/api';

interface TimetableCohort {
    cohort_id: number;
    cohort: { display_name: string };
    schedule_window: string;
    start_date: string | null;
    level: { fee_tzs: string | null };
    capacity: { available_seats: number; status: 'available' | 'full' };
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

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue';
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-700';

const isMinor = (dateOfBirth: string) => {
    if (!dateOfBirth) return false;
    const eighteenthBirthday = new Date(`${dateOfBirth}T00:00:00`);
    eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);
    return eighteenthBirthday > new Date();
};

const cohortLabel = (cohort: TimetableCohort) => {
    const parts = [cohort.cohort.display_name, cohort.schedule_window];
    if (cohort.start_date) parts.push(`starts ${cohort.start_date}`);
    if (cohort.level.fee_tzs) parts.push(`TZS ${Number(cohort.level.fee_tzs).toLocaleString()}`);
    const seats = cohort.capacity.status === 'full' ? 'Fully booked' : `${cohort.capacity.available_seats} seats left`;
    return `${parts.join(' · ')} (${seats})`;
};

export default function SelfRegister() {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const [form, setForm] = useState(blankForm);
    const [cohortId, setCohortId] = useState(searchParams.get('cohort_id') ?? '');
    const [registered, setRegistered] = useState<{ full_name: string; trainee_number: string; cohort_name: string } | null>(null);

    const { data: timetable, isLoading: cohortsLoading } = useQuery({
        queryKey: ['timetable'],
        queryFn: api.getTimetable,
    });
    const cohorts = (timetable?.data as TimetableCohort[] | undefined) ?? [];
    const minor = isMinor(form.date_of_birth);

    const registerMutation = useMutation({
        mutationFn: () => api.selfRegisterTrainee({
            full_name: form.full_name,
            date_of_birth: form.date_of_birth,
            gender: form.gender,
            phone: form.phone,
            email: form.email || null,
            tin: form.tin || null,
            address: form.address,
            occupation: form.occupation || null,
            cohort_id: Number(cohortId),
            ...(form.emergency_name ? {
                emergency_contact: {
                    full_name: form.emergency_name,
                    relationship: form.emergency_relationship,
                    phone: form.emergency_phone,
                    alternate_phone: form.emergency_alternate_phone || null,
                },
            } : {}),
        }),
        onSuccess: (response) => {
            setRegistered(response.data);
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        registerMutation.mutate();
    };

    if (registered) {
        return (
            <div className="mx-auto max-w-2xl py-12">
                <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-900">Registration Successful!</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Welcome, <strong className="text-slate-900">{registered.full_name}</strong>. You are enrolled in <strong className="text-slate-900">{registered.cohort_name}</strong>.
                    </p>
                    <p className="mt-4 text-sm text-slate-600">Your trainee number is</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-viva-blue">{registered.trainee_number}</p>
                    <p className="mt-4 text-xs text-slate-500">Please keep this number. Our office will contact you with payment and class details.</p>
                    <Link to="/timetable" className="mt-8 inline-flex items-center justify-center rounded-xl bg-viva-blue px-6 py-3 font-display text-sm font-bold text-white shadow-md hover:bg-slate-900">
                        Back to Timetable
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="font-display text-3xl font-extrabold text-ink">Register as a Trainee</h1>
                <p className="mt-1 text-sm text-slate-500">Fill in your details and choose a class to join. Fields marked <span className="text-red-500">*</span> are required.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <h2 className="border-b pb-2 font-display text-lg font-bold text-ink">1. Choose Your Class</h2>
                        <div className="mt-4">
                            <label htmlFor="cohort_id" className={labelClass}>
                                Course / Cohort <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="cohort_id"
                                required
                                className={inputClass}
                                value={cohortId}
                                onChange={(e) => setCohortId(e.target.value)}
                            >
                                <option value="">{cohortsLoading ? 'Loading classes...' : 'Select a class'}</option>
                                {cohorts.map((cohort) => (
                                    <option key={cohort.cohort_id} value={cohort.cohort_id} disabled={cohort.capacity.status === 'full'}>
                                        {cohortLabel(cohort)}
                                    </option>
                                ))}
                            </select>
                            {!cohortsLoading && cohorts.length === 0 && (
                                <p className="mt-2 text-xs text-slate-500">No classes are open for registration right now. Please check back later.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h2 className="border-b pb-2 font-display text-lg font-bold text-ink">2. Personal Information</h2>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="sm:col-span-2">
                                <label htmlFor="full_name" className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                                <input id="full_name" type="text" required maxLength={255} placeholder="Enter your full legal name" className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="date_of_birth" className={labelClass}>Date of Birth <span className="text-red-500">*</span></label>
                                <input id="date_of_birth" type="date" required max={new Date().toISOString().slice(0, 10)} className={inputClass} value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="gender" className={labelClass}>Gender <span className="text-red-500">*</span></label>
                                <select id="gender" required className={inputClass} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="occupation" className={labelClass}>Occupation / Student Status</label>
                                <input id="occupation" type="text" maxLength={255} placeholder="e.g. High School Student, Accountant, Self-Employed" className={inputClass} value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="border-b pb-2 font-display text-lg font-bold text-ink">3. Contact & Billing Information</h2>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label htmlFor="phone" className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                                <input id="phone" type="tel" required maxLength={30} placeholder="+255 7XX XXX XXX" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="email" className={labelClass}>Email Address <span className="font-normal text-slate-400">(Optional)</span></label>
                                <input id="email" type="email" maxLength={255} placeholder="you@example.com" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="tin" className={labelClass}>TIN <span className="font-normal text-slate-400">(Optional for EFD Invoices)</span></label>
                                <input id="tin" type="text" maxLength={50} placeholder="9-digit TIN number" className={inputClass} value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label htmlFor="address" className={labelClass}>Physical Residential Address <span className="text-red-500">*</span></label>
                                <textarea id="address" required rows={2} maxLength={1000} placeholder="Street name, District, Region (e.g. Mikocheni B, Kinondoni, Dar es Salaam)" className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-6">
                        <h2 className="border-b border-slate-200 pb-2 font-display text-lg font-bold text-ink">
                            4. Emergency Contact{' '}
                            <span className="text-xs font-normal text-slate-500">{minor ? '(Required for trainees under 18)' : '(Optional)'}</span>
                        </h2>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="emergency_name" className={labelClass}>Contact Person Full Name {minor && <span className="text-red-500">*</span>}</label>
                                <input id="emergency_name" type="text" required={minor} maxLength={255} placeholder="Parent or Guardian name" className={inputClass} value={form.emergency_name} onChange={(e) => setForm({ ...form, emergency_name: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="emergency_relationship" className={labelClass}>Relationship {(minor || form.emergency_name) && <span className="text-red-500">*</span>}</label>
                                <input id="emergency_relationship" type="text" required={minor || !!form.emergency_name} maxLength={100} placeholder="e.g. Father, Mother, Sponsor" className={inputClass} value={form.emergency_relationship} onChange={(e) => setForm({ ...form, emergency_relationship: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="emergency_phone" className={labelClass}>Primary Emergency Phone {(minor || form.emergency_name) && <span className="text-red-500">*</span>}</label>
                                <input id="emergency_phone" type="tel" required={minor || !!form.emergency_name} maxLength={30} placeholder="+255 7XX XXX XXX" className={inputClass} value={form.emergency_phone} onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="emergency_alternate_phone" className={labelClass}>Alternate Emergency Phone <span className="font-normal text-slate-400">(Optional)</span></label>
                                <input id="emergency_alternate_phone" type="tel" maxLength={30} placeholder="+255 7XX XXX XXX" className={inputClass} value={form.emergency_alternate_phone} onChange={(e) => setForm({ ...form, emergency_alternate_phone: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                        <Link to="/timetable" className="inline-flex justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-display text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={registerMutation.isPending}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-viva-blue px-8 py-3.5 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition hover:bg-slate-900 disabled:opacity-50"
                        >
                            <UserPlus className="h-4 w-4" />
                            <span>{registerMutation.isPending ? 'Submitting...' : 'Submit Registration'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
