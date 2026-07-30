import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
}

export function confirmToast({
    title,
    message,
    confirmLabel = 'Confirm',
    onConfirm,
}: ConfirmationOptions) {
    toast.custom((toastItem) => (
        <div className={`${toastItem.visible ? 'animate-enter' : 'animate-leave'} w-[min(92vw,420px)] rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl`}>
            <div className="flex gap-3">
                <div className="rounded-full bg-amber-100 p-2 text-amber-700"><AlertTriangle className="h-5 w-5" /></div>
                <div className="flex-1">
                    <p className="font-display font-bold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{message}</p>
                    <div className="mt-4 flex justify-end gap-2">
                        <button onClick={() => toast.dismiss(toastItem.id)} className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
                        <button
                            onClick={() => {
                                toast.dismiss(toastItem.id);
                                onConfirm();
                            }}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ), { duration: Infinity, position: 'top-center' });
}
