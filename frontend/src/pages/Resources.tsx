import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Award, Download, FileUp, ScrollText, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Program {
    id: number;
    name: string;
    status: string;
}

interface Material {
    id: number;
    title: string;
    description: string | null;
    version: string;
    material_type: 'file' | 'rich_text';
    file_size: number | null;
    rich_text: string | null;
    program: { name: string };
    uploader: { name: string };
    created_at: string;
}

interface Certificate {
    id: number;
    certificate_number: string;
    issued_at: string;
    enrollment: {
        trainee: { full_name: string; trainee_number: string };
        cohort: { program_level?: { name: string; program: { name: string } } };
    };
}

interface Enrollment {
    id: number;
    status: string;
    trainee: { full_name: string; trainee_number: string };
    cohort: { name: string; program_level?: { name: string; program: { name: string } } };
}

export default function Resources() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const canIssue = user?.role === 'manager' || user?.role === 'admin';
    const [form, setForm] = useState({
        program_id: 0,
        title: '',
        description: '',
        version: '1.0',
        material_type: 'file',
        rich_text: '',
        file: null as File | null,
    });

    const materialsQuery = useQuery({ queryKey: ['learning-materials'], queryFn: api.getLearningMaterials });
    const programsQuery = useQuery({ queryKey: ['programs'], queryFn: api.getPrograms });
    const certificatesQuery = useQuery({ queryKey: ['certificates'], queryFn: api.getCertificates, enabled: canIssue });
    const enrollmentsQuery = useQuery({ queryKey: ['learning-enrollments'], queryFn: api.getLearningEnrollments, enabled: canIssue });
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['learning-materials'] });
        queryClient.invalidateQueries({ queryKey: ['certificates'] });
    };

    const upload = useMutation({
        mutationFn: () => {
            const payload = new FormData();
            payload.append('title', form.title);
            payload.append('description', form.description);
            payload.append('version', form.version);
            payload.append('material_type', form.material_type);
            if (form.file) payload.append('file', form.file);
            if (form.material_type === 'rich_text') payload.append('rich_text', form.rich_text);
            return api.uploadLearningMaterial(form.program_id, payload);
        },
        onSuccess: () => {
            setForm({ program_id: 0, title: '', description: '', version: '1.0', material_type: 'file', rich_text: '', file: null });
            refresh();
            toast.success('Learning material published.');
        },
        onError: (error: Error) => toast.error(error.message),
    });
    const deactivate = useMutation({
        mutationFn: api.deactivateLearningMaterial,
        onSuccess: () => {
            refresh();
            toast.success('Learning material deactivated.');
        },
        onError: (error: Error) => toast.error(error.message),
    });
    const issue = useMutation({
        mutationFn: api.issueCertificate,
        onSuccess: () => {
            refresh();
            toast.success('Certificate generated with QR code.');
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const materials = (materialsQuery.data?.data || []) as Material[];
    const programs = ((programsQuery.data?.data || []) as Program[]).filter((program) => program.status === 'approved');
    const certificates = (certificatesQuery.data?.data || []) as Certificate[];
    const enrollments = (enrollmentsQuery.data?.data?.data || []) as Enrollment[];
    const certificateEnrollmentIds = new Set(certificates.map((item: any) => item.enrollment_id));

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-3xl font-extrabold">Learning Resources & Certificates</h1>
                <p className="mt-1 text-sm text-slate-500">Program reference materials, rich-text lessons, and internal completion certificates.</p>
            </header>

            <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold"><FileUp className="h-5 w-5 text-viva-blue" />Publish Program Material</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <select className="rounded-xl border p-3" value={form.program_id} onChange={(event) => setForm({ ...form, program_id: Number(event.target.value) })}><option value={0}>Select approved program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select>
                    <input className="rounded-xl border p-3" placeholder="Material title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                    <input className="rounded-xl border p-3" placeholder="Version, e.g. 1.0" value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} />
                    <select className="rounded-xl border p-3" value={form.material_type} onChange={(event) => setForm({ ...form, material_type: event.target.value, file: null, rich_text: '' })}><option value="file">PDF or Word file</option><option value="rich_text">Formatted lesson text</option></select>
                </div>
                <textarea className="w-full rounded-xl border p-3" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                {form.material_type === 'file' ? (
                    <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })} className="w-full rounded-xl border p-3" />
                ) : (
                    <textarea className="min-h-40 w-full rounded-xl border p-3 font-mono text-sm" placeholder="<h2>Lesson heading</h2><p>Formatted lesson...</p>" value={form.rich_text} onChange={(event) => setForm({ ...form, rich_text: event.target.value })} />
                )}
                <button disabled={!form.program_id || !form.title || (form.material_type === 'file' ? !form.file : !form.rich_text)} onClick={() => upload.mutate()} className="rounded-xl bg-viva-blue px-5 py-3 font-bold text-white disabled:opacity-50">Publish Material</button>
                <p className="text-xs text-slate-400">Accepted files: PDF, DOC, DOCX. Maximum size: 10 MB.</p>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {materials.map((material) => (
                    <article key={material.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                        <div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-viva-blue">{material.program.name}</p><h2 className="mt-1 font-display text-lg font-bold">{material.title}</h2></div><button onClick={() => deactivate.mutate(material.id)} className="h-fit rounded-lg border p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div>
                        <p className="mt-2 text-sm text-slate-500">{material.description}</p>
                        <p className="mt-3 text-xs text-slate-400">Version {material.version} · Uploaded by {material.uploader.name}</p>
                        {material.material_type === 'file' ? (
                            <button onClick={() => api.downloadLearningMaterial(material.id, material.title)} className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white"><Download className="mr-1 inline h-4 w-4" />Download</button>
                        ) : (
                            <div className="prose mt-4 max-h-64 overflow-auto rounded-xl bg-slate-50 p-4 text-sm" dangerouslySetInnerHTML={{ __html: material.rich_text || '' }} />
                        )}
                    </article>
                ))}
            </section>

            {canIssue && (
                <>
                    <section className="rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Award className="h-5 w-5 text-amber-500" />Completed Enrollments</h2>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {enrollments.filter((item) => item.status === 'completed' && !certificateEnrollmentIds.has(item.id)).map((enrollment) => <div key={enrollment.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><div><p className="font-bold">{enrollment.trainee.full_name}</p><p className="text-xs text-slate-500">{enrollment.cohort.program_level?.program.name} — {enrollment.cohort.program_level?.name}</p></div><button onClick={() => issue.mutate(enrollment.id)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white">Generate Certificate</button></div>)}
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                        <h2 className="flex items-center gap-2 p-5 font-display text-lg font-bold"><ScrollText className="h-5 w-5" />Issued Certificates</h2>
                        {certificates.map((certificate) => <div key={certificate.id} className="flex items-center justify-between border-t p-4"><div><p className="font-bold">{certificate.enrollment.trainee.full_name}</p><p className="text-xs text-slate-500">{certificate.certificate_number} · {new Date(certificate.issued_at).toLocaleDateString()}</p></div><button onClick={() => api.downloadCertificate(certificate.id, certificate.certificate_number)} className="rounded-lg border px-3 py-2 text-xs font-bold"><Download className="mr-1 inline h-4 w-4" />PDF</button></div>)}
                    </section>
                </>
            )}
        </div>
    );
}
