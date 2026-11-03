import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { toast } from '@/lib/toast'
import { staffEnrollmentSchema, type StaffEnrollmentInput } from '@/utils/validation'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/form/FormField'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'

interface CohortOption {
    cohort_id: number
    cohort_name: string
    course: { name: string }
    capacity: { available_seats: number; status: string }
}

interface TraineeOption {
    id: number
    trainee_number: string
    full_name: string
}

const selectClass = 'h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-medium text-slate-800 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export default function Enroll() {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const queryClient = useQueryClient()
    const locationState = location.state as { traineeId?: number } | null
    const presetTrainee = Number(searchParams.get('trainee_id') || locationState?.traineeId || 0)
    const presetCohort = Number(searchParams.get('cohort_id') || 0)

    const timetable = useQuery({ queryKey: ['timetable'], queryFn: api.getTimetable })
    const trainees = useQuery({ queryKey: ['trainee-options'], queryFn: api.getTraineeOptions })

    const form = useForm<StaffEnrollmentInput>({
        resolver: zodResolver(staffEnrollmentSchema),
        defaultValues: {
            trainee_id: presetTrainee || Number.NaN,
            cohort_id: presetCohort || Number.NaN,
        },
    })

    useEffect(() => {
        if (presetTrainee) form.setValue('trainee_id', presetTrainee)
        if (presetCohort) form.setValue('cohort_id', presetCohort)
    }, [presetTrainee, presetCohort, form])

    const enrollMutation = useMutation({
        mutationFn: (values: StaffEnrollmentInput) => api.enroll(values),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['timetable'] })
            queryClient.invalidateQueries({ queryKey: ['trainees'] })
            queryClient.invalidateQueries({ queryKey: ['learning-enrollments'] })
            toast.success('Student enrolled into the cohort.')
            const createdId = response?.data?.id
            navigate(createdId ? `/enroll/${createdId}` : '/enroll')
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const cohortList = (timetable.data?.data || []) as CohortOption[]
    const traineeList = (trainees.data?.data || []) as TraineeOption[]
    const traineeId = form.watch('trainee_id')
    const cohortId = form.watch('cohort_id')
    const selectedTrainee = traineeList.find((item) => item.id === traineeId)
    const selectedCohort = cohortList.find((item) => item.cohort_id === cohortId)
    const loadingOptions = timetable.isLoading || trainees.isLoading

    return (
        <div className="space-y-6">
            <PageHeader
                title="Enroll a student"
                description="Choose a registered student and an open cohort. The form uses the full workspace so every field stays labeled."
                backTo="/enroll"
                backLabel="Back to enrollments"
                actions={(
                    <Button asChild variant="outline" className="h-10">
                        <Link to="/trainees/new">Register a new student</Link>
                    </Button>
                )}
            />

            <form onSubmit={form.handleSubmit((values) => enrollMutation.mutate(values))} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8" noValidate>
                {loadingOptions ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <FormField id="trainee_id" label="Student" required error={form.formState.errors.trainee_id?.message}>
                            <select id="trainee_id" className={selectClass} aria-invalid={!!form.formState.errors.trainee_id} {...form.register('trainee_id', { valueAsNumber: true })}>
                                <option value="">Select a registered student</option>
                                {traineeList.map((trainee) => (
                                    <option key={trainee.id} value={trainee.id}>{trainee.trainee_number} — {trainee.full_name}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField id="cohort_id" label="Cohort" required error={form.formState.errors.cohort_id?.message}>
                            <select id="cohort_id" className={selectClass} aria-invalid={!!form.formState.errors.cohort_id} {...form.register('cohort_id', { valueAsNumber: true })}>
                                <option value="">Select an open cohort</option>
                                {cohortList.map((cohort) => (
                                    <option key={cohort.cohort_id} value={cohort.cohort_id} disabled={cohort.capacity.status === 'full'}>
                                        {cohort.course.name} — {cohort.cohort_name} ({cohort.capacity.available_seats} seats)
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        {selectedTrainee && selectedCohort ? (
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700 lg:col-span-2">
                                <p className="font-bold text-viva-blue">Enrollment summary</p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <p><span className="font-semibold">Student:</span> {selectedTrainee.full_name} ({selectedTrainee.trainee_number})</p>
                                    <p><span className="font-semibold">Course:</span> {selectedCohort.course.name}</p>
                                    <p><span className="font-semibold">Cohort:</span> {selectedCohort.cohort_name}</p>
                                    <p><span className="font-semibold">Seats left:</span> {selectedCohort.capacity.available_seats}</p>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end lg:col-span-2">
                            <Button type="button" variant="outline" className="h-11" onClick={() => navigate('/enroll')}>Cancel</Button>
                            <Button type="submit" disabled={enrollMutation.isPending} className="h-11 px-6 font-bold">
                                {enrollMutation.isPending ? <Spinner /> : null}
                                {enrollMutation.isPending ? 'Enrolling...' : 'Confirm enrollment'}
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    )
}
