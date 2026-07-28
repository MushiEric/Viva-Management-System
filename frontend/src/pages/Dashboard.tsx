import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Banknote, CalendarDays, CheckCircle2, Clock3, GraduationCap, Search, UsersRound } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const money = (value: number) => `TZS ${Number(value).toLocaleString()}`;

export default function Dashboard() {
    const user = useAuthStore((state) => state.user);
    const canReport = user?.role === 'manager' || user?.role === 'admin';
    const [period, setPeriod] = useState('monthly');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [auditSearch, setAuditSearch] = useState('');

    const dashboardQuery = useQuery({ queryKey: ['dashboard'], queryFn: api.getDashboard });
    const reportQuery = useQuery({
        queryKey: ['reports', period, from, to],
        queryFn: () => api.getReport(period, from || undefined, to || undefined),
        enabled: canReport && (period !== 'custom' || (!!from && !!to)),
    });
    const auditQuery = useQuery({
        queryKey: ['audit-logs', auditSearch],
        queryFn: () => api.getAuditLogs(auditSearch),
        enabled: canReport,
    });

    const dashboard = dashboardQuery.data?.data;
    const report = reportQuery.data?.data;
    const auditLogs = auditQuery.data?.data?.data || [];
    const operationCards = [
        ['Active Trainees', dashboard?.operations.active_trainees || 0, UsersRound],
        ['Active Enrollments', dashboard?.operations.active_enrollments || 0, GraduationCap],
        ['Completed', dashboard?.operations.completed_enrollments || 0, CheckCircle2],
        ['Active Cohorts', dashboard?.operations.active_cohorts || 0, CalendarDays],
    ];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold">Welcome, {user?.name}</h1>
                <p className="mt-1 text-sm text-slate-500">VIVA DIGITAL CENTER operational overview · {user?.role}</p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {operationCards.map(([label, value, Icon]: any) => (
                    <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><Icon className="mb-3 h-6 w-6 text-viva-blue" /><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-3xl font-extrabold">{value}</p></div>
                ))}
            </div>

            {dashboard?.finance && (
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-900 p-5 text-white"><Banknote className="mb-3 h-6 w-6 text-viva-green" /><p className="text-xs uppercase text-slate-400">Total Invoiced</p><p className="text-2xl font-extrabold">{money(dashboard.finance.invoiced)}</p></div>
                    <div className="rounded-2xl bg-green-700 p-5 text-white"><p className="text-xs uppercase text-green-100">Payments Applied</p><p className="mt-3 text-2xl font-extrabold">{money(dashboard.finance.paid)}</p></div>
                    <div className="rounded-2xl bg-amber-500 p-5 text-white"><p className="text-xs uppercase text-amber-100">Outstanding Balance</p><p className="mt-3 text-2xl font-extrabold">{money(dashboard.finance.outstanding)}</p></div>
                </div>
            )}

            {dashboard?.pending_approvals && (
                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold">Pending Approvals</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(dashboard.pending_approvals).map(([label, value]: any) => <div key={label} className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-bold uppercase text-amber-700">{label}</p><p className="mt-1 text-2xl font-extrabold text-amber-900">{value}</p></div>)}
                    </div>
                </section>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                    <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Clock3 className="h-5 w-5 text-viva-blue" />Upcoming Cohorts</h2>
                    <div className="mt-4 space-y-3">
                        {(dashboard?.upcoming_cohorts || []).map((cohort: any) => <div key={cohort.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-4"><div><p className="font-bold">{cohort.program_level?.program.name} — {cohort.program_level?.name}</p><p className="text-xs text-slate-500">{cohort.name} · {cohort.start_date} to {cohort.end_date}</p></div><span className="text-xs font-bold">{cohort.occupied_seats}/7 seats</span></div></div>)}
                        {!dashboard?.upcoming_cohorts?.length && <p className="py-6 text-center text-sm text-slate-400">No upcoming cohorts.</p>}
                    </div>
                </section>
                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                    <h2 className="flex items-center gap-2 font-display text-lg font-bold"><CheckCircle2 className="h-5 w-5 text-viva-green" />Recent Completions</h2>
                    <div className="mt-4 space-y-3">
                        {(dashboard?.recent_completions || []).map((item: any) => <div key={item.id} className="rounded-xl bg-slate-50 p-4"><p className="font-bold">{item.trainee.full_name}</p><p className="text-xs text-slate-500">{item.cohort.program_level?.program.name} — {item.cohort.program_level?.name}</p></div>)}
                        {!dashboard?.recent_completions?.length && <p className="py-6 text-center text-sm text-slate-400">No completed enrollments yet.</p>}
                    </div>
                </section>
            </div>

            {canReport && (
                <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div><h2 className="font-display text-xl font-bold">Operational Reports</h2><p className="text-sm text-slate-500">Daily, weekly, monthly, or custom date reporting.</p></div>
                        <div className="flex gap-3">
                            <select className="rounded-xl border p-3" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select>
                            {period === 'custom' && <><input type="date" className="rounded-xl border p-3" value={from} onChange={(event) => setFrom(event.target.value)} /><input type="date" className="rounded-xl border p-3" value={to} onChange={(event) => setTo(event.target.value)} /></>}
                        </div>
                    </div>
                    {report && (
                        <>
                            <p className="text-xs font-bold uppercase text-slate-400">{report.period.from} to {report.period.to}</p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                                {Object.entries(report.summary).map(([label, value]: any) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-500">{label.replaceAll('_', ' ')}</p><p className="mt-1 text-xl font-extrabold">{label === 'payments_received' ? money(value) : value}</p></div>)}
                            </div>
                            <div className="grid gap-5 lg:grid-cols-2">
                                <div className="rounded-xl border p-4"><h3 className="font-bold">Program Enrollments</h3>{report.program_enrollments.map((item: any) => <div key={item.program_name} className="mt-3 flex justify-between border-t pt-3 text-sm"><span>{item.program_name}</span><strong>{item.total}</strong></div>)}</div>
                                <div className="max-h-72 overflow-auto rounded-xl border p-4"><h3 className="font-bold">Daily Activity</h3>{report.daily_activity.map((item: any) => <div key={item.date} className="mt-3 grid grid-cols-3 border-t pt-3 text-xs"><span>{item.date}</span><span>{item.enrollments} enrollment(s)</span><strong>{money(item.payments)}</strong></div>)}</div>
                            </div>
                        </>
                    )}
                </section>
            )}

            {canReport && (
                <section className="rounded-2xl border bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-5"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><Activity className="h-5 w-5" />Audit Activity</h2><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="rounded-xl border py-2.5 pl-9 pr-3 text-sm" placeholder="Search action or staff" value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} /></div></div>
                    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Time</th><th className="p-4">Actor</th><th className="p-4">Action</th><th className="p-4">Subject</th><th className="p-4">IP</th></tr></thead><tbody>{auditLogs.map((log: any) => <tr key={log.id} className="border-t"><td className="p-4 text-xs">{new Date(log.created_at).toLocaleString()}</td><td className="p-4">{log.actor?.name || 'System'}</td><td className="p-4 font-bold">{log.action}</td><td className="p-4 text-xs">{log.subject_type} #{log.subject_id}</td><td className="p-4 text-xs">{log.ip_address || '—'}</td></tr>)}</tbody></table></div>
                </section>
            )}
        </div>
    );
}
