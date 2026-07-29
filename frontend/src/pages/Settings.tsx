import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, Globe2, MapPin, Phone, Save } from 'lucide-react';
import { api } from '../services/api';

const emptySettings = {
    brand_name: '',
    phone: '',
    location: '',
    website: '',
    email: '',
    tin: '',
    bank_name: '',
    account_name: '',
    account_number: '',
    mobile_money: '',
};

export default function Settings() {
    const queryClient = useQueryClient();
    const [form, setForm] = useState(emptySettings);
    const settingsQuery = useQuery({
        queryKey: ['system-settings'],
        queryFn: api.getSystemSettings,
    });

    useEffect(() => {
        if (settingsQuery.data?.data) {
            setForm({
                brand_name: settingsQuery.data.data.brand_name || '',
                phone: settingsQuery.data.data.phone || '',
                location: settingsQuery.data.data.location || '',
                website: settingsQuery.data.data.website || '',
                email: settingsQuery.data.data.email || '',
                tin: settingsQuery.data.data.tin || '',
                bank_name: settingsQuery.data.data.bank_name || '',
                account_name: settingsQuery.data.data.account_name || '',
                account_number: settingsQuery.data.data.account_number || '',
                mobile_money: settingsQuery.data.data.mobile_money || '',
            });
        }
    }, [settingsQuery.data]);

    const updateSettings = useMutation({
        mutationFn: api.updateSystemSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-settings'] });
            toast.success('System settings updated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        updateSettings.mutate(form);
    };

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold text-ink">System Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Manage the company identity and contact information used by the portal.
                </p>
            </header>

            {settingsQuery.isLoading ? (
                <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">
                    Loading settings...
                </div>
            ) : settingsQuery.isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
                    {(settingsQuery.error as Error).message}
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <Building2 className="h-4 w-4" /> Brand Name
                        </label>
                        <input
                            required
                            value={form.brand_name}
                            onChange={(event) => setForm({ ...form, brand_name: event.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-viva-blue"
                            placeholder="VIVA DIGITAL CENTER"
                        />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Company Email
                            <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal normal-case outline-none focus:border-viva-blue" />
                        </label>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Company TIN
                            <input required value={form.tin} onChange={(event) => setForm({ ...form, tin: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal normal-case outline-none focus:border-viva-blue" />
                        </label>
                    </div>

                    <div className="border-t pt-6">
                        <h2 className="font-display text-lg font-bold">Invoice Payment Details</h2>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <input placeholder="Bank name" value={form.bank_name} onChange={(event) => setForm({ ...form, bank_name: event.target.value })} className="rounded-xl border p-3" />
                            <input placeholder="Account name" value={form.account_name} onChange={(event) => setForm({ ...form, account_name: event.target.value })} className="rounded-xl border p-3" />
                            <input placeholder="Account number" value={form.account_number} onChange={(event) => setForm({ ...form, account_number: event.target.value })} className="rounded-xl border p-3" />
                            <input placeholder="Mobile money details" value={form.mobile_money} onChange={(event) => setForm({ ...form, mobile_money: event.target.value })} className="rounded-xl border p-3" />
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <Phone className="h-4 w-4" /> Phone
                            </label>
                            <input
                                required
                                value={form.phone}
                                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-viva-blue"
                                placeholder="+255 784 906 044"
                            />
                        </div>
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <Globe2 className="h-4 w-4" /> Website
                            </label>
                            <input
                                required
                                value={form.website}
                                onChange={(event) => setForm({ ...form, website: event.target.value })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-viva-blue"
                                placeholder="vivadigitalcenter.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <MapPin className="h-4 w-4" /> Location
                        </label>
                        <input
                            required
                            value={form.location}
                            onChange={(event) => setForm({ ...form, location: event.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-viva-blue"
                            placeholder="Ferry, Kigamboni, Dar es Salaam"
                        />
                    </div>

                    <button
                        disabled={updateSettings.isPending}
                        className="flex items-center gap-2 rounded-xl bg-viva-blue px-5 py-3 font-bold text-white disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                </form>
            )}
        </div>
    );
}
