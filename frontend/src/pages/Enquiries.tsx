import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    CheckCircle2,
    Clock3,
    Inbox,
    Mail,
    MessageSquareText,
    Phone,
    Search,
} from 'lucide-react';
import { api } from '../services/api';

interface ContactInquiry {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    program_of_interest: string | null;
    message: string;
    status: 'new' | 'in_progress' | 'contacted' | 'closed';
    created_at: string;
}

interface InquirySummary {
    total: number;
    new: number;
    in_progress: number;
    contacted: number;
    closed: number;
}

const statuses = [
    { value: 'new', label: 'New' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'closed', label: 'Closed' },
];

const statusStyles: Record<ContactInquiry['status'], string> = {
    new: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-amber-50 text-amber-700',
    contacted: 'bg-green-50 text-green-700',
    closed: 'bg-slate-100 text-slate-600',
};

export default function Enquiries() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);

    const enquiriesQuery = useQuery({
        queryKey: ['contact-inquiries', search, status, page],
        queryFn: () => api.getContactInquiries(search, status, page),
    });

    const updateStatus = useMutation({
        mutationFn: ({ inquiryId, nextStatus }: { inquiryId: number; nextStatus: string }) =>
            api.updateContactInquiryStatus(inquiryId, nextStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contact-inquiries'] });
            toast.success('Enquiry status updated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const responseData = enquiriesQuery.data?.data;
    const paginator = responseData?.inquiries;
    const inquiries = (paginator?.data || []) as ContactInquiry[];
    const summary = (responseData?.summary || {
        total: 0,
        new: 0,
        in_progress: 0,
        contacted: 0,
        closed: 0,
    }) as InquirySummary;

    const applyStatus = (value: string) => {
        setStatus(value);
        setPage(1);
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold text-ink">Website Enquiries</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Review contact requests submitted through the VIVA Digital Center website.
                </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Total Enquiries', summary.total, Inbox, 'text-viva-blue'],
                    ['New', summary.new, MessageSquareText, 'text-blue-600'],
                    ['In Progress', summary.in_progress, Clock3, 'text-amber-600'],
                    ['Contacted', summary.contacted, CheckCircle2, 'text-green-600'],
                ].map(([label, value, Icon, color]: any) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <Icon className={`mb-3 h-6 w-6 ${color}`} />
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className="mt-1 text-3xl font-extrabold text-ink">{value}</p>
                    </div>
                ))}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                    <label className="relative">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search name, email, phone, or program"
                            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none transition focus:border-viva-blue"
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) => applyStatus(event.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-viva-blue"
                    >
                        <option value="">All statuses</option>
                        {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </div>
            </section>

            {enquiriesQuery.isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                    Loading enquiries...
                </div>
            ) : enquiriesQuery.isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
                    {(enquiriesQuery.error as Error).message}
                </div>
            ) : inquiries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <Inbox className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-bold text-slate-600">No enquiries found</p>
                    <p className="mt-1 text-sm text-slate-400">New website submissions will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {inquiries.map((inquiry) => (
                        <article key={inquiry.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-display text-lg font-bold text-ink">{inquiry.name}</h2>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[inquiry.status]}`}>
                                            {statuses.find((item) => item.value === inquiry.status)?.label}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Received {new Date(inquiry.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <select
                                    value={inquiry.status}
                                    disabled={updateStatus.isPending}
                                    onChange={(event) => updateStatus.mutate({
                                        inquiryId: inquiry.id,
                                        nextStatus: event.target.value,
                                    })}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-viva-blue disabled:opacity-50"
                                >
                                    {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                </select>
                            </div>

                            <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                                <a href={`mailto:${inquiry.email}`} className="flex items-center gap-2 text-viva-blue hover:underline">
                                    <Mail className="h-4 w-4" /> {inquiry.email}
                                </a>
                                {inquiry.phone && (
                                    <a href={`tel:${inquiry.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-viva-blue">
                                        <Phone className="h-4 w-4" /> {inquiry.phone}
                                    </a>
                                )}
                                <p className="font-semibold text-slate-600">
                                    {inquiry.program_of_interest || 'Program not specified'}
                                </p>
                            </div>

                            <div className="mt-5 rounded-xl bg-slate-50 p-4">
                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{inquiry.message}</p>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {paginator && paginator.last_page > 1 && (
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">
                        Page {paginator.current_page} of {paginator.last_page}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={paginator.current_page <= 1}
                            onClick={() => setPage((current) => current - 1)}
                            className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            disabled={paginator.current_page >= paginator.last_page}
                            onClick={() => setPage((current) => current + 1)}
                            className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
