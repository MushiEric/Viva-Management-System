import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    ArrowRightLeft,
    CreditCard,
    Download,
    FileText,
    GraduationCap,
    Mail,
    Pencil,
    Phone,
    ShieldAlert,
    Trash2,
    User,
    UserRound,
    X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { confirmToast } from '../components/ConfirmToast';

interface Trainee {
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
    created_at?: string;
    emergency_contact: EmergencyContact | null;
    enrollments: Enrollment[];
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
        schedule_days?: { day_of_week: string; start_time: string; end_time: string }[];
    };
}

interface InvoiceItem {
    id: number;
    description: string;
    amount: string;
}

interface Invoice {
    id: number;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    status: string;
    total_amount: string;
    paid_amount: string;
    balance: string;
    items?: InvoiceItem[];
}

interface Payment {
    id: number;
    receipt_number: string;
    payment_date: string;
    payment_method: string;
    amount: string;
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

export default function TraineeProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const canManage = user?.role === 'manager' || user?.role === 'admin';
    const traineeId = Number(id);

    const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'finance'>('overview');
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(blankForm);
    const [registrationForm, setRegistrationForm] = useState<File | null>(null);
    const [transferModal, setTransferModal] = useState<{ enrollment_id: number; cohort_id: number; reason: string } | null>(null);

    const detailQuery = useQuery({
        queryKey: ['trainee', traineeId],
        queryFn: () => api.getTrainee(traineeId),
        enabled: !!traineeId,
    });

    const timetableQuery = useQuery({
        queryKey: ['timetable'],
        queryFn: api.getTimetable,
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['trainee', traineeId] });
        queryClient.invalidateQueries({ queryKey: ['trainees'] });
        queryClient.invalidateQueries({ queryKey: ['timetable'] });
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

