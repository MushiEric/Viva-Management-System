import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Add, SearchNormal1 } from 'iconsax-react'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataColumn } from '@/components/data/DataTable'
import { StatusBadge } from '@/components/data/StatusBadge'

interface EnrollmentRow {
    id: number
    status: string
    progress_percentage: string | number
    enrolled_at?: string | null
    trainee: { trainee_number: string; full_name: string } | null
    cohort: { name: string; program_level?: { name: string; program?: { name: string } } } | null
}

const statuses = ['all', 'pending', 'active', 'ongoing', 'paused', 'completed', 'withdrawn', 'transferred']

function programLabel(row: EnrollmentRow) {
    const level = row.cohort?.program_level
    const program = level?.program?.name
    if (program && level?.name) return `${program} — ${level.name}`
    return row.cohort?.name || 'Cohort unavailable'
}

export default function Enrollments() {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')

    const enrollmentsQuery = useQuery({
        queryKey: ['learning-enrollments', status],
        queryFn: () => api.getLearningEnrollments(status === 'all' ? undefined : { status }),
    })

    const rows = ((enrollmentsQuery.data?.data?.data || []) as EnrollmentRow[])
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return rows
        return rows.filter((row) => {
            const haystack = [
                row.trainee?.full_name,
                row.trainee?.trainee_number,
                row.cohort?.name,
                programLabel(row),
            ].filter(Boolean).join(' ').toLowerCase()
            return haystack.includes(query)
        })
    }, [rows, search])

    const columns: DataColumn<EnrollmentRow>[] = [
        {
            key: 'student',
            header: 'Student',
            cell: (row) => (
                <div>
                    <p className="font-bold text-slate-900">{row.trainee?.full_name || 'Student record unavailable'}</p>
                    <p className="text-xs text-slate-500">{row.trainee?.trainee_number || 'No trainee number'}</p>
                </div>
            ),
        },
        { key: 'program', header: 'Program', cell: (row) => programLabel(row) },
        { key: 'cohort', header: 'Cohort', cell: (row) => row.cohort?.name || '—' },
        { key: 'status', header: 'Status', cell: (row) => <StatusBadge value={row.status} /> },
        { key: 'progress', header: 'Progress', cell: (row) => `${row.progress_percentage ?? 0}%` },
        {
            key: 'enrolled',
            header: 'Enrolled',
            cell: (row) => row.enrolled_at ? format(new Date(row.enrolled_at), 'dd MMM yyyy') : '—',
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Student enrollments"
                description="Every student placed in a cohort. Open a record for the full enrollment, or add a new one."
                actions={(
                    <Button asChild className="h-10 px-4 font-bold">
                        <Link to="/enroll/new"><Add variant="Bold" size={16} color="currentColor" /> Enroll student</Link>
                    </Button>
                )}
            />

            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_14rem]">
                <FormField id="enrollment-search" label="Search enrollments">
                    <div className="relative">
                        <SearchNormal1 variant="Bold" size={16} color="currentColor" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                        <Input id="enrollment-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, trainee number, or cohort" className="h-11 pl-10" />
                    </div>
                </FormField>
                <FormField id="enrollment-status" label="Status">
                    <select id="enrollment-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-medium capitalize">
                        {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                </FormField>
            </div>

            {enrollmentsQuery.isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {(enrollmentsQuery.error as Error).message || 'Unable to load enrollments.'}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    rows={filtered}
                    rowKey={(row) => row.id}
                    loading={enrollmentsQuery.isLoading}
                    emptyTitle="No enrollments match this view"
                    emptyDescription="Enroll a student into an open cohort to see them here."
                    onRowClick={(row) => navigate(`/enroll/${row.id}`)}
                />
            )}
        </div>
    )
}
