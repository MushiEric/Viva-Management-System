import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronDown, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import { api } from '../services/api';

interface AuditActor {
    id: number;
    name: string;
    role: string;
}

interface AuditLog {
    id: number;
    action: string;
    subject_type: string;
    subject_id: number;
    actor: AuditActor | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
}

const subjectName = (subjectType: string) => subjectType.split('\\').pop()?.replace(/([a-z])([A-Z])/g, '$1 $2') || subjectType;
const actionName = (action: string) => action.replaceAll('.', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function Changes({ before, after }: Pick<AuditLog, 'before' | 'after'>) {
    const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])]
        .filter((key) => !['password', 'remember_token'].includes(key));

    if (keys.length === 0) {
        return <p className="text-sm text-slate-500">No field-level values were recorded.</p>;
    }

    return (
        <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="p-3">Field</th><th className="p-3">Before</th><th className="p-3">After</th></tr></thead>
                <tbody>
                    {keys.map((key) => (
                        <tr key={key} className="border-t">
                            <td className="p-3 font-bold">{key.replaceAll('_', ' ')}</td>
                            <td className="max-w-xs break-words p-3 text-red-700">{JSON.stringify(before?.[key] ?? '—')}</td>
                            <td className="max-w-xs break-words p-3 text-green-700">{JSON.stringify(after?.[key] ?? '—')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function AuditLogs() {
    const [filters, setFilters] = useState({
        search: '',
        actor_id: '',
        action: '',
        subject_type: '',
        from: '',
        to: '',
    });
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const auditQuery = useQuery({
        queryKey: ['audit-logs', filters, page],
        queryFn: () => api.getAuditLogs({ ...filters, page, per_page: 30 }),
    });

    const response = auditQuery.data;
    const paginator = response?.data;
    const logs = (paginator?.data || []) as AuditLog[];
    const actors = (response?.filters?.actors || []) as AuditActor[];
    const actions = (response?.filters?.actions || []) as string[];
    const subjectTypes = (response?.filters?.subject_types || []) as string[];

    const updateFilter = (key: keyof typeof filters, value: string) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold"><Activity className="h-8 w-8 text-viva-blue" />Audit Logs</h1>
                <p className="mt-1 text-sm text-slate-500">Review protected system activity and inspect recorded field changes.</p>
            </header>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold"><Filter className="h-4 w-4 text-viva-blue" />Filters</div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <label className="relative">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} className="w-full rounded-xl border py-3 pl-9 pr-3 text-sm" placeholder="Search action, module, or staff" />
                    </label>
                    <select value={filters.actor_id} onChange={(event) => updateFilter('actor_id', event.target.value)} className="rounded-xl border p-3 text-sm">
                        <option value="">All users</option>
                        {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name} — {actor.role}</option>)}
                    </select>
                    <select value={filters.action} onChange={(event) => updateFilter('action', event.target.value)} className="rounded-xl border p-3 text-sm">
                        <option value="">All actions</option>
                        {actions.map((action) => <option key={action} value={action}>{actionName(action)}</option>)}
                    </select>
                    <select value={filters.subject_type} onChange={(event) => updateFilter('subject_type', event.target.value)} className="rounded-xl border p-3 text-sm">
                        <option value="">All modules</option>
                        {subjectTypes.map((type) => <option key={type} value={type}>{subjectName(type)}</option>)}
                    </select>
                    <label className="text-xs font-bold uppercase text-slate-500">From
                        <input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} className="mt-1 w-full rounded-xl border p-3 text-sm font-normal normal-case" />
                    </label>
                    <label className="text-xs font-bold uppercase text-slate-500">To
                        <input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => updateFilter('to', event.target.value)} className="mt-1 w-full rounded-xl border p-3 text-sm font-normal normal-case" />
                    </label>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                {auditQuery.isLoading ? (
                    <p className="p-10 text-center text-sm text-slate-500">Loading audit activity...</p>
                ) : auditQuery.isError ? (
                    <p className="p-10 text-center text-sm text-red-600">{(auditQuery.error as Error).message}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Date & Time</th><th className="p-4">User</th><th className="p-4">Action</th><th className="p-4">Record</th><th className="p-4">IP Address</th><th className="p-4"></th></tr></thead>
                            <tbody>
                                {logs.map((log) => (
                                    <>
                                        <tr key={log.id} className="border-t">
                                            <td className="whitespace-nowrap p-4 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                                            <td className="p-4"><p className="font-bold">{log.actor?.name || 'System'}</p><p className="text-xs capitalize text-slate-400">{log.actor?.role || 'automated'}</p></td>
                                            <td className="p-4 font-semibold">{actionName(log.action)}</td>
                                            <td className="p-4 text-xs">{subjectName(log.subject_type)} #{log.subject_id}</td>
                                            <td className="p-4 text-xs">{log.ip_address || '—'}</td>
                                            <td className="p-4"><button title="View changes" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="rounded-lg border p-2 text-viva-blue"><ChevronDown className={`h-4 w-4 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} /></button></td>
                                        </tr>
                                        {expandedId === log.id && <tr key={`${log.id}-details`} className="border-t bg-slate-50"><td colSpan={6} className="p-5"><Changes before={log.before} after={log.after} /></td></tr>}
                                    </>
                                ))}
                                {logs.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400">No audit records match these filters.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex items-center justify-between border-t p-4 text-sm">
                    <p className="text-slate-500">Page {paginator?.current_page || 1} of {paginator?.last_page || 1} · {paginator?.total || 0} records</p>
                    <div className="flex gap-2">
                        <button disabled={!paginator?.prev_page_url} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                        <button disabled={!paginator?.next_page_url} onClick={() => setPage((current) => current + 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
            </section>
        </div>
    );
}
