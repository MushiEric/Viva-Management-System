import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, BookOpen, CheckCircle2, User, UserPlus } from 'lucide-react';
import { api } from '../services/api';

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

export default function RegisterTrainee() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form, setForm] = useState(blankForm);
    const [registrationForm, setRegistrationForm] = useState<File | null>(null);
    const [createdTrainee, setCreatedTrainee] = useState<{ id: number; full_name: string; trainee_number: string } | null>(null);

    const createTraineeMutation = useMutation({
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

            return api.createTrainee(payload);
        },
        onSuccess: (response) => {
            const trainee = response.data;
            setCreatedTrainee({ id: trainee.id, full_name: trainee.full_name, trainee_number: trainee.trainee_number });
            queryClient.invalidateQueries({ queryKey: ['trainees'] });
            queryClient.invalidateQueries({ queryKey: ['trainee-options'] });
            toast.success('Trainee record created successfully.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        createTraineeMutation.mutate();
    };

    if (createdTrainee) {
        return (
            <div className="mx-auto max-w-2xl py-12">
                <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="h-10 w-10" />
                    </div>

                    <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-900">Trainee Registered Successfully!</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Trainee record created for <strong className="text-slate-900">{createdTrainee.full_name}</strong> (<span className="font-mono font-bold text-viva-blue">{createdTrainee.trainee_number}</span>).
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                            type="button"
                            onClick={() => navigate(`/trainees/${createdTrainee.id}`)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-viva-blue px-6 py-3 font-display text-sm font-bold text-white shadow-md hover:bg-slate-900"
                        >
                            <User className="h-4 w-4" />
                            <span>View Trainee Profile</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/enroll', { state: { traineeId: createdTrainee.id } })}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-viva-blue/30 bg-viva-blue/5 px-6 py-3 font-display text-sm font-bold text-viva-blue hover:bg-viva-blue hover:text-white"
                        >
                            <BookOpen className="h-4 w-4" />
                            <span>Enroll into Cohort Now</span>
                        </button>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-6">
                        <button
                            type="button"
                            onClick={() => {
                                setCreatedTrainee(null);
                                setForm(blankForm);
                                setRegistrationForm(null);
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline"
                        >
                            + Register Another Trainee
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link to="/trainees" className="inline-flex items-center gap-1.5 text-xs font-bold text-viva-blue hover:underline">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Trainees Directory
                </Link>
                <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">Register New Trainee</h1>
                <p className="mt-1 text-sm text-slate-500">Fill in the comprehensive student details below to create a new trainee record.</p>
            </div>

            {/* Full-width Form Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Basic Information */}
                    <div>
                        <h2 className="font-display text-lg font-bold text-ink border-b pb-2">1. Basic Information</h2>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="sm:col-span-2">
                                <label htmlFor="full_name" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="full_name"
                                    name="full_name"
                                    type="text"
                                    required
                                    placeholder="Enter full legal name"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.full_name}
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="date_of_birth" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Date of Birth <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="date_of_birth"
                                    name="date_of_birth"
                                    type="date"
                                    required
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.date_of_birth}
                                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="gender" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Gender <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="gender"
                                    name="gender"
                                    required
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.gender}
                                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <label htmlFor="occupation" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Occupation / Student Status
                                </label>
                                <input
                                    id="occupation"
                                    name="occupation"
                                    type="text"
                                    placeholder="e.g. High School Student, Accountant, Self-Employed"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.occupation}
                                    onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Contact & Billing Details */}
                    <div>
                        <h2 className="font-display text-lg font-bold text-ink border-b pb-2">2. Contact & Billing Information</h2>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    required
                                    placeholder="+255 7XX XXX XXX"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Email Address <span className="font-normal text-slate-400">(Optional)</span>
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="student@example.com"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="tin" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Customer TIN <span className="font-normal text-slate-400">(Optional for EFD Invoices)</span>
                                </label>
                                <input
                                    id="tin"
                                    name="tin"
                                    type="text"
                                    placeholder="9-digit TIN number"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.tin}
                                    onChange={(e) => setForm({ ...form, tin: e.target.value })}
                                />
                            </div>

                            <div className="sm:col-span-2 lg:col-span-3">
                                <label htmlFor="address" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Physical Residential Address <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="address"
                                    name="address"
                                    required
                                    rows={2}
                                    placeholder="Street name, District, Region (e.g. Mikocheni B, Kinondoni, Dar es Salaam)"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Document Upload */}
                    <div>
                        <h2 className="font-display text-lg font-bold text-ink border-b pb-2">3. Scanned Registration Form</h2>
                        <div className="mt-4">
                            <label htmlFor="registration_form" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                Scanned Registration Form File <span className="font-normal text-slate-400">(PDF, Maximum 5 MB)</span>
                            </label>
                            <input
                                id="registration_form"
                                name="registration_form"
                                type="file"
                                accept="application/pdf"
                                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-viva-blue file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-slate-900"
                                onChange={(e) => setRegistrationForm(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>

                    {/* Section 4: Emergency Contact Details */}
                    <div className="rounded-2xl bg-slate-50 p-6">
                        <h2 className="font-display text-lg font-bold text-ink border-b border-slate-200 pb-2">
                            4. Emergency Contact Details <span className="text-xs font-normal text-slate-500">(Required for Minors/Kids)</span>
                        </h2>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="emergency_name" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Contact Person Full Name
                                </label>
                                <input
                                    id="emergency_name"
                                    name="emergency_name"
                                    type="text"
                                    placeholder="Parent or Guardian name"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.emergency_name}
                                    onChange={(e) => setForm({ ...form, emergency_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="emergency_relationship" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Relationship to Trainee
                                </label>
                                <input
                                    id="emergency_relationship"
                                    name="emergency_relationship"
                                    type="text"
                                    placeholder="e.g. Father, Mother, Sponsor, Admin"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.emergency_relationship}
                                    onChange={(e) => setForm({ ...form, emergency_relationship: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="emergency_phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Primary Emergency Phone
                                </label>
                                <input
                                    id="emergency_phone"
                                    name="emergency_phone"
                                    type="tel"
                                    placeholder="+255 7XX XXX XXX"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.emergency_phone}
                                    onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="emergency_alternate_phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Alternate Emergency Phone <span className="font-normal text-slate-400">(Optional)</span>
                                </label>
                                <input
                                    id="emergency_alternate_phone"
                                    name="emergency_alternate_phone"
                                    type="tel"
                                    placeholder="+255 7XX XXX XXX"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                    value={form.emergency_alternate_phone}
                                    onChange={(e) => setForm({ ...form, emergency_alternate_phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row sm:justify-end">
                        <Link
                            to="/trainees"
                            className="inline-flex justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-display text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            disabled={createTraineeMutation.isPending}
                            className="inline-flex justify-center items-center gap-2 rounded-xl bg-viva-blue px-8 py-3.5 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition hover:bg-slate-900 disabled:opacity-50"
                        >
                            <UserPlus className="h-4 w-4" />
                            <span>{createTraineeMutation.isPending ? 'Creating Trainee Record...' : 'Create Trainee Record'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
