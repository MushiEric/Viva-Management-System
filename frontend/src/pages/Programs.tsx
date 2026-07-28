import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookOpen, CheckCircle2, CircleDollarSign, Plus, Send, Undo2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Facilitator {
    id: number;
    name: string;
    email: string;
}

interface Level {
    id: number;
    name: string;
    description: string | null;
    syllabus: string | null;
    duration_weeks: number;
    training_days_per_week: number;
    fee_tzs: string;
    fee_status: string;
    prerequisites: Array<{ id: number; name: string }>;
    facilitators: Facilitator[];
}

interface Program {
    id: number;
    name: string;
    description: string | null;
    status: string;
    review_notes: string | null;
    creator: { name: string };
    levels: Level[];
}

const initialLevel = {
    name: 'Beginner',
    description: '',
    syllabus: '',
    duration_weeks: 4,
    training_days_per_week: 6,
    fee_tzs: '',
    facilitator_ids: [] as number[],
    prerequisite_level_ids: [] as number[],
};

export default function Programs() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const canDraft = user?.role === 'manager' || user?.role === 'facilitator';
    const isManager = user?.role === 'manager';
    const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
    const [programForm, setProgramForm] = useState({ name: '', description: '' });
    const [levelForm, setLevelForm] = useState(initialLevel);
    const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

    const programsQuery = useQuery({ queryKey: ['programs'], queryFn: api.getPrograms });
    const facilitatorsQuery = useQuery({ queryKey: ['program-facilitators'], queryFn: api.getProgramFacilitators });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['programs'] });
    const success = (message: string) => { refresh(); toast.success(message); };
    const failure = (error: Error) => toast.error(error.message);

    const createProgram = useMutation({
        mutationFn: api.createProgram,
        onSuccess: (response) => {
            setSelectedProgram(response.data.id);
            setProgramForm({ name: '', description: '' });
            success('Program draft created.');
        },
        onError: failure,
    });
    const addLevel = useMutation({
        mutationFn: () => api.addProgramLevel(selectedProgram!, {
            ...levelForm,
            fee_tzs: Number(levelForm.fee_tzs),
        }),
        onSuccess: () => {
            setLevelForm(initialLevel);
            success('Program level added.');
        },
        onError: failure,
    });
    const submitProgram = useMutation({ mutationFn: api.submitProgram, onSuccess: () => success('Program submitted for Manager approval.'), onError: failure });
    const approveProgram = useMutation({ mutationFn: api.approveProgram, onSuccess: () => success('Program approved.'), onError: failure });
    const approveFee = useMutation({ mutationFn: api.approveProgramFee, onSuccess: () => success('Level fee approved.'), onError: failure });
    const requestChanges = useMutation({
        mutationFn: (programId: number) => api.requestProgramChanges(programId, reviewNotes[programId] || ''),
        onSuccess: () => success('Change recommendation sent.'),
        onError: failure,
    });

    const programs = (programsQuery.data?.data || []) as Program[];
    const facilitators = (facilitatorsQuery.data?.data || []) as Facilitator[];
    const allLevels = programs.flatMap((program) => program.levels);

    const submitNewProgram = (event: FormEvent) => {
        event.preventDefault();
        createProgram.mutate(programForm);
    };

    const submitLevel = (event: FormEvent) => {
        event.preventDefault();
        addLevel.mutate();
    };

    const toggleId = (values: number[], id: number) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold text-ink">Training Programs</h1>
                <p className="mt-1 text-sm text-slate-500">Manage levels, syllabuses, facilitators, prerequisites, fees, and approvals.</p>
            </header>

            {canDraft && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <form onSubmit={submitNewProgram} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><BookOpen className="h-5 w-5 text-viva-blue" />New Program Draft</h2>
                        <input required className="w-full rounded-xl border p-3" placeholder="Program name" value={programForm.name} onChange={(event) => setProgramForm({ ...programForm, name: event.target.value })} />
                        <textarea className="min-h-28 w-full rounded-xl border p-3" placeholder="Program description" value={programForm.description} onChange={(event) => setProgramForm({ ...programForm, description: event.target.value })} />
                        <button className="rounded-xl bg-viva-blue px-5 py-3 font-bold text-white"><Plus className="mr-2 inline h-4 w-4" />Create Draft</button>
                    </form>

                    <form onSubmit={submitLevel} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="font-display text-lg font-bold">Add Level</h2>
                        <select required className="w-full rounded-xl border p-3" value={selectedProgram || ''} onChange={(event) => setSelectedProgram(Number(event.target.value))}>
                            <option value="">Select draft program</option>
                            {programs.filter((program) => program.status !== 'approved').map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                            <input required className="rounded-xl border p-3" placeholder="Level name" value={levelForm.name} onChange={(event) => setLevelForm({ ...levelForm, name: event.target.value })} />
                            <input required type="number" min="0" className="rounded-xl border p-3" placeholder="Fee in TZS" value={levelForm.fee_tzs} onChange={(event) => setLevelForm({ ...levelForm, fee_tzs: event.target.value })} />
                            <input required type="number" min="1" className="rounded-xl border p-3" value={levelForm.duration_weeks} onChange={(event) => setLevelForm({ ...levelForm, duration_weeks: Number(event.target.value) })} />
                            <input required type="number" min="1" max="6" className="rounded-xl border p-3" value={levelForm.training_days_per_week} onChange={(event) => setLevelForm({ ...levelForm, training_days_per_week: Number(event.target.value) })} />
                        </div>
                        <textarea className="min-h-24 w-full rounded-xl border p-3" placeholder="Syllabus / learning outcomes" value={levelForm.syllabus} onChange={(event) => setLevelForm({ ...levelForm, syllabus: event.target.value })} />
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase text-slate-500">Assign Facilitators</p>
                            <div className="flex flex-wrap gap-2">
                                {facilitators.map((facilitator) => <button type="button" key={facilitator.id} onClick={() => setLevelForm({ ...levelForm, facilitator_ids: toggleId(levelForm.facilitator_ids, facilitator.id) })} className={`rounded-full border px-3 py-1 text-xs ${levelForm.facilitator_ids.includes(facilitator.id) ? 'bg-viva-blue text-white' : ''}`}>{facilitator.name}</button>)}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase text-slate-500">Informational Prerequisites</p>
                            <div className="flex flex-wrap gap-2">
                                {allLevels.map((level) => <button type="button" key={level.id} onClick={() => setLevelForm({ ...levelForm, prerequisite_level_ids: toggleId(levelForm.prerequisite_level_ids, level.id) })} className={`rounded-full border px-3 py-1 text-xs ${levelForm.prerequisite_level_ids.includes(level.id) ? 'bg-slate-800 text-white' : ''}`}>{level.name}</button>)}
                            </div>
                        </div>
                        <button disabled={!selectedProgram || addLevel.isPending} className="rounded-xl bg-viva-green px-5 py-3 font-bold text-white disabled:opacity-50">Add Level</button>
                    </form>
                </div>
            )}

            <div className="space-y-5">
                {programs.map((program) => (
                    <article key={program.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="font-display text-xl font-extrabold">{program.name}</h2>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase">{program.status.replace('_', ' ')}</span>
                                </div>
                                <p className="mt-2 max-w-3xl text-sm text-slate-500">{program.description || 'No description provided.'}</p>
                                {program.review_notes && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><strong>Manager recommendation:</strong> {program.review_notes}</p>}
                            </div>
                            <div className="flex gap-2">
                                {canDraft && ['draft', 'changes_requested'].includes(program.status) && <button onClick={() => submitProgram.mutate(program.id)} className="rounded-xl bg-viva-blue px-4 py-2 text-sm font-bold text-white"><Send className="mr-1 inline h-4 w-4" />Submit</button>}
                                {isManager && program.status === 'pending_approval' && <button onClick={() => approveProgram.mutate(program.id)} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white"><CheckCircle2 className="mr-1 inline h-4 w-4" />Approve</button>}
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {program.levels.map((level) => (
                                <div key={level.id} className="rounded-xl border bg-slate-50 p-4">
                                    <div className="flex justify-between gap-3">
                                        <h3 className="font-bold">{level.name}</h3>
                                        <span className={`text-xs font-bold ${level.fee_status === 'approved' ? 'text-green-600' : 'text-amber-600'}`}>{level.fee_status.replace('_', ' ')}</span>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">{level.duration_weeks} weeks · {level.training_days_per_week} days/week</p>
                                    <p className="mt-2 text-lg font-extrabold">TZS {Number(level.fee_tzs).toLocaleString()}</p>
                                    <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs text-slate-500">{level.syllabus || 'No syllabus added.'}</p>
                                    <p className="mt-3 text-xs"><strong>Facilitators:</strong> {level.facilitators.map((item) => item.name).join(', ') || 'Not assigned'}</p>
                                    <p className="mt-1 text-xs"><strong>Prerequisites:</strong> {level.prerequisites.map((item) => item.name).join(', ') || 'None'}</p>
                                    {isManager && level.fee_status !== 'approved' && <button onClick={() => approveFee.mutate(level.id)} className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-700"><CircleDollarSign className="mr-1 inline h-4 w-4" />Approve Fee</button>}
                                </div>
                            ))}
                        </div>

                        {isManager && program.status === 'pending_approval' && (
                            <div className="mt-5 flex gap-3">
                                <input className="flex-1 rounded-xl border p-3 text-sm" placeholder="Recommendation or required changes" value={reviewNotes[program.id] || ''} onChange={(event) => setReviewNotes({ ...reviewNotes, [program.id]: event.target.value })} />
                                <button disabled={!reviewNotes[program.id]} onClick={() => requestChanges.mutate(program.id)} className="rounded-xl border px-4 py-2 text-sm font-bold text-amber-700 disabled:opacity-50"><Undo2 className="mr-1 inline h-4 w-4" />Request Changes</button>
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </div>
    );
}
