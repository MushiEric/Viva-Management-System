import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
    id: string
    label: string
    required?: boolean
    hint?: string
    error?: string
    className?: string
    labelAction?: ReactNode
    children: ReactNode
}

export function FormField({ id, label, required, hint, error, className, labelAction, children }: FormFieldProps) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <div className="flex items-center justify-between gap-3">
                <Label htmlFor={id} className="text-sm font-semibold text-slate-800">
                    {label}
                    {required ? <span className="text-red-600">*</span> : null}
                </Label>
                {labelAction}
            </div>
            {children}
            {error ? <p className="text-xs font-medium text-red-600">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
    )
}
