import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { toast } from '@/lib/toast'
import { createStaffSchema, type CreateStaffInput } from '@/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'
import { PasswordField } from '@/components/form/PasswordField'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner } from '@/components/ui/spinner'

const selectClass = 'h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-medium text-slate-800 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export default function StaffAdd() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const form = useForm<CreateStaffInput>({
        resolver: zodResolver(createStaffSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            role: 'facilitator',
            password: '',
            password_confirmation: '',
        },
    })

    const createStaff = useMutation({
        mutationFn: api.createStaff,
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            toast.success('Staff account created and awaiting manager approval.')
            const createdId = response?.data?.id
            navigate(createdId ? `/staff/${createdId}` : '/staff')
        },
        onError: (error: Error) => toast.error(error.message),
    })

    return (
        <div className="space-y-6">
            <PageHeader
                title="Add staff"
                description="Create a portal account. A manager still has to approve it before the person can sign in."
                backTo="/staff"
                backLabel="Back to staff"
            />

            <form
                onSubmit={form.handleSubmit((values) => createStaff.mutate(values))}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8"
                noValidate
            >
                <div className="grid gap-6 lg:grid-cols-2">
                    <FormField id="staff-name" label="Full name" required error={form.formState.errors.name?.message}>
                        <Input id="staff-name" autoComplete="name" placeholder="Full name" className="h-11" aria-invalid={!!form.formState.errors.name} {...form.register('name')} />
                    </FormField>
                    <FormField id="staff-email" label="Email address" required error={form.formState.errors.email?.message}>
                        <Input id="staff-email" type="email" autoComplete="email" placeholder="name@vivadigital.co.tz" className="h-11" aria-invalid={!!form.formState.errors.email} {...form.register('email')} />
                    </FormField>
                    <FormField id="staff-phone" label="Phone number" hint="Optional" error={form.formState.errors.phone?.message}>
                        <Input id="staff-phone" type="tel" autoComplete="tel" placeholder="+255 7XX XXX XXX" className="h-11" {...form.register('phone')} />
                    </FormField>
                    <FormField id="staff-role" label="Role" required error={form.formState.errors.role?.message}>
                        <select id="staff-role" className={selectClass} {...form.register('role')}>
                            <option value="facilitator">Facilitator</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                        </select>
                    </FormField>
                    <PasswordField
                        id="staff-password"
                        label="Temporary password"
                        autoComplete="new-password"
                        placeholder="Temporary password"
                        hint="At least 8 characters, with uppercase, lowercase, a number, and a symbol."
                        registration={form.register('password')}
                        error={form.formState.errors.password?.message}
                    />
                    <PasswordField
                        id="staff-password-confirmation"
                        label="Confirm password"
                        autoComplete="new-password"
                        placeholder="Re-enter the password"
                        registration={form.register('password_confirmation')}
                        error={form.formState.errors.password_confirmation?.message}
                    />
                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end lg:col-span-2">
                        <Button type="button" variant="outline" className="h-11" onClick={() => navigate('/staff')}>Cancel</Button>
                        <Button type="submit" disabled={createStaff.isPending} className="h-11 px-6 font-bold">
                            {createStaff.isPending ? <Spinner /> : null}
                            {createStaff.isPending ? 'Creating account...' : 'Create staff account'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
