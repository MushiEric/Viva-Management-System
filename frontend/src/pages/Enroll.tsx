import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookOpen, CheckCircle2, UserPlus } from 'lucide-react';
import { api } from '../services/api';

interface Cohort {
    cohort_id: number;
    cohort_name: string;
    course: { name: string };
    capacity: { available_seats: number; status: string };
}

interface Trainee {
    id: number;
    trainee_number: string;
    full_name: string;
}

export default function Enroll() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    const locationState = location.state as { traineeId?: number } | undefined;
    const [cohortId, setCohortId] = useState(0);
    const [traineeId, setTraineeId] = useState<number>(locationState?.traineeId || 0);

    const timetable = useQuery({ queryKey: ['timetable'], queryFn: api.getTimetable });
    const trainees = useQuery({ queryKey: ['trainee-options'], queryFn: api.getTraineeOptions });

    useEffect(() => {
        if (locationState?.traineeId) {
            setTraineeId(locationState.traineeId);
        }
    }, [locationState]);

    const enrollMutation = useMutation({
        mutationFn: () => api.enroll({ cohort_id: cohortId, trainee_id: traineeId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
            queryClient.invalidateQueries({ queryKey: ['trainees'] });
            toast.success('Student successfully enrolled into cohort session.');
            navigate(`/trainees/${traineeId}`);
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const submitEnrollment = (event: FormEvent) => {
        event.preventDefault();
        enrollMutation.mutate();
    };

    const cohortList = (timetable.data?.data || []) as Cohort[];
    const traineeList = (trainees.data?.data || []) as Trainee[];
    const selectedTrainee = traineeList.find((t) => t.id === traineeId);
    const selectedCohort = cohortList.find((c) => c.cohort_id === cohortId);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="font-display text-3xl font-extrabold text-ink">Enroll Student into Cohort</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Select a registered student and assign them to an active training cohort session.
                </p>
            </div>

            {/* Dedicated Enrollment Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <form onSubmit={submitEnrollment} className="space-y-6">
                    {/* Step 1: Trainee Selection */}
                    <div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <label htmlFor="select_trainee" className="font-display text-base font-bold text-ink">
                                1. Select Student / Trainee <span className="text-red-500">*</span>
                            </label>

                            <Link
                                to="/trainees/new"
                                className="inline-flex items-center gap-1 text-xs font-bold text-viva-blue hover:underline"
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>+ Register New Student</span>
                            </Link>
                        </div>

                        <div className="mt-3">
                            <select
                                id="select_trainee"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                value={traineeId}
                                onChange={(e) => setTraineeId(Number(e.target.value))}
                            >
                                <option value={0}>Choose a registered student...</option>
                                {traineeList.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.trainee_number} — {t.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Step 2: Cohort Selection */}
                    <div>
                        <div className="border-b pb-2">
                            <label htmlFor="select_cohort" className="font-display text-base font-bold text-ink">
                                2. Select Training Cohort Session <span className="text-red-500">*</span>
                            </label>
                        </div>

                        <div className="mt-3">
                            <select
                                id="select_cohort"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-viva-blue focus:ring-1 focus:ring-viva-blue"
                                value={cohortId}
                                onChange={(e) => setCohortId(Number(e.target.value))}
                            >
                                <option value={0}>Choose an available cohort session...</option>
                                {cohortList.map((cohort) => (
                                    <option
                                        key={cohort.cohort_id}
                                        value={cohort.cohort_id}
                                        disabled={cohort.capacity.status === 'full'}
                                    >
                                        {cohort.course.name} — {cohort.cohort_name} ({cohort.capacity.available_seats} seats available)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Enrollment Confirmation Summary */}
                    {selectedTrainee && selectedCohort && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs">
                            <div className="flex items-center gap-2 font-bold text-viva-blue">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Enrollment Summary</span>
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2 text-slate-700">
                                <p><strong>Student:</strong> {selectedTrainee.full_name} ({selectedTrainee.trainee_number})</p>
                                <p><strong>Course:</strong> {selectedCohort.course.name}</p>
                                <p><strong>Cohort:</strong> {selectedCohort.cohort_name}</p>
                                <p><strong>Seats Available:</strong> {selectedCohort.capacity.available_seats} spots</p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => navigate('/trainees')}
                            className="inline-flex justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 font-display text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={!traineeId || !cohortId || enrollMutation.isPending}
                            className="inline-flex justify-center items-center gap-2 rounded-xl bg-viva-blue px-8 py-3 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition hover:bg-slate-900 disabled:opacity-50"
                        >
                            <BookOpen className="h-4 w-4" />
                            <span>{enrollMutation.isPending ? 'Confirming Enrollment...' : 'Confirm Cohort Enrollment'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
