import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Add, Call, Eye, SearchNormal1, Trash } from 'iconsax-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/lib/toast'
import { confirmToast } from '@/components/ConfirmToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataColumn } from '@/components/data/DataTable'
import { StatusBadge } from '@/components/data/StatusBadge'

interface StaffMember {
    id: number
    name: string
    email: string
    phone: string | null
    role: 'manager' | 'admin' | 'facilitator'
    status: 'pending' | 'approved' | 'inactive'
    deleted_at: string | null
}

export default function Staff() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const currentUser = useAuthStore((state) => state.user)
    const isManager = currentUser?.role === 'manager'
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')

    const staffQuery = useQuery({ queryKey: ['staff'], queryFn: api.getStaff })
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['staff'] })

    const approveStaffMutation = useMutation({
        mutationFn: api.approveStaff,
        onSuccess: () => {
            refresh()
            toast.success('Staff account approved.')
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const deactivateStaffMutation = useMutation({
        mutationFn: api.deactivateStaff,
        onSuccess: () => {
            refresh()
            toast.success('Staff account deactivated.')
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const staff = (staffQuery.data?.data?.data || []) as StaffMember[]
    const filtered = useMemo(() => staff.filter((member) => {
        if (roleFilter !== 'all' && member.role !== roleFilter) return false
        const query = search.trim().toLowerCase()
        if (!query) return true
        return member.name.toLowerCase().includes(query)
            || member.email.toLowerCase().includes(query)
            || (member.phone || '').includes(query)
    }), [staff, roleFilter, search])

    const columns: DataColumn<StaffMember>[] = [
        {
            key: 'name',
            header: 'Staff member',
            cell: (member) => (
                <div className={member.deleted_at ? 'opacity-60' : undefined}>
                    <p className="font-bold text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                </div>
            ),
        },
        {
            key: 'phone',
            header: 'Phone',
            cell: (member) => member.phone ? (
                <a href={`tel:${member.phone}`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1.5 font-semibold hover:text-viva-blue">
                    <Call variant="Bold" size={14} color="currentColor" />
                    {member.phone}
                </a>
            ) : <span className="text-slate-400">Not provided</span>,
        },
        { key: 'role', header: 'Role', cell: (member) => <span className="text-xs font-bold tracking-wide text-viva-blue uppercase">{member.role}</span> },
        { key: 'status', header: 'Status', cell: (member) => <StatusBadge value={member.deleted_at ? 'inactive' : member.status} /> },
        {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            cell: (member) => (
                <div className="flex flex-wrap justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                    <Button type="button" size="sm" className="h-8" onClick={() => navigate(`/staff/${member.id}`)}>
                        <Eye variant="Bold" size={14} color="currentColor" /> View
                    </Button>
                    {isManager && member.status === 'pending' && !member.deleted_at ? (
                        <Button type="button" size="sm" className="h-8 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => approveStaffMutation.mutate(member.id)}>
                            Approve
                        </Button>
                    ) : null}
                    {!member.deleted_at && member.id !== currentUser?.id ? (
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="text-red-600"
                            aria-label={`Deactivate ${member.name}`}
                            onClick={() => confirmToast({
                                title: `Deactivate ${member.name}?`,
                                message: 'The staff member will lose portal access and their active tokens will be revoked.',
                                confirmLabel: 'Deactivate staff',
                                onConfirm: () => deactivateStaffMutation.mutate(member.id),
                            })}
                        >
                            <Trash variant="Bold" size={14} color="currentColor" />
                        </Button>
                    ) : null}
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Staff"
                description="Staff accounts waiting for approval, active users, and people who no longer have access."
                actions={(
                    <Button asChild className="h-10 px-4 font-bold">
                        <Link to="/staff/new"><Add variant="Bold" size={16} color="currentColor" /> Add staff</Link>
                    </Button>
                )}
            />

            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_14rem]">
                <FormField id="staff-search" label="Search staff">
                    <div className="relative">
                        <SearchNormal1 variant="Bold" size={16} color="currentColor" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                        <Input id="staff-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, or phone" className="h-11 pl-10" />
                    </div>
                </FormField>
                <FormField id="staff-role" label="Role">
                    <select id="staff-role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-medium capitalize">
                        <option value="all">All roles</option>
                        <option value="facilitator">Facilitator</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                    </select>
                </FormField>
            </div>

            {staffQuery.isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {(staffQuery.error as Error).message || 'Unable to load staff.'}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    rows={filtered}
                    rowKey={(row) => row.id}
                    loading={staffQuery.isLoading}
                    emptyTitle="No staff accounts match this view"
                    emptyDescription="Add a staff member to give them portal access."
                    onRowClick={(row) => navigate(`/staff/${row.id}`)}
                />
            )}
        </div>
    )
}
