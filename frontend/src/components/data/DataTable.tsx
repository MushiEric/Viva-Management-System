import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export interface DataColumn<T> {
    key: string
    header: string
    className?: string
    cell: (row: T) => ReactNode
}

interface DataTableProps<T> {
    columns: DataColumn<T>[]
    rows: T[]
    rowKey: (row: T) => string | number
    loading?: boolean
    emptyTitle: string
    emptyDescription?: string
    onRowClick?: (row: T) => void
}

export function DataTable<T>({ columns, rows, rowKey, loading, emptyTitle, emptyDescription, onRowClick }: DataTableProps<T>) {
    if (loading) {
        return (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="space-y-3 p-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-12 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    if (!rows.length) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <p className="font-display text-base font-bold text-slate-700">{emptyTitle}</p>
                {emptyDescription ? <p className="mt-1 text-sm text-slate-500">{emptyDescription}</p> : null}
            </div>
        )
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key} className={`px-4 py-3 ${column.className || ''}`}>{column.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((row) => (
                            <tr
                                key={rowKey(row)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={onRowClick ? 'cursor-pointer transition hover:bg-slate-50' : undefined}
                            >
                                {columns.map((column) => (
                                    <td key={column.key} className={`px-4 py-3 align-middle text-slate-700 ${column.className || ''}`}>
                                        {column.cell(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
                {rows.map((row) => (
                    <article
                        key={rowKey(row)}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={`space-y-2 p-4 ${onRowClick ? 'cursor-pointer' : ''}`}
                    >
                        {columns.map((column) => (
                            <div key={column.key} className="grid grid-cols-[7.5rem_1fr] gap-3 text-sm">
                                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">{column.header}</p>
                                <div className="min-w-0 text-slate-800">{column.cell(row)}</div>
                            </div>
                        ))}
                    </article>
                ))}
            </div>
        </div>
    )
}
