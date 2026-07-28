import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface LevelOption {
    id: number;
    name: string;
    fee_tzs: string;
    program: { name: string };
}

interface Facilitator {
    id: number;
    name: string;
}

interface ScheduleDay {
    day_of_week: number;
    start_time?: string;
    end_time?: string;
}

interface Cohort {
    id: number;
    name: string;
    program_level_id: number;
    schedule_window: string;
    start_date: string;
    end_date: string;
    default_start_time: string;
    default_end_time: string;
    occupied_seats: number;
    deleted_at: string | null;
    program_level: LevelOption;
    schedule_days: ScheduleDay[];
    facilitators: Facilitator[];
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const emptyForm = {
    program_level_id: 0,
    name: '',
    schedule_window: 'morning',
    start_date: '',
    end_date: '',
    default_start_time: '',
    default_end_time: '',
    facilitator_ids: [] as number[],
    schedule_days: [1, 2, 3, 4, 5, 6] as number[],
};

export default function Cohorts() {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const cohortsQuery = useQuery({ queryKey: ['cohorts'], queryFn: api.getCohorts });
    const optionsQuery = useQuery({ queryKey: ['cohort-options'], queryFn: api.getCohortOptions });
    const facilitatorsQuery = useQuery({ queryKey: ['program-facilitators'], queryFn: api.getProgramFacilitators });
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['cohorts'] });
        queryClient.invalidateQueries({ queryKey: ['timetable'] });
    };
    const saved = () => {
        refresh();
        setEditingId(null);
        setForm(emptyForm);
        toast.success('Cohort schedule saved.');
    };
    const save = useMutation({
        mutationFn: (payload: any) => editingId ? api.updateCohort(editingId, payload) : api.createCohort(payload),
        onSuccess: saved,
        onError: (error: Error) => toast.error(error.message),
    });
    const deactivate = useMutation({
        mutationFn: api.deactivateCohort,
        onSuccess: () => {
            refresh();
            toast.success('Cohort deactivated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const cohorts = (cohortsQuery.data?.data || []) as Cohort[];
    const levels = (optionsQuery.data?.data || []) as LevelOption[];
    const facilitators = (facilitatorsQuery.data?.data || []) as Facilitator[];

    const toggle = (values: number[], id: number) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id];

    const submit = (event: FormEvent) => {
        event.preventDefault();
        save.mutate({
            ...form,
            default_start_time: form.default_start_time || null,
            default_end_time: form.default_end_time || null,
            schedule_days: form.schedule_days.map((day) => ({ day_of_week: day })),
        });
    };

    const edit = (cohort: Cohort) => {
        setEditingId(cohort.id);
        setForm({
            program_level_id: cohort.program_level_id,
            name: cohort.name,
            schedule_window: cohort.schedule_window,
            start_date: cohort.start_date,
            end_date: cohort.end_date,
            default_start_time: cohort.default_start_time.slice(0, 5),
            default_end_time: cohort.default_end_time.slice(0, 5),
            facilitator_ids: cohort.facilitators.map((item) => item.id),
            schedule_days: cohort.schedule_days.map((item) => item.day_of_week),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold">Cohort Scheduling</h1>
                <p className="mt-1 text-sm text-slate-500">Schedule approved levels from Monday to Saturday. Every cohort has seven computer seats.</p>
            </header>

            <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold"><CalendarClock className="h-5 w-5 text-viva-blue" />{editingId ? 'Edit Cohort' : 'New Cohort'}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <select required className="rounded-xl border p-3" value={form.program_level_id} onChange={(event) => setForm({ ...form, program_level_id: Number(event.target.value) })}>
                        <option value={0}>Select approved program level</option>
                        {levels.map((level) => <option key={level.id} value={level.id}>{level.program.name} — {level.name} · TZS {Number(level.fee_tzs).toLocaleString()}</option>)}
                    </select>
                    <input required className="rounded-xl border p-3" placeholder="Cohort name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                    <input required type="date" className="rounded-xl border p-3" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
                    <input required type="date" className="rounded-xl border p-3" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
                    <select className="rounded-xl border p-3" value={form.schedule_window} onChange={(event) => setForm({ ...form, schedule_window: event.target.value, default_start_time: '', default_end_time: '' })}>
                        <option value="morning">Morning · 08:30–10:30</option>
                        <option value="afternoon">Afternoon · 14:00–16:00</option>
                        <option value="evening">Evening · 18:30–20:30</option>
                        <option value="weekend">Weekend · 09:00–11:00</option>
                        <option value="custom">Custom time</option>
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="time" required={form.schedule_window === 'custom'} className="rounded-xl border p-3" value={form.default_start_time} onChange={(event) => setForm({ ...form, default_start_time: event.target.value })} />
                        <input type="time" required={form.schedule_window === 'custom'} className="rounded-xl border p-3" value={form.default_end_time} onChange={(event) => setForm({ ...form, default_end_time: event.target.value })} />
                    </div>
                </div>
                <div>
                    <p className="mb-2 text-xs font-bold uppercase text-slate-500">Training days</p>
                    <div className="flex flex-wrap gap-2">{dayNames.map((name, index) => <button type="button" key={name} onClick={() => setForm({ ...form, schedule_days: toggle(form.schedule_days, index + 1) })} className={`rounded-full border px-4 py-2 text-xs font-bold ${form.schedule_days.includes(index + 1) ? 'bg-viva-blue text-white' : ''}`}>{name}</button>)}</div>
                </div>
                <div>
                    <p className="mb-2 text-xs font-bold uppercase text-slate-500">Facilitators</p>
                    <div className="flex flex-wrap gap-2">{facilitators.map((facilitator) => <button type="button" key={facilitator.id} onClick={() => setForm({ ...form, facilitator_ids: toggle(form.facilitator_ids, facilitator.id) })} className={`rounded-full border px-4 py-2 text-xs font-bold ${form.facilitator_ids.includes(facilitator.id) ? 'bg-viva-green text-white' : ''}`}>{facilitator.name}</button>)}</div>
                </div>
                <div className="flex gap-3">
                    <button disabled={save.isPending || !form.schedule_days.length || !form.facilitator_ids.length} className="rounded-xl bg-viva-blue px-5 py-3 font-bold text-white disabled:opacity-50">{save.isPending ? 'Saving...' : editingId ? 'Update Cohort' : 'Create Cohort'}</button>
                    {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-xl border px-5 py-3 font-bold">Cancel</button>}
                </div>
            </form>

            <div className="grid gap-5 lg:grid-cols-2">
                {cohorts.map((cohort) => (
                    <article key={cohort.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${cohort.deleted_at ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between gap-4">
                            <div><h2 className="font-display text-lg font-bold">{cohort.name}</h2><p className="text-sm text-slate-500">{cohort.program_level?.program.name} — {cohort.program_level?.name}</p></div>
                            {!cohort.deleted_at && <div className="flex gap-2"><button onClick={() => edit(cohort)} className="rounded-lg border p-2 text-viva-blue"><Pencil className="h-4 w-4" /></button><button onClick={() => deactivate.mutate(cohort.id)} className="rounded-lg border p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div>}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs">
                            <p><strong>Dates:</strong><br />{cohort.start_date} – {cohort.end_date}</p>
                            <p><strong>Time:</strong><br />{cohort.default_start_time.slice(0, 5)} – {cohort.default_end_time.slice(0, 5)}</p>
                            <p><strong>Days:</strong><br />{cohort.schedule_days.map((day) => dayNames[day.day_of_week - 1].slice(0, 3)).join(', ')}</p>
                            <p><strong>Seats:</strong><br />{cohort.occupied_seats} / 7 occupied</p>
                            <p className="col-span-2"><strong>Facilitators:</strong><br />{cohort.facilitators.map((item) => item.name).join(', ')}</p>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
