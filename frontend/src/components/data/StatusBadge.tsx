export function StatusBadge({ value }: { value: string }) {
    const tone = ['approved', 'active', 'completed', 'ongoing'].includes(value)
        ? 'bg-emerald-100 text-emerald-800'
        : value === 'pending'
            ? 'bg-amber-100 text-amber-800'
            : value === 'paused'
                ? 'bg-sky-100 text-sky-800'
                : 'bg-slate-100 text-slate-600'

    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tone}`}>{value}</span>
}
