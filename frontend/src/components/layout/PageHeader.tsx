import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft2 } from 'iconsax-react'

interface PageHeaderProps {
    title: string
    description?: string
    backTo?: string
    backLabel?: string
    actions?: ReactNode
}

export function PageHeader({ title, description, backTo, backLabel = 'Back', actions }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                {backTo ? (
                    <Link to={backTo} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-viva-blue hover:underline">
                        <ArrowLeft2 variant="Bold" size={16} color="currentColor" />
                        {backLabel}
                    </Link>
                ) : null}
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
                {description ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    )
}
