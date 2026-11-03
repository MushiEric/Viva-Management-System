import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { api } from '../services/api';
import { FormField } from '@/components/form/FormField';
import { Skeleton } from '@/components/ui/skeleton';

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

const inputClass = 'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-viva-blue focus:ring-2 focus:ring-viva-blue/20';

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

    const set = (key: keyof typeof emptySettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [key]: event.target.value });
    };

    return (
        <div className="flex w-full flex-col gap-6">
            <header>
                <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">System Settings</h1>
                <p className="mt-1 text-sm text-slate-500">Company identity and the payment details printed on invoices.</p>
            </header>

            {settingsQuery.isLoading ? (
                <div className="grid min-h-[calc(100dvh-12rem)] gap-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:grid-cols-2 lg:p-8">
                    <Skeleton className="h-full min-h-64" />
                    <Skeleton className="h-full min-h-64" />
                </div>
            ) : settingsQuery.isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
                    {(settingsQuery.error as Error).message}
                </div>
            ) : (
                <form onSubmit={submit} className="flex min-h-[calc(100dvh-12rem)] w-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                    <div className="grid flex-1 content-start gap-8 lg:grid-cols-2 lg:gap-10">
                        <section className="space-y-4">
                            <h2 className="font-display text-lg font-bold text-ink">Company</h2>
                            <FormField id="brand_name" label="Brand name" required>
                                <input id="brand_name" required value={form.brand_name} onChange={set('brand_name')} className={inputClass} placeholder="VIVA DIGITAL CENTER" />
                            </FormField>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField id="company_email" label="Company email" required>
                                    <input id="company_email" required type="email" value={form.email} onChange={set('email')} className={inputClass} />
                                </FormField>
                                <FormField id="company_tin" label="Company TIN" required>
                                    <input id="company_tin" required value={form.tin} onChange={set('tin')} className={inputClass} />
                                </FormField>
                                <FormField id="company_phone" label="Phone" required>
                                    <input id="company_phone" required value={form.phone} onChange={set('phone')} className={inputClass} placeholder="+255 784 906 044" />
                                </FormField>
                                <FormField id="company_website" label="Website" required>
                                    <input id="company_website" required value={form.website} onChange={set('website')} className={inputClass} placeholder="vivadigitalcenter.com" />
                                </FormField>
                            </div>
                            <FormField id="company_location" label="Location" required>
                                <input id="company_location" required value={form.location} onChange={set('location')} className={inputClass} placeholder="Ferry, Kigamboni, Dar es Salaam" />
                            </FormField>
                        </section>

                        <section className="space-y-4">
                            <h2 className="font-display text-lg font-bold text-ink">Invoice payment details</h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField id="bank_name" label="Bank name">
                                    <input id="bank_name" value={form.bank_name} onChange={set('bank_name')} className={inputClass} />
                                </FormField>
                                <FormField id="account_name" label="Account name">
                                    <input id="account_name" value={form.account_name} onChange={set('account_name')} className={inputClass} />
                                </FormField>
                                <FormField id="account_number" label="Account number">
                                    <input id="account_number" value={form.account_number} onChange={set('account_number')} className={inputClass} />
                                </FormField>
                                <FormField id="mobile_money" label="Mobile money">
                                    <input id="mobile_money" value={form.mobile_money} onChange={set('mobile_money')} className={inputClass} />
                                </FormField>
                            </div>
                        </section>
                    </div>

                    <div className="mt-8 flex border-t border-slate-100 pt-4 sm:justify-end">
                        <button
                            disabled={updateSettings.isPending}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-viva-blue px-6 font-bold text-white disabled:opacity-50 sm:w-auto"
                        >
                            <Save className="h-4 w-4" />
                            {updateSettings.isPending ? 'Saving...' : 'Save settings'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
