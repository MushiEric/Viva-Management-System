import { useState, type ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Eye, EyeSlash, Lock } from 'iconsax-react'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'

interface PasswordFieldProps {
    id: string
    label: string
    registration: UseFormRegisterReturn
    error?: string
    autoComplete?: string
    placeholder?: string
    hint?: string
    labelAction?: ReactNode
}

export function PasswordField({ id, label, registration, error, autoComplete, placeholder, hint, labelAction }: PasswordFieldProps) {
    const [visible, setVisible] = useState(false)

    return (
        <FormField id={id} label={label} required error={error} hint={hint} labelAction={labelAction}>
            <div className="relative">
                <Lock variant="Bold" size={18} color="currentColor" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                <Input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    aria-invalid={!!error}
                    className="h-11 pr-11 pl-10"
                    {...registration}
                />
                <button
                    type="button"
                    onClick={() => setVisible((open) => !open)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                >
                    {visible
                        ? <EyeSlash variant="Bold" size={18} color="currentColor" />
                        : <Eye variant="Bold" size={18} color="currentColor" />}
                </button>
            </div>
        </FormField>
    )
}
