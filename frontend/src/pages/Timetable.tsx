import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Calendar, MapPin, Users } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface SyllabusTopic {
    title: string;
    submodules?: Array<{ title: string }>;
}

interface Cohort {
    cohort_id: number;
    cohort_name: string;
    cohort: {
        id: number;
        name: string;
        display_name: string;
    };
    program: {
        id: number | null;
        name: string | null;
    };
    level: {
        id: number | null;
        name: string | null;
        description: string | null;
        syllabus_outline: SyllabusTopic[];
        fee_tzs: string | null;
    };
    schedule_window: 'morning' | 'afternoon' | 'evening' | 'weekend' | 'custom';
    start_date: string | null;
    end_date: string | null;
    schedule_days: Array<{
        day_of_week: number;
        day_name: string;
        start_time: string;
        end_time: string;
    }>;
    facilitators: Array<{ id: number; name: string }>;
    capacity: {
        max_seats: number;
        occupied_seats: number;
        available_seats: number;
        status: 'available' | 'full';
    };
}

const emptyCohorts: Cohort[] = [];
const formatTime = (time: string) => time.slice(0, 5);
const formatDate = (date: string | null) => date
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
    : 'Date to be confirmed';

export default function Timetable() {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
    const { data: response, isLoading, isError, error } = useQuery({
        queryKey: ['timetable'],
        queryFn: api.getTimetable,
        refetchInterval: 10_000,
    });

    const cohorts = (response?.data as Cohort[] | undefined) ?? emptyCohorts;
    const selectedCohort = cohorts.find((cohort) => cohort.cohort_id === selectedCohortId) || cohorts[0];

    useEffect(() => {
        if (cohorts.length > 0 && !cohorts.some((cohort) => cohort.cohort_id === selectedCohortId)) {
            setSelectedCohortId(cohorts[0].cohort_id);
        }
    }, [cohorts, selectedCohortId]);

    const handleEnrollClick = (cohortId: number) => {
        navigate(isAuthenticated ? `/enroll?cohort_id=${cohortId}` : `/login?cohort_id=${cohortId}`);
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-viva-blue" />
                <p className="text-sm font-medium text-slate-400">Fetching active lab schedule...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="py-12 text-center">
                <p className="font-semibold text-red-500">Failed to load timetable details.</p>
                <p className="mt-1 text-xs text-slate-400">{(error as Error)?.message || 'Database connection error.'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="mx-auto max-w-3xl space-y-4 text-center">
              
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Timetable & Availability</h1>
                <p className="text-sm leading-relaxed text-slate-500">
                    Select a course group below to view its weekly schedule, facilitator, available computer stations, and learning roadmap.
                </p>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-red-400" />
                    Kigamboni, Dar es Salaam, Tanzania
                </div>
            </header>

            {cohorts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                    <Calendar className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                    <h3 className="mb-1 font-bold text-ink">No Active Cohorts</h3>
                    <p className="text-xs">There are currently no active training cohorts scheduled.</p>
                </div>
            ) : (
                <>
                    <section>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Choose Course Schedule</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {cohorts.map((cohort) => {
                                const active = cohort.cohort_id === selectedCohort?.cohort_id;

                                return (
                                    <button
                                        key={cohort.cohort_id}
                                        type="button"
                                        onClick={() => setSelectedCohortId(cohort.cohort_id)}
                                        className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${active ? 'border-viva-blue bg-viva-blue text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-viva-blue/40 hover:text-viva-blue'}`}
                                    >
                                        {cohort.cohort.display_name}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {selectedCohort && (
                        <>
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-4 border-b bg-slate-50 p-5">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-display text-2xl font-extrabold text-ink">{selectedCohort.program.name || selectedCohort.cohort_name}</h2>
                                            {selectedCohort.level.name && <span className="rounded-full bg-viva-blue/10 px-3 py-1 text-xs font-bold text-viva-blue">{selectedCohort.level.name}</span>}
                                          
                                        </div>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {formatDate(selectedCohort.start_date)} – {formatDate(selectedCohort.end_date)}
                                            <span className="mx-2">•</span>
                                            <span className="capitalize">{selectedCohort.schedule_window}</span>
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400">Group reference: {selectedCohort.cohort.name}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm">
                                            <Users className="h-4 w-4 text-viva-blue" />
                                            <span><strong>{selectedCohort.capacity.occupied_seats}</strong> / {selectedCohort.capacity.max_seats} stations occupied</span>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={selectedCohort.capacity.status === 'full'}
                                            onClick={() => handleEnrollClick(selectedCohort.cohort_id)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-viva-blue px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                                        >
                                            {selectedCohort.capacity.status === 'full' ? 'Fully Booked' : 'Enroll in this Cohort'}
                                            {selectedCohort.capacity.status !== 'full' && <ArrowRight className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left">
                                        <thead className="bg-slate-900 text-xs uppercase tracking-wider text-white">
                                            <tr>
                                                <th className="px-5 py-4">Day</th>
                                                <th className="px-5 py-4">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedCohort.schedule_days.map((day) => (
                                                <tr key={day.day_of_week} className="transition hover:bg-slate-50">
                                                    <td className="px-5 py-4 font-bold text-ink">{day.day_name}</td>
                                                    <td className="px-5 py-4 text-sm text-slate-600">{formatTime(day.start_time)} – {formatTime(day.end_time)}</td>
                                                </tr>
                                            ))}
                                            {selectedCohort.schedule_days.length === 0 && (
                                                <tr>
                                                    <td colSpan={2} className="px-5 py-10 text-center text-sm text-slate-400">Training days have not been assigned.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-viva-green/10 p-2.5 text-viva-green"><BookOpen className="h-5 w-5" /></div>
                                    <div>
                                        <h2 className="font-display text-xl font-extrabold">Learning Roadmap</h2>
                                        <p className="mt-1 text-sm text-slate-500">{selectedCohort.program.name} {selectedCohort.level.name ? `— ${selectedCohort.level.name}` : ''}</p>
                                    </div>
                                </div>

                                {selectedCohort.level.syllabus_outline.length > 0 ? (
                                    <ol className="mt-6 grid gap-4 md:grid-cols-2">
                                        {selectedCohort.level.syllabus_outline.map((topic, topicIndex) => (
                                            <li key={`${selectedCohort.level.id}-${topicIndex}`} className="flex gap-3 rounded-xl border bg-slate-50 p-4">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-viva-blue text-sm font-extrabold text-white">{topicIndex + 1}</span>
                                                <div>
                                                    <h3 className="font-bold text-ink">{topic.title}</h3>
                                                    {!!topic.submodules?.length && (
                                                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-500">
                                                            {topic.submodules.map((submodule, submoduleIndex) => <li key={submoduleIndex}>{submodule.title}</li>)}
                                                        </ol>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <p className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">The learning roadmap has not been published yet.</p>
                                )}
                            </section>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
