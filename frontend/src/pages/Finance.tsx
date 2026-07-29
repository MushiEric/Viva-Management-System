import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { AlertCircle, BadgeDollarSign, Banknote, CheckCircle2, Download, Eye, FileText, Printer, ReceiptText, X, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Trainee {
    id: number;
    trainee_number: string;
    full_name: string;
}

interface Enrollment {
    id: number;
    status: string;
    cohort: {
        name: string;
        program_level?: {
            name: string;
            fee_tzs: string;
            fee_status: string;
            program: { name: string };
        };
    };
}

interface Discount {
    id: number;
    amount: string;
    reason: string;
    status: string;
}

interface Invoice {
    id: number;
    invoice_number: string;
    trainee_id: number;
    trainee: Trainee;
    status: string;
    subtotal: string;
    discount_amount: string;
    total: string;
    amount_paid: string;
    due_date: string | null;
    discount_requests: Discount[];
}

interface Payment {
    id: number;
    receipt_number: string;
    trainee: Trainee;
    amount: string;
    method: string;
    provider: string | null;
    reference_number: string | null;
    status: string;
    paid_at: string;
}

const money = (amount: string | number) => `TZS ${Number(amount).toLocaleString()}`;

export default function Finance() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const isManager = user?.role === 'manager';
    const [traineeId, setTraineeId] = useState(0);
    const [invoiceAmounts, setInvoiceAmounts] = useState<Record<number, string>>({});
    const [dueDate, setDueDate] = useState('');
    const [paymentTraineeId, setPaymentTraineeId] = useState(0);
    const [allocations, setAllocations] = useState<Record<number, string>>({});
    const [payment, setPayment] = useState({ method: 'cash', provider: '', reference_number: '' });
    const [discounts, setDiscounts] = useState<Record<number, { amount: string; reason: string }>>({});
    const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);

    const financeQuery = useQuery({ queryKey: ['finance'], queryFn: api.getFinance });
    const traineesQuery = useQuery({ queryKey: ['trainees'], queryFn: () => api.getTrainees() });
    const traineeDetailQuery = useQuery({ queryKey: ['finance-trainee', traineeId], queryFn: () => api.getTrainee(traineeId), enabled: !!traineeId });
    const invoicePreviewQuery = useQuery({
        queryKey: ['invoice-preview', previewInvoiceId],
        queryFn: () => api.getInvoice(previewInvoiceId!),
        enabled: previewInvoiceId !== null,
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['finance'] });
    const done = (message: string) => { refresh(); toast.success(message); };
    const failed = (error: Error) => toast.error(error.message);

    const createInvoice = useMutation({
        mutationFn: () => api.createInvoice({
            trainee_id: traineeId,
            due_date: dueDate || null,
            items: Object.entries(invoiceAmounts)
                .filter(([, amount]) => Number(amount) > 0)
                .map(([enrollmentId, amount]) => {
                    const enrollments = (traineeDetailQuery.data?.data?.trainee.enrollments ?? []) as Enrollment[];
                    const enrollment = enrollments.find((item) => item.id === Number(enrollmentId));
                    return {
                        enrollment_id: Number(enrollmentId),
                        description: `${enrollment?.cohort.program_level?.program.name || 'Program'} — ${enrollment?.cohort.program_level?.name || enrollment?.cohort.name}`,
                        amount: Number(amount),
                    };
                }),
        }),
        onSuccess: () => {
            setInvoiceAmounts({});
            done('Draft invoice created. Issue it before recording a payment.');
        },
        onError: failed,
    });
    const issueInvoice = useMutation({ mutationFn: api.issueInvoice, onSuccess: () => done('Invoice issued and email queued.'), onError: failed });
    const requestDiscount = useMutation({
        mutationFn: (invoiceId: number) => api.requestDiscount(invoiceId, Number(discounts[invoiceId]?.amount), discounts[invoiceId]?.reason),
        onSuccess: () => done('Discount submitted for Manager approval.'),
        onError: failed,
    });
    const approveDiscount = useMutation({ mutationFn: api.approveDiscount, onSuccess: () => done('Discount approved.'), onError: failed });
    const recordPayment = useMutation({
        mutationFn: () => {
            const selected = Object.entries(allocations).filter(([, amount]) => Number(amount) > 0);
            return api.recordPayment({
                trainee_id: paymentTraineeId,
                amount: selected.reduce((sum, [, amount]) => sum + Number(amount), 0),
                method: payment.method,
                provider: payment.provider || null,
                reference_number: payment.reference_number || null,
                allocations: selected.map(([invoiceId, amount]) => ({ invoice_id: Number(invoiceId), amount: Number(amount) })),
            });
        },
        onSuccess: () => {
            setAllocations({});
            done('Payment recorded and receipt generated.');
        },
        onError: failed,
    });
    const cancelPayment = useMutation({
        mutationFn: (paymentId: number) => api.cancelPayment(paymentId, window.prompt('Cancellation reason') || ''),
        onSuccess: () => done('Payment cancelled and balances restored.'),
        onError: failed,
    });

    const data = financeQuery.data?.data;
    const invoices = (data?.invoices || []) as Invoice[];
    const payments = (data?.payments || []) as Payment[];
    const trainees = (traineesQuery.data?.data?.data || []) as Trainee[];
    const enrollments = (traineeDetailQuery.data?.data?.trainee?.enrollments || []) as Enrollment[];
    const activeEnrollments = enrollments.filter((item) => !['cancelled', 'withdrawn'].includes(item.status));
    const paymentInvoices = invoices.filter((invoice) => invoice.trainee_id === paymentTraineeId && ['issued', 'partially_paid', 'overdue'].includes(invoice.status));
    const traineeInvoices = invoices.filter((invoice) => invoice.trainee_id === paymentTraineeId);
    const hasInvoiceAmount = Object.values(invoiceAmounts).some((value) => Number(value) > 0);
    const hasPaymentAllocation = Object.values(allocations).some((value) => Number(value) > 0);

    useEffect(() => {
        const loadedEnrollments = (
            traineeDetailQuery.data?.data?.trainee?.enrollments || []
        ).filter((item: Enrollment) => !['cancelled', 'withdrawn'].includes(item.status)) as Enrollment[];

        if (!traineeId || loadedEnrollments.length === 0) {
            return;
        }

        setInvoiceAmounts((current) => {
            if (Object.keys(current).length > 0) {
                return current;
            }

            return loadedEnrollments.reduce<Record<number, string>>((amounts, enrollment) => {
                const fee = enrollment.cohort.program_level?.fee_tzs;
                if (Number(fee) > 0) {
                    amounts[enrollment.id] = String(fee);
                }

                return amounts;
            }, {});
        });
    }, [traineeDetailQuery.data, traineeId]);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold">Finance Management</h1>
                <p className="mt-1 text-sm text-slate-500">TZS invoices, installments, mobile-money references, discounts, receipts, and outstanding balances.</p>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
                {[['Total Invoiced', data?.summary.invoiced || 0, FileText], ['Payments Applied', data?.summary.paid || 0, Banknote], ['Outstanding Balance', data?.summary.outstanding || 0, BadgeDollarSign]].map(([label, value, Icon]: any) => (
                    <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><Icon className="mb-3 h-6 w-6 text-viva-blue" /><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold">{money(value)}</p></div>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold">Create Multi-Program Invoice</h2>
                    <select className="w-full rounded-xl border p-3" value={traineeId} onChange={(event) => { setTraineeId(Number(event.target.value)); setInvoiceAmounts({}); }}>
                        <option value={0}>Select trainee</option>{trainees.map((trainee) => <option key={trainee.id} value={trainee.id}>{trainee.trainee_number} — {trainee.full_name}</option>)}
                    </select>
                    <input type="date" className="w-full rounded-xl border p-3" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                    {traineeId > 0 && !traineeDetailQuery.isLoading && activeEnrollments.length === 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <div className="flex gap-3">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                <div>
                                    <p className="font-bold">This trainee has no active enrollment.</p>
                                    <p className="mt-1">Enroll the trainee in a cohort before creating an invoice.</p>
                                    <Link to="/enroll" className="mt-2 inline-block font-bold text-viva-blue hover:underline">Go to Enroll Student</Link>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeEnrollments.map((enrollment) => (
                        <div key={enrollment.id} className="grid grid-cols-[1fr_180px] gap-3 rounded-xl bg-slate-50 p-3">
                            <div>
                                <p className="text-sm font-bold">{enrollment.cohort.program_level?.program.name || 'Program'} — {enrollment.cohort.program_level?.name || enrollment.cohort.name}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Program fee: {money(enrollment.cohort.program_level?.fee_tzs || 0)}
                                </p>
                            </div>
                            <input type="number" min="0" className="rounded-lg border p-2" placeholder="Amount TZS" value={invoiceAmounts[enrollment.id] || ''} onChange={(event) => setInvoiceAmounts({ ...invoiceAmounts, [enrollment.id]: event.target.value })} />
                        </div>
                    ))}
                    <button disabled={!traineeId || !hasInvoiceAmount || createInvoice.isPending} onClick={() => createInvoice.mutate()} className="rounded-xl bg-viva-blue px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                        {createInvoice.isPending ? 'Creating...' : 'Create Draft Invoice'}
                    </button>
                    {traineeId > 0 && activeEnrollments.length > 0 && !hasInvoiceAmount && (
                        <p className="text-xs font-semibold text-amber-700">Enter an amount for at least one enrollment.</p>
                    )}
                </section>

                <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold">Record Installment or Payment</h2>
                    <select className="w-full rounded-xl border p-3" value={paymentTraineeId} onChange={(event) => { setPaymentTraineeId(Number(event.target.value)); setAllocations({}); }}>
                        <option value={0}>Select trainee</option>{trainees.map((trainee) => <option key={trainee.id} value={trainee.id}>{trainee.full_name}</option>)}
                    </select>
                    {paymentTraineeId > 0 && paymentInvoices.length === 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <div className="flex gap-3">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                <div>
                                    <p className="font-bold">No issued invoice is available for payment.</p>
                                    <p className="mt-1">
                                        {traineeInvoices.some((invoice) => invoice.status === 'draft')
                                            ? 'A draft exists. Click Issue in the invoice table below before recording payment.'
                                            : 'Create a draft invoice first, then issue it before recording payment.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {paymentInvoices.map((invoice) => <div key={invoice.id} className="grid grid-cols-[1fr_160px] gap-3 rounded-xl bg-slate-50 p-3"><p className="text-sm"><strong>{invoice.invoice_number}</strong><br />Outstanding {money(Number(invoice.total) - Number(invoice.amount_paid))}</p><input type="number" min="0" className="rounded-lg border p-2" placeholder="Allocate TZS" value={allocations[invoice.id] || ''} onChange={(event) => setAllocations({ ...allocations, [invoice.id]: event.target.value })} /></div>)}
                    <div className="grid grid-cols-2 gap-3"><select className="rounded-xl border p-3" value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value })}><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option></select><input className="rounded-xl border p-3" placeholder="Provider" disabled={payment.method === 'cash'} value={payment.provider} onChange={(event) => setPayment({ ...payment, provider: event.target.value })} /></div>
                    <input className="w-full rounded-xl border p-3" placeholder="Transaction reference" disabled={payment.method === 'cash'} value={payment.reference_number} onChange={(event) => setPayment({ ...payment, reference_number: event.target.value })} />
                    <button disabled={!hasPaymentAllocation || recordPayment.isPending} onClick={() => recordPayment.mutate()} className="rounded-xl bg-viva-green px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                        {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
                    </button>
                    {paymentInvoices.length > 0 && !hasPaymentAllocation && (
                        <p className="text-xs font-semibold text-amber-700">Enter the amount to allocate to at least one invoice.</p>
                    )}
                </section>
            </div>

            <section className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
                <h2 className="p-5 font-display text-lg font-bold">Invoices</h2>
                <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Invoice</th><th className="p-4">Trainee</th><th className="p-4">Total</th><th className="p-4">Paid</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead>
                    <tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-t"><td className="p-4 font-bold">{invoice.invoice_number}</td><td className="p-4">{invoice.trainee.full_name}</td><td className="p-4">{money(invoice.total)}</td><td className="p-4">{money(invoice.amount_paid)}</td><td className="p-4">{invoice.status}</td><td className="p-4"><div className="flex flex-wrap gap-2">{invoice.status === 'draft' && <button onClick={() => issueInvoice.mutate(invoice.id)} className="rounded-lg bg-viva-blue px-3 py-2 text-xs font-bold text-white">Issue</button>}<button onClick={() => setPreviewInvoiceId(invoice.id)} className="rounded-lg border border-viva-blue px-3 py-2 text-xs font-bold text-viva-blue"><Eye className="mr-1 inline h-3 w-3" />Preview</button>{!['paid', 'cancelled'].includes(invoice.status) && <><input className="w-24 rounded-lg border p-2 text-xs" placeholder="Discount" value={discounts[invoice.id]?.amount || ''} onChange={(event) => setDiscounts({ ...discounts, [invoice.id]: { amount: event.target.value, reason: discounts[invoice.id]?.reason || '' } })} /><input className="w-40 rounded-lg border p-2 text-xs" placeholder="Reason" value={discounts[invoice.id]?.reason || ''} onChange={(event) => setDiscounts({ ...discounts, [invoice.id]: { amount: discounts[invoice.id]?.amount || '', reason: event.target.value } })} /><button onClick={() => requestDiscount.mutate(invoice.id)} className="rounded-lg border px-3 py-2 text-xs font-bold">Request</button></>}{isManager && invoice.discount_requests.filter((item) => item.status === 'pending').map((discount) => <button key={discount.id} onClick={() => approveDiscount.mutate(discount.id)} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="mr-1 inline h-3 w-3" />Approve {money(discount.amount)}</button>)}</div></td></tr>)}</tbody>
                </table>
            </section>

            <section className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
                <h2 className="flex items-center gap-2 p-5 font-display text-lg font-bold"><ReceiptText className="h-5 w-5" />Payment Receipts</h2>
                <table className="w-full text-left text-sm"><tbody>{payments.map((item) => <tr key={item.id} className="border-t"><td className="p-4 font-bold">{item.receipt_number}</td><td className="p-4">{item.trainee.full_name}</td><td className="p-4">{money(item.amount)}</td><td className="p-4">{item.method}{item.provider ? ` · ${item.provider}` : ''}</td><td className="p-4">{item.reference_number || '—'}</td><td className="p-4">{item.status}</td><td className="p-4"><div className="flex gap-2"><button title="Open printable receipt" onClick={() => api.openReceipt(item.id).catch(failed)} className="rounded-lg border p-2 text-viva-blue"><Printer className="h-4 w-4" /></button><button title="Download receipt" onClick={() => api.downloadReceipt(item.id, item.receipt_number).catch(failed)} className="rounded-lg border p-2 text-viva-blue"><Download className="h-4 w-4" /></button>{isManager && item.status !== 'cancelled' && <button title="Cancel payment" onClick={() => cancelPayment.mutate(item.id)} className="rounded-lg border p-2 text-red-500"><XCircle className="h-4 w-4" /></button>}</div></td></tr>)}</tbody></table>
            </section>

            {previewInvoiceId !== null && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 sm:p-8">
                    <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b p-5">
                            <div><h2 className="font-display text-xl font-bold">Invoice Preview</h2><p className="text-xs text-slate-500">Review the invoice before printing or downloading.</p></div>
                            <button onClick={() => setPreviewInvoiceId(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                        </div>
                        {invoicePreviewQuery.isLoading ? (
                            <p className="p-10 text-center text-sm text-slate-500">Loading invoice...</p>
                        ) : invoicePreviewQuery.isError ? (
                            <p className="p-10 text-center text-sm text-red-600">{(invoicePreviewQuery.error as Error).message}</p>
                        ) : (() => {
                            const preview = invoicePreviewQuery.data?.data;
                            const invoice = preview?.invoice;
                            const settings = preview?.settings;
                            return (
                                <div className="space-y-6 p-6">
                                    <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row">
                                        <div><p className="text-xl font-extrabold text-viva-blue">{settings?.brand_name}</p><p className="text-sm text-slate-500">{settings?.location}</p><p className="text-sm text-slate-500">TIN: {settings?.tin}</p></div>
                                        <div className="sm:text-right"><p className="text-2xl font-extrabold">TAX INVOICE</p><p className="font-bold">{invoice?.invoice_number}</p><p className="text-sm capitalize text-slate-500">{invoice?.status}</p></div>
                                    </div>
                                    <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                                        <div><p className="text-xs font-bold uppercase text-slate-400">Bill To</p><p className="font-bold">{invoice?.trainee.full_name}</p><p className="text-sm">{invoice?.trainee.address}</p><p className="text-sm">{invoice?.trainee.phone}{invoice?.trainee.email ? ` · ${invoice.trainee.email}` : ''}</p></div>
                                        <div><p className="text-xs font-bold uppercase text-slate-400">Customer TIN</p><p>{invoice?.trainee.tin || '—'}</p><p className="mt-2 text-xs font-bold uppercase text-slate-400">Due Date</p><p>{invoice?.due_date || '—'}</p></div>
                                    </div>
                                    <div className="overflow-x-auto rounded-xl border">
                                        <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Description</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{invoice?.items.map((item: { id: number; description: string; amount: string }) => <tr key={item.id} className="border-t"><td className="p-3">{item.description}</td><td className="p-3 text-right">{money(item.amount)}</td></tr>)}</tbody></table>
                                    </div>
                                    <div className="ml-auto max-w-sm space-y-2 rounded-xl border p-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{money(invoice?.subtotal || 0)}</strong></div><div className="flex justify-between"><span>Discount</span><strong>{money(invoice?.discount_amount || 0)}</strong></div><div className="flex justify-between text-lg"><span>Total</span><strong>{money(invoice?.total || 0)}</strong></div><div className="flex justify-between text-green-700"><span>Paid</span><strong>{money(invoice?.amount_paid || 0)}</strong></div><div className="flex justify-between border-t pt-2 text-lg text-red-700"><span>Balance Due</span><strong>{money(preview?.balance_due || 0)}</strong></div></div>
                                    {!['draft', 'cancelled'].includes(invoice?.status) && <div className="flex flex-wrap justify-end gap-3"><button onClick={() => api.openInvoice(invoice.id).catch(failed)} className="flex items-center gap-2 rounded-xl border border-viva-blue px-4 py-3 font-bold text-viva-blue"><Printer className="h-4 w-4" />Open & Print</button><button onClick={() => api.downloadInvoice(invoice.id, invoice.invoice_number).catch(failed)} className="flex items-center gap-2 rounded-xl bg-viva-blue px-4 py-3 font-bold text-white"><Download className="h-4 w-4" />Download PDF</button></div>}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
