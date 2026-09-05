import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, BookOpen, CheckCircle2, CircleDollarSign, Pencil, Plus, Send, Trash2, Undo2, X } from 'lucide-react';
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
    syllabus_outline: Array<{
        title: string;
        submodules?: Array<{ title: string }>;
    }> | null;
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
    image_path: string | null;
    created_by: number;
    status: string;
    review_notes: string | null;
    creator: { name: string };
    levels: Level[];
}

const initialLevel = {
    name: 'Beginner',
    description: '',
    syllabus: '',
    syllabus_outline: [{ title: '', submodules: [] as Array<{ title: string }> }],
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
    const [programImage, setProgramImage] = useState<File | null>(null);
    const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
    const [levelForm, setLevelForm] = useState(initialLevel);
    const [editingLevelId, setEditingLevelId] = useState<number | null>(null);
    const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

    const programsQuery = useQuery({ queryKey: ['programs'], queryFn: api.getPrograms });
    const facilitatorsQuery = useQuery({ queryKey: ['program-facilitators'], queryFn: api.getProgramFacilitators });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['programs'] });
    const success = (message: string) => { refresh(); toast.success(message); };
    const failure = (error: Error) => toast.error(error.message);
    const programPayload = () => {
        const payload = new FormData();
        payload.set('name', programForm.name);
        payload.set('description', programForm.description);
        if (programImage) payload.set('image', programImage);

        return payload;
    };
    const levelPayload = () => ({
        ...levelForm,
        syllabus_outline: levelForm.syllabus_outline.map((topic) => ({
            title: topic.title.trim(),
            submodules: topic.submodules.map((submodule) => ({ title: submodule.title.trim() })),
        })),
        fee_tzs: Number(levelForm.fee_tzs),
    });
    const resetProgramForm = () => {
        setEditingProgramId(null);
        setProgramForm({ name: '', description: '' });
        setProgramImage(null);
    };
    const resetLevelForm = () => {
        setEditingLevelId(null);
        setLevelForm(initialLevel);
    };

    const createProgram = useMutation({
        mutationFn: () => api.createProgram(programPayload()),
        onSuccess: (response) => {
            setSelectedProgram(response.data.id);
            resetProgramForm();
            success('Program draft created.');
        },
        onError: failure,
    });
    const updateProgram = useMutation({
        mutationFn: () => api.updateProgram(editingProgramId!, programPayload()),
        onSuccess: () => {
            resetProgramForm();
            success('Program changes saved. You can now resubmit it for approval.');
        },
        onError: failure,
    });
    const addLevel = useMutation({
        mutationFn: () => api.addProgramLevel(selectedProgram!, levelPayload()),
        onSuccess: () => {
            resetLevelForm();
            success('Program level added.');
        },
        onError: failure,
    });
    const updateLevel = useMutation({
        mutationFn: () => api.updateProgramLevel(editingLevelId!, levelPayload()),
        onSuccess: () => {
            resetLevelForm();
            success('Program level changes saved.');
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
        if (editingProgramId) {
            updateProgram.mutate();
        } else {
            createProgram.mutate();
        }
    };

    const submitLevel = (event: FormEvent) => {
        event.preventDefault();
        if (editingLevelId) {
            updateLevel.mutate();
        } else {
            addLevel.mutate();
        }
    };

    const beginProgramEdit = (program: Program) => {
        setEditingProgramId(program.id);
        setProgramForm({ name: program.name, description: program.description || '' });
        setProgramImage(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const beginLevelEdit = (program: Program, level: Level) => {
        setSelectedProgram(program.id);
        setEditingLevelId(level.id);
        setLevelForm({
            name: level.name,
            description: level.description || '',
            syllabus: level.syllabus || '',
            syllabus_outline: level.syllabus_outline?.length
                ? level.syllabus_outline.map((topic) => ({
                    title: topic.title,
                    submodules: (topic.submodules || []).map((submodule) => ({ title: submodule.title })),
                }))
                : [{ title: '', submodules: [] }],
            duration_weeks: level.duration_weeks,
            training_days_per_week: level.training_days_per_week,
            fee_tzs: level.fee_tzs,
            facilitator_ids: level.facilitators.map((facilitator) => facilitator.id),
            prerequisite_level_ids: level.prerequisites.map((prerequisite) => prerequisite.id),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleId = (values: number[], id: number) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
    const updateTopic = (index: number, title: string) => {
        setLevelForm((current) => ({
            ...current,
            syllabus_outline: current.syllabus_outline.map((topic, topicIndex) => topicIndex === index ? { ...topic, title } : topic),
        }));
    };
    const addTopic = () => {
        setLevelForm((current) => ({
            ...current,
            syllabus_outline: [...current.syllabus_outline, { title: '', submodules: [] }],
        }));
    };
    const removeTopic = (index: number) => {
        setLevelForm((current) => ({
            ...current,
            syllabus_outline: current.syllabus_outline.filter((_, topicIndex) => topicIndex !== index),
        }));
    };
    const moveTopic = (index: number, direction: -1 | 1) => {
        setLevelForm((current) => {
            const topics = [...current.syllabus_outline];
            const targetIndex = index + direction;
            [topics[index], topics[targetIndex]] = [topics[targetIndex], topics[index]];

            return { ...current, syllabus_outline: topics };
        });
    };
    const updateSubmodule = (topicIndex: number, submoduleIndex: number, title: string) => {
        setLevelForm((current) => ({
            ...current,
            syllabus_outline: current.syllabus_outline.map((topic, currentTopicIndex) => currentTopicIndex === topicIndex
                ? {
                    ...topic,
                    submodules: topic.submodules.map((submodule, currentSubmoduleIndex) => currentSubmoduleIndex === submoduleIndex ? { title } : submodule),
                }
                : topic),
        }));
    };
    const addSubmodule = (topicIndex: number) => {
        setLevelForm((current) => ({
            ...current,
            syllabus_outline: current.syllabus_outline.map((topic, currentTopicIndex) => currentTopicIndex === topicIndex
                ? { ...topic, submodules: [...topic.submodules, { title: '' }] }
                : topic),
        }));
    };
    const removeSubmodule = (topicIndex: number, submoduleIndex: number) => {
        setLevelForm((current) => ({
            ...current,
            syllabus_outline: current.syllabus_outline.map((topic, currentTopicIndex) => currentTopicIndex === topicIndex
                ? { ...topic, submodules: topic.submodules.filter((_, currentSubmoduleIndex) => currentSubmoduleIndex !== submoduleIndex) }
                : topic),
        }));
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold text-ink">Training Programs</h1>
                <p className="mt-1 text-sm text-slate-500">Manage levels, syllabuses, facilitators, prerequisites, fees, and approvals.</p>
            </header>

            {canDraft && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <form onSubmit={submitNewProgram} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><BookOpen className="h-5 w-5 text-viva-blue" />{editingProgramId ? 'Edit Program' : 'New Program Draft'}</h2>
                        <input required className="w-full rounded-xl border p-3" placeholder="Program name" value={programForm.name} onChange={(event) => setProgramForm({ ...programForm, name: event.target.value })} />
                        <textarea className="min-h-28 w-full rounded-xl border p-3" placeholder="Program description" value={programForm.description} onChange={(event) => setProgramForm({ ...programForm, description: event.target.value })} />
                        <label className="block text-sm font-semibold text-slate-700">{editingProgramId ? 'Replace Program Card Image' : 'Program Card Image'} <span className="font-normal text-slate-400">(optional, JPG/PNG/WebP, maximum 3 MB)</span>
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 w-full rounded-xl border bg-white p-3 font-normal" onChange={(event) => setProgramImage(event.target.files?.[0] || null)} />
                        </label>
                        <div className="flex gap-3">
                            <button disabled={createProgram.isPending || updateProgram.isPending} className="rounded-xl bg-viva-blue px-5 py-3 font-bold text-white disabled:opacity-50">
                                {editingProgramId ? <Pencil className="mr-2 inline h-4 w-4" /> : <Plus className="mr-2 inline h-4 w-4" />}
                                {editingProgramId ? (updateProgram.isPending ? 'Saving...' : 'Save Program Changes') : (createProgram.isPending ? 'Creating...' : 'Create Draft')}
                            </button>
                            {editingProgramId && <button type="button" onClick={resetProgramForm} className="rounded-xl border px-5 py-3 font-bold text-slate-600"><X className="mr-2 inline h-4 w-4" />Cancel</button>}
                        </div>
                    </form>

                    <form onSubmit={submitLevel} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="font-display text-lg font-bold">{editingLevelId ? 'Edit Program Level' : 'Add Level'}</h2>
                        <select required disabled={!!editingLevelId} className="w-full rounded-xl border p-3 disabled:bg-slate-100" value={selectedProgram || ''} onChange={(event) => setSelectedProgram(Number(event.target.value))}>
                            <option value="">Select draft program</option>
                            {programs.filter((program) => program.status !== 'approved').map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                            <input required className="rounded-xl border p-3" placeholder="Level name" value={levelForm.name} onChange={(event) => setLevelForm({ ...levelForm, name: event.target.value })} />
                            <input required type="number" min="0" className="rounded-xl border p-3" placeholder="Fee in TZS" value={levelForm.fee_tzs} onChange={(event) => setLevelForm({ ...levelForm, fee_tzs: event.target.value })} />
                            <input required type="number" min="1" className="rounded-xl border p-3" value={levelForm.duration_weeks} onChange={(event) => setLevelForm({ ...levelForm, duration_weeks: Number(event.target.value) })} />
                            <input required type="number" min="1" max="6" className="rounded-xl border p-3" value={levelForm.training_days_per_week} onChange={(event) => setLevelForm({ ...levelForm, training_days_per_week: Number(event.target.value) })} />
                        </div>
                        <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-600">Syllabus Outline</p>
                                    <p className="mt-1 text-xs text-slate-500">Add topics in the order they will be taught.</p>
                                </div>
                                <button type="button" onClick={addTopic} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold text-viva-blue"><Plus className="mr-1 inline h-4 w-4" />Add Topic</button>
                            </div>
                            {levelForm.syllabus_outline.map((topic, index) => (
                                <div key={index} className="space-y-3 rounded-xl border bg-white p-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-500">{index + 1}.</span>
                                        <input required maxLength={255} className="min-w-0 flex-1 rounded-lg border p-3" placeholder={`Topic ${index + 1}`} value={topic.title} onChange={(event) => updateTopic(index, event.target.value)} />
                                        <button type="button" aria-label="Move topic up" disabled={index === 0} onClick={() => moveTopic(index, -1)} className="rounded-lg border p-2 text-slate-600 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                                        <button type="button" aria-label="Move topic down" disabled={index === levelForm.syllabus_outline.length - 1} onClick={() => moveTopic(index, 1)} className="rounded-lg border p-2 text-slate-600 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                                        <button type="button" aria-label="Remove topic" disabled={levelForm.syllabus_outline.length === 1} onClick={() => removeTopic(index)} className="rounded-lg border border-red-100 p-2 text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                    <div className="ml-8 space-y-2 border-l-2 border-viva-blue/20 pl-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold uppercase text-slate-500">Submodules</p>
                                            <button type="button" onClick={() => addSubmodule(index)} className="text-xs font-bold text-viva-blue"><Plus className="mr-1 inline h-3.5 w-3.5" />Add Submodule</button>
                                        </div>
                                        {topic.submodules.map((submodule, submoduleIndex) => (
                                            <div key={submoduleIndex} className="flex items-center gap-2">
                                                <span className="w-5 text-xs font-bold text-slate-400">{submoduleIndex + 1}.</span>
                                                <input required maxLength={255} className="min-w-0 flex-1 rounded-lg border p-2 text-sm" placeholder={`Submodule ${submoduleIndex + 1}`} value={submodule.title} onChange={(event) => updateSubmodule(index, submoduleIndex, event.target.value)} />
                                                <button type="button" aria-label="Remove submodule" onClick={() => removeSubmodule(index, submoduleIndex)} className="rounded-lg border border-red-100 p-2 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                                            </div>
                                        ))}
                                        {topic.submodules.length === 0 && <p className="text-xs text-slate-400">No submodules added.</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <textarea className="min-h-20 w-full rounded-xl border p-3" placeholder="Additional syllabus notes or learning outcomes (optional)" value={levelForm.syllabus} onChange={(event) => setLevelForm({ ...levelForm, syllabus: event.target.value })} />
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase text-slate-500">Assign Facilitators</p>
                            <div className="flex flex-wrap gap-2">
                                {facilitators.map((facilitator) => <button type="button" key={facilitator.id} onClick={() => setLevelForm({ ...levelForm, facilitator_ids: toggleId(levelForm.facilitator_ids, facilitator.id) })} className={`rounded-full border px-3 py-1 text-xs ${levelForm.facilitator_ids.includes(facilitator.id) ? 'bg-viva-blue text-white' : ''}`}>{facilitator.name}</button>)}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase text-slate-500">Informational Prerequisites</p>
                            <div className="flex flex-wrap gap-2">
                                {allLevels.filter((level) => level.id !== editingLevelId).map((level) => <button type="button" key={level.id} onClick={() => setLevelForm({ ...levelForm, prerequisite_level_ids: toggleId(levelForm.prerequisite_level_ids, level.id) })} className={`rounded-full border px-3 py-1 text-xs ${levelForm.prerequisite_level_ids.includes(level.id) ? 'bg-slate-800 text-white' : ''}`}>{level.name}</button>)}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button disabled={!selectedProgram || addLevel.isPending || updateLevel.isPending} className="rounded-xl bg-viva-green px-5 py-3 font-bold text-white disabled:opacity-50">{editingLevelId ? (updateLevel.isPending ? 'Saving...' : 'Save Level Changes') : 'Add Level'}</button>
                            {editingLevelId && <button type="button" onClick={resetLevelForm} className="rounded-xl border px-5 py-3 font-bold text-slate-600"><X className="mr-2 inline h-4 w-4" />Cancel</button>}
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-5">
                {programs.map((program) => (
                    <article key={program.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        {program.image_path && <img src={api.programImageUrl(program.id)} alt={`${program.name} course`} className="mb-4 h-24 w-40 rounded-xl border border-slate-200 object-cover sm:h-28 sm:w-48" />}
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
                                {canDraft && ['draft', 'changes_requested'].includes(program.status) && (isManager || program.created_by === user?.id) && <button onClick={() => beginProgramEdit(program)} className="rounded-xl border px-4 py-2 text-sm font-bold text-viva-blue"><Pencil className="mr-1 inline h-4 w-4" />Edit</button>}
                                {canDraft && ['draft', 'changes_requested'].includes(program.status) && (isManager || program.created_by === user?.id) && <button onClick={() => submitProgram.mutate(program.id)} className="rounded-xl bg-viva-blue px-4 py-2 text-sm font-bold text-white"><Send className="mr-1 inline h-4 w-4" />{program.status === 'changes_requested' ? 'Resubmit' : 'Submit'}</button>}
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
                                    <div className="mt-4 rounded-lg border bg-white p-3">
                                        <p className="mb-2 text-xs font-bold uppercase text-slate-600">Syllabus Outline</p>
                                        {level.syllabus_outline?.length ? (
                                            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                                                {level.syllabus_outline.map((topic, index) => (
                                                    <li key={`${level.id}-${index}`}>
                                                        <span className="font-semibold">{topic.title}</span>
                                                        {!!topic.submodules?.length && (
                                                            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-slate-500">
                                                                {topic.submodules.map((submodule, submoduleIndex) => <li key={`${level.id}-${index}-${submoduleIndex}`}>{submodule.title}</li>)}
                                                            </ol>
                                                        )}
                                                    </li>
                                                ))}
                                            </ol>
                                        ) : (
                                            <p className="whitespace-pre-wrap text-xs text-slate-500">{level.syllabus || 'No syllabus outline added.'}</p>
                                        )}
                                    </div>
                                    {level.syllabus_outline?.length && level.syllabus && <p className="mt-3 whitespace-pre-wrap text-xs text-slate-500"><strong>Additional notes:</strong> {level.syllabus}</p>}
                                    <p className="mt-3 text-xs"><strong>Facilitators:</strong> {level.facilitators.map((item) => item.name).join(', ') || 'Not assigned'}</p>
                                    <p className="mt-1 text-xs"><strong>Prerequisites:</strong> {level.prerequisites.map((item) => item.name).join(', ') || 'None'}</p>
                                    {canDraft && ['draft', 'changes_requested'].includes(program.status) && (isManager || program.created_by === user?.id) && <button onClick={() => beginLevelEdit(program, level)} className="mt-4 rounded-lg border bg-white px-3 py-2 text-xs font-bold text-viva-blue"><Pencil className="mr-1 inline h-4 w-4" />Edit Level</button>}
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
