import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/data/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'

interface EnrollmentDetailRecord {
    id: number
    status: string
    progress_percentage: string | number
    enrolled_at?: string | null
    completed_at?: string | null
    trainee: { id?: number; trainee_number: string; full_name: string; email?: string | null; phone?: string | null } | null
    cohort: { id?: number; name: string; program_level?: { name: string; program?: { name: string } } } | null
}

function formatDate(value?: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : format(date, 'dd MMM yyyy')
}

export default function EnrollmentDetail() {
    const { id } = useParams()
    const enrollmentId = Number(id)
    const detailQuery = useQuery({
        queryKey: ['learning-enrollment', enrollmentId],
        queryFn: () => api.getLearningEnrollment(enrollmentId),
        enabled: Number.isFinite(enrollmentId),
    })

    if (detailQuery.isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        )
    }

    if (detailQuery.isError || !detailQuery.data?.data) {
        return (
            <div className="space-y-4">
                <PageHeader title="Enrollment not found" backTo="/enroll" backLabel="Back to enrollments" />
                <p className="text-sm text-slate-500">{(detailQuery.error as Error | null)?.message || 'This enrollment record is not available.'}</p>
            </div>
        )
    }

    const enrollment = detailQuery.data.data as EnrollmentDetailRecord
    const program = enrollment.cohort?.program_level?.program?.name
    const level = enrollment.cohort?.program_level?.name

    return (
        <div className="space-y-6">
            <PageHeader
                title={enrollment.trainee?.full_name || 'Student record unavailable'}
                description={enrollment.trainee?.trainee_number || 'This enrollment has no linked student.'}
                backTo="/enroll"
                backLabel="Back to enrollments"
                actions={<StatusBadge value={enrollment.status} />}
            />

            {!enrollment.trainee ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    The student linked to this enrollment is missing, so their name cannot be shown.
                </div>
            ) : null}

            <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem label="Program" value={program || '—'} />
                <DetailItem label="Level" value={level || '—'} />
                <DetailItem label="Cohort" value={enrollment.cohort?.name || 'Cohort unavailable'} />
                <DetailItem label="Progress" value={`${enrollment.progress_percentage ?? 0}%`} />
                <DetailItem label="Enrolled on" value={formatDate(enrollment.enrolled_at)} />
                <DetailItem label="Completed on" value={formatDate(enrollment.completed_at)} />
                <DetailItem label="Email" value={enrollment.trainee?.email || '—'} />
                <DetailItem label="Phone" value={enrollment.trainee?.phone || '—'} />
            </section>

            <div className="flex flex-wrap gap-3">
                {enrollment.trainee?.id ? (
                    <Button asChild variant="outline" className="h-10">
                        <Link to={`/trainees/${enrollment.trainee.id}`}>Open student profile</Link>
                    </Button>
                ) : null}
                <Button asChild className="h-10">
                    <Link to="/enroll/new">Enroll another student</Link>
                </Button>
            </div>
        </div>
    )
}

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
        </div>
    )
}