            return api.updateTrainee(traineeId, payload);
        },
        onSuccess: () => {
            setEditing(false);
            setRegistrationForm(null);
            refresh();
            toast.success('Trainee profile updated successfully.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const deactivateMutation = useMutation({
        mutationFn: api.deactivateTrainee,
        onSuccess: () => {
            refresh();
            toast.success('Trainee record deactivated.');
            navigate('/trainees');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const transferMutation = useMutation({
        mutationFn: () => api.transferEnrollment(transferModal!.enrollment_id, transferModal!.cohort_id, transferModal!.reason),
        onSuccess: () => {
            setTransferModal(null);
            refresh();
            toast.success('Enrollment transferred successfully.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const detail = detailQuery.data?.data;
    const trainee = detail?.trainee as Trainee | undefined;
    const invoices = (detail?.invoices || []) as Invoice[];
    const payments = (detail?.payments || []) as Payment[];
    const cohorts = (timetableQuery.data?.data || []) as TimetableCohort[];

    useEffect(() => {
        if (!trainee || !editing) return;
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
    }, [trainee, editing]);

    if (detailQuery.isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-viva-blue border-t-transparent" />
            </div>
        );
    }

    if (detailQuery.isError || !trainee) {
        return (
            <div className="py-16 text-center">
                <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-red-500" />
                <h2 className="font-display text-2xl font-bold text-ink">Trainee Not Found</h2>
                <p className="mt-1 text-sm text-slate-500">The requested trainee record does not exist or has been removed.</p>
                <Link to="/trainees" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-viva-blue px-4 py-2.5 font-display text-sm font-bold text-white shadow-md">
                    <ArrowLeft className="h-4 w-4" /> Back to Trainees List
                </Link>
            </div>
        );
    }

    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
    const totalBalance = totalInvoiced - totalPaid;

    const handleFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        updateMutation.mutate();
    };

    return (
        <div className="space-y-6">
            {/* Header Breadcrumb & Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Link to="/trainees" className="inline-flex items-center gap-1.5 text-xs font-bold text-viva-blue hover:underline">
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to Trainees List
                    </Link>
                    <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">{trainee.full_name}</h1>
                    <p className="mt-0.5 text-xs text-slate-500">Trainee ID: <span className="font-mono font-bold text-slate-700">{trainee.trainee_number}</span></p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {trainee.registration_form_path && (
                        <button
                            type="button"
                            onClick={() => api.downloadTraineeRegistrationForm(trainee.id, trainee.trainee_number)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            <Download className="h-4 w-4 text-viva-blue" />
                            <span>Download Form PDF</span>
                        </button>
                    )}

                    {canManage && (
                        <>
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-viva-blue px-4 py-2 text-xs font-bold text-white shadow-md shadow-viva-blue/20 transition hover:bg-slate-900"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Edit Profile</span>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    confirmToast({
                                        title: `Deactivate ${trainee.full_name}?`,
                                        message: 'This will hide the trainee record from active selection. Trainees with active enrollments cannot be deactivated.',
                                        confirmLabel: 'Deactivate Trainee',
                                        onConfirm: () => deactivateMutation.mutate(trainee.id),
                                    })
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-50"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Deactivate</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Profile Overview Card */}
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-viva-blue/10 text-viva-blue">
                        <UserRound className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-base font-extrabold text-ink">{trainee.full_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{trainee.gender} · {trainee.occupation || 'Student'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Phone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
                        <p className="truncate text-xs font-bold text-slate-700">{trainee.phone || 'Not provided'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                        <p className="truncate text-xs font-bold text-slate-700">{trainee.email || 'Not provided'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Enrollments</p>
                        <p className="text-xs font-bold text-slate-700">{trainee.enrollments.length} Course(s)</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 border-b-2 px-6 py-3 font-display text-sm font-bold transition-colors ${activeTab === 'overview' ? 'border-viva-blue text-viva-blue' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                >
                    <User className="h-4 w-4" />
                    <span>Personal Details & Emergency</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('academic')}
                    className={`flex items-center gap-2 border-b-2 px-6 py-3 font-display text-sm font-bold transition-colors ${activeTab === 'academic' ? 'border-viva-blue text-viva-blue' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                >
                    <GraduationCap className="h-4 w-4" />
                    <span>Academic & Enrollments ({trainee.enrollments.length})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('finance')}
                    className={`flex items-center gap-2 border-b-2 px-6 py-3 font-display text-sm font-bold transition-colors ${activeTab === 'finance' ? 'border-viva-blue text-viva-blue' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                >
                    <CreditCard className="h-4 w-4" />
                    <span>Financial History</span>
                </button>
            </div>

            {/* Tab 1: Overview & Personal Details */}
            {activeTab === 'overview' && (
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="font-display text-lg font-bold text-ink">Personal Information</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{trainee.full_name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date of Birth</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{trainee.date_of_birth}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender</p>
                                <p className="mt-1 text-sm font-semibold capitalize text-slate-800">{trainee.gender}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer TIN</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{trainee.tin || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{trainee.phone || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{trainee.email || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Occupation</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{trainee.occupation || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{trainee.address || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="font-display text-lg font-bold text-ink">Emergency Contact Details</h2>
                            {trainee.emergency_contact ? (
                                <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-slate-900">{trainee.emergency_contact.full_name}</p>
                                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-viva-blue">{trainee.emergency_contact.relationship}</span>
                                    </div>
                                    <p className="text-xs text-slate-600"><strong>Primary Phone:</strong> {trainee.emergency_contact.phone}</p>
                                    {trainee.emergency_contact.alternate_phone && (
                                        <p className="text-xs text-slate-600"><strong>Alternate Phone:</strong> {trainee.emergency_contact.alternate_phone}</p>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-4 text-xs text-slate-400">No emergency contact information recorded.</p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="font-display text-lg font-bold text-ink">Registration Form Attachment</h2>
                            {trainee.registration_form_path ? (
                                <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50/60 p-4">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-6 w-6 text-viva-blue" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">Scanned PDF Form</p>
                                            <p className="text-[10px] text-slate-500">Official signed registration document</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => api.downloadTraineeRegistrationForm(trainee.id, trainee.trainee_number)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-viva-blue px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                                    >
                                        <Download className="h-3.5 w-3.5" /> Download
                                    </button>
                                </div>
                            ) : (
                                <p className="mt-4 text-xs text-slate-400">No scanned PDF registration document uploaded.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Academic & Enrollments */}
            {activeTab === 'academic' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-xl font-bold text-ink">Enrolled Cohorts ({trainee.enrollments.length})</h2>
                        <Link to="/enroll" className="inline-flex items-center gap-1.5 rounded-xl bg-viva-blue px-4 py-2 font-display text-xs font-bold text-white shadow-md">
                            + Enroll in New Course
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {trainee.enrollments.map((enrollment) => (
                            <div key={enrollment.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${enrollment.status === 'active' || enrollment.status === 'ongoing' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                                {enrollment.status}
                                            </span>
                                            <span className="text-xs text-slate-400">Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="mt-2 font-display text-lg font-bold text-ink">
                                            {enrollment.cohort.program_level?.program.name || 'Training Course'} — {enrollment.cohort.program_level?.name || enrollment.cohort.name}
                                        </h3>
                                        <p className="mt-0.5 text-xs font-medium text-slate-500">Cohort: {enrollment.cohort.name}</p>
                                    </div>

                                    {canManage && ['pending', 'active', 'ongoing'].includes(enrollment.status) && (
                                        <button
                                            type="button"
                                            onClick={() => setTransferModal({ enrollment_id: enrollment.id, cohort_id: 0, reason: '' })}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-viva-blue/30 bg-viva-blue/5 px-4 py-2 text-xs font-bold text-viva-blue hover:bg-viva-blue hover:text-white"
                                        >
                                            <ArrowRightLeft className="h-4 w-4" /> Transfer Cohort
                                        </button>
                                    )}
                                </div>

                                <div className="mt-6 border-t border-slate-100 pt-4">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-slate-600">Learning Progress</span>
                                        <span className="text-viva-blue">{enrollment.progress_percentage}%</span>
                                    </div>
                                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full bg-viva-blue transition-all duration-300" style={{ width: `${Math.min(100, Number(enrollment.progress_percentage || 0))}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!trainee.enrollments.length && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
                                <GraduationCap className="mx-auto mb-3 h-10 w-10" />
                                <p className="font-semibold">No course enrollments found for this trainee.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 3: Financial History */}
            {activeTab === 'finance' && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Invoiced</p>
                            <p className="mt-1 text-2xl font-extrabold text-ink">TZS {totalInvoiced.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Paid</p>
                            <p className="mt-1 text-2xl font-extrabold text-emerald-700">TZS {totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Balance Due</p>
                            <p className="mt-1 text-2xl font-extrabold text-amber-700">TZS {totalBalance.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="font-display text-lg font-bold text-ink">Invoices ({invoices.length})</h2>
                        {invoices.length > 0 ? (
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        <tr>
                                            <th className="p-3">Invoice #</th>
                                            <th className="p-3">Issue Date</th>
                                            <th className="p-3">Total Amount</th>
                                            <th className="p-3">Paid Amount</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 text-right">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {invoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-mono font-bold text-slate-800">{inv.invoice_number}</td>
                                                <td className="p-3 text-xs text-slate-600">{inv.issue_date}</td>
                                                <td className="p-3 font-bold text-slate-900">TZS {Number(inv.total_amount).toLocaleString()}</td>
                                                <td className="p-3 text-emerald-600 font-bold">TZS {Number(inv.paid_amount).toLocaleString()}</td>
                                                <td className="p-3">
                                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button type="button" onClick={() => api.downloadInvoice(inv.id, inv.invoice_number)} className="text-viva-blue hover:underline">
                                                        <Download className="inline h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="mt-4 text-xs text-slate-400">No invoices recorded for this trainee.</p>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="font-display text-lg font-bold text-ink">Payment Receipts ({payments.length})</h2>
                        {payments.length > 0 ? (
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        <tr>
                                            <th className="p-3">Receipt #</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Method</th>
                                            <th className="p-3">Amount</th>
                                            <th className="p-3 text-right">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {payments.map((pay) => (
                                            <tr key={pay.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-mono font-bold text-slate-800">{pay.receipt_number}</td>
                                                <td className="p-3 text-xs text-slate-600">{pay.payment_date}</td>
                                                <td className="p-3 text-xs uppercase text-slate-700">{pay.payment_method}</td>
                                                <td className="p-3 font-extrabold text-emerald-700">TZS {Number(pay.amount).toLocaleString()}</td>
                                                <td className="p-3 text-right">
                                                    <button type="button" onClick={() => api.downloadReceipt(pay.id, pay.receipt_number)} className="text-viva-blue hover:underline">
                                                        <Download className="inline h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="mt-4 text-xs text-slate-400">No payment receipts found for this trainee.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Profile Modal */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h2 className="font-display text-xl font-bold text-ink">Edit Profile: {trainee.full_name}</h2>
                            <button type="button" onClick={() => setEditing(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Full Name
                                    <input required className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Date of Birth
                                    <input required type="date" className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Gender
                                    <select className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Phone Number
                                    <input required className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Email Address
                                    <input type="email" className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500">
                                    Customer TIN
                                    <input className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800" value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500 md:col-span-2">
                                    Occupation
                                    <input className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500 md:col-span-2">
                                    Address
                                    <textarea required rows={2} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold uppercase text-slate-500 md:col-span-2">
                                    Upload/Replace Registration Form PDF (Max 5MB)
                                    <input type="file" accept="application/pdf" className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs" onChange={(e) => setRegistrationForm(e.target.files?.[0] || null)} />
                                </label>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="mb-3 text-xs font-bold uppercase text-slate-500">Emergency Contact</p>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="Emergency contact name" value={form.emergency_name} onChange={(e) => setForm({ ...form, emergency_name: e.target.value })} />
                                    <input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="Relationship" value={form.emergency_relationship} onChange={(e) => setForm({ ...form, emergency_relationship: e.target.value })} />
                                    <input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="Emergency phone" value={form.emergency_phone} onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} />
                                    <input className="rounded-xl border border-slate-200 p-3 text-sm" placeholder="Alternate phone" value={form.emergency_alternate_phone} onChange={(e) => setForm({ ...form, emergency_alternate_phone: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setEditing(false)} className="rounded-xl border px-5 py-2.5 font-bold text-slate-700">Cancel</button>
                                <button disabled={updateMutation.isPending} className="rounded-xl bg-viva-blue px-6 py-2.5 font-bold text-white shadow-md disabled:opacity-50">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Enrollment Modal */}
            {transferModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h2 className="font-display text-lg font-bold text-ink">Transfer Enrollment</h2>
                            <button type="button" onClick={() => setTransferModal(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Select Target Cohort</label>
                                <select
                                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold"
                                    value={transferModal.cohort_id}
                                    onChange={(e) => setTransferModal({ ...transferModal, cohort_id: Number(e.target.value) })}
                                >
                                    <option value={0}>Choose a target cohort...</option>
                                    {cohorts.filter((c) => c.capacity.status !== 'full').map((c) => (
                                        <option key={c.cohort_id} value={c.cohort_id}>
                                            {c.course.parent_course || c.course.name} — {c.cohort_name} ({c.capacity.available_seats} seats free)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Reason for Transfer</label>
                                <input
                                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"
                                    placeholder="Enter reason for cohort transfer..."
                                    value={transferModal.reason}
                                    onChange={(e) => setTransferModal({ ...transferModal, reason: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setTransferModal(null)} className="rounded-xl border px-4 py-2 font-bold text-slate-700">Cancel</button>
                                <button
                                    disabled={!transferModal.cohort_id || !transferModal.reason || transferMutation.isPending}
                                    onClick={() => transferMutation.mutate()}
                                    className="rounded-xl bg-viva-blue px-5 py-2 font-bold text-white shadow-md disabled:opacity-50"
                                >
                                    Confirm Transfer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
