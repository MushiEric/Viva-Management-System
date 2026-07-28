import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookCheck, CheckCircle2, ClipboardCheck, FileText, FlaskConical } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface EnrollmentSummary {
    id: number;
    status: string;
    progress_percentage: string;
    trainee: { trainee_number: string; full_name: string };
    cohort: { name: string; program_level?: { name: string; program: { name: string } } };
}

interface LearningDetail extends EnrollmentSummary {
    assessments: Array<{ id: number; title: string; percentage: string; feedback: string | null }>;
    practical_works: Array<{ id: number; title: string; percentage: string | null; outcome: string | null }>;
    notes: Array<{ id: number; note: string; created_at: string }>;
    attendance_records: Array<{ id: number; session_date: string; status: string }>;
}

export default function Learning() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const canComplete = user?.role === 'manager' || user?.role === 'admin';
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [assessment, setAssessment] = useState({ title: '', percentage: '', feedback: '' });
    const [practical, setPractical] = useState({ title: '', percentage: '', outcome: '' });
    const [note, setNote] = useState('');
    const [attendance, setAttendance] = useState({ session_date: '', status: 'present', notes: '' });
    const [progress, setProgress] = useState({ percentage: 0, status: 'ongoing' });

    const enrollmentsQuery = useQuery({ queryKey: ['learning-enrollments'], queryFn: api.getLearningEnrollments });
    const detailQuery = useQuery({ queryKey: ['learning-enrollment', selectedId], queryFn: () => api.getLearningEnrollment(selectedId!), enabled: !!selectedId });
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['learning-enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['learning-enrollment', selectedId] });
    };
    const mutation = (action: () => Promise<any>, message: string, reset?: () => void) => useMutation({
        mutationFn: action,
        onSuccess: () => {
            refresh();
            reset?.();
            toast.success(message);
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const addAssessment = mutation(
        () => api.addAssessment(selectedId!, { ...assessment, percentage: Number(assessment.percentage) }),
        'Assessment recorded.',
        () => setAssessment({ title: '', percentage: '', feedback: '' }),
    );
    const addPractical = mutation(
        () => api.addPracticalWork(selectedId!, { ...practical, percentage: practical.percentage ? Number(practical.percentage) : null }),
        'Practical work recorded.',
        () => setPractical({ title: '', percentage: '', outcome: '' }),
    );
    const addNote = mutation(() => api.addLearningNote(selectedId!, note), 'Note recorded.', () => setNote(''));
    const addAttendance = mutation(() => api.recordAttendance(selectedId!, attendance), 'Attendance recorded.');
    const updateProgress = mutation(() => api.updateLearningProgress(selectedId!, progress.percentage, progress.status), 'Progress updated.');
    const complete = mutation(() => api.completeEnrollment(selectedId!), 'Enrollment completed and certificate queued.');

    const enrollments = (enrollmentsQuery.data?.data?.data || []) as EnrollmentSummary[];
    const detail = detailQuery.data?.data as LearningDetail | undefined;

    const submit = (event: FormEvent, action: () => void) => {
        event.preventDefault();
        action();
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold">Learning Progress</h1>
                <p className="mt-1 text-sm text-slate-500">Record assessments, practical work, notes, optional attendance, and individual progress.</p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    {enrollments.map((enrollment) => (
                        <button key={enrollment.id} onClick={() => { setSelectedId(enrollment.id); setProgress({ percentage: Number(enrollment.progress_percentage), status: enrollment.status }); }} className={`block w-full border-b p-4 text-left hover:bg-slate-50 ${selectedId === enrollment.id ? 'bg-blue-50' : ''}`}>
                            <p className="font-bold">{enrollment.trainee.full_name}</p>
                            <p className="text-xs text-slate-500">{enrollment.cohort.program_level?.program.name || 'Program'} — {enrollment.cohort.program_level?.name || enrollment.cohort.name}</p>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-viva-green" style={{ width: `${enrollment.progress_percentage}%` }} /></div>
                            <p className="mt-1 text-xs">{enrollment.progress_percentage}% · {enrollment.status}</p>
                        </button>
                    ))}
                </section>

                {!detail ? (
                    <section className="rounded-2xl border bg-white py-20 text-center text-slate-400"><BookCheck className="mx-auto mb-3 h-12 w-12" /><p>Select an enrollment to manage learning progress.</p></section>
                ) : (
                    <div className="space-y-6">
                        <section className="rounded-2xl border bg-white p-6 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div><h2 className="font-display text-2xl font-extrabold">{detail.trainee.full_name}</h2><p className="text-sm text-slate-500">{detail.trainee.trainee_number} · {detail.cohort.name}</p></div>
                                {canComplete && !['completed', 'withdrawn', 'transferred'].includes(detail.status) && <button onClick={() => complete.mutate()} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white"><CheckCircle2 className="mr-1 inline h-4 w-4" />Mark Completed</button>}
                            </div>
                            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                                <input type="range" min="0" max="99" value={progress.percentage} onChange={(event) => setProgress({ ...progress, percentage: Number(event.target.value) })} />
                                <select className="rounded-xl border p-3" value={progress.status} onChange={(event) => setProgress({ ...progress, status: event.target.value })}><option value="pending">Pending</option><option value="active">Active</option><option value="ongoing">Ongoing</option><option value="paused">Paused</option></select>
                                <button onClick={() => updateProgress.mutate()} className="rounded-xl bg-viva-blue px-4 py-2 font-bold text-white">Save {progress.percentage}%</button>
                            </div>
                        </section>

                        <div className="grid gap-6 xl:grid-cols-2">
                            <form onSubmit={(event) => submit(event, () => addAssessment.mutate())} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
                                <h3 className="flex items-center gap-2 font-bold"><ClipboardCheck className="h-5 w-5 text-viva-blue" />Percentage Assessment</h3>
                                <input required className="w-full rounded-xl border p-3" placeholder="Assessment title" value={assessment.title} onChange={(event) => setAssessment({ ...assessment, title: event.target.value })} />
                                <input required type="number" min="0" max="100" className="w-full rounded-xl border p-3" placeholder="Percentage" value={assessment.percentage} onChange={(event) => setAssessment({ ...assessment, percentage: event.target.value })} />
                                <textarea className="w-full rounded-xl border p-3" placeholder="Feedback" value={assessment.feedback} onChange={(event) => setAssessment({ ...assessment, feedback: event.target.value })} />
                                <button className="rounded-xl bg-viva-blue px-4 py-2 font-bold text-white">Record Assessment</button>
                            </form>

                            <form onSubmit={(event) => submit(event, () => addPractical.mutate())} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
                                <h3 className="flex items-center gap-2 font-bold"><FlaskConical className="h-5 w-5 text-viva-green" />Practical Work</h3>
                                <input required className="w-full rounded-xl border p-3" placeholder="Practical task" value={practical.title} onChange={(event) => setPractical({ ...practical, title: event.target.value })} />
                                <input type="number" min="0" max="100" className="w-full rounded-xl border p-3" placeholder="Percentage (optional)" value={practical.percentage} onChange={(event) => setPractical({ ...practical, percentage: event.target.value })} />
                                <textarea className="w-full rounded-xl border p-3" placeholder="Outcome" value={practical.outcome} onChange={(event) => setPractical({ ...practical, outcome: event.target.value })} />
                                <button className="rounded-xl bg-viva-green px-4 py-2 font-bold text-white">Record Practical Work</button>
                            </form>

                            <form onSubmit={(event) => submit(event, () => addNote.mutate())} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
                                <h3 className="flex items-center gap-2 font-bold"><FileText className="h-5 w-5 text-amber-500" />Facilitator Note</h3>
                                <textarea required className="min-h-28 w-full rounded-xl border p-3" placeholder="Learning observation or recommendation" value={note} onChange={(event) => setNote(event.target.value)} />
                                <button className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white">Add Note</button>
                            </form>

                            <form onSubmit={(event) => submit(event, () => addAttendance.mutate())} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
                                <h3 className="font-bold">Optional Attendance</h3>
                                <input required type="date" className="w-full rounded-xl border p-3" value={attendance.session_date} onChange={(event) => setAttendance({ ...attendance, session_date: event.target.value })} />
                                <select className="w-full rounded-xl border p-3" value={attendance.status} onChange={(event) => setAttendance({ ...attendance, status: event.target.value })}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select>
                                <button className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white">Save Attendance</button>
                            </form>
                        </div>

                        <section className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Assessments</h3>{detail.assessments.map((item) => <div key={item.id} className="mt-3 border-t pt-3 text-sm"><strong>{item.title}</strong><span className="float-right font-bold text-viva-blue">{item.percentage}%</span><p className="text-slate-500">{item.feedback}</p></div>)}</div>
                            <div className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Practical Work</h3>{detail.practical_works.map((item) => <div key={item.id} className="mt-3 border-t pt-3 text-sm"><strong>{item.title}</strong><span className="float-right font-bold text-viva-green">{item.percentage ? `${item.percentage}%` : 'Recorded'}</span><p className="text-slate-500">{item.outcome}</p></div>)}</div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
