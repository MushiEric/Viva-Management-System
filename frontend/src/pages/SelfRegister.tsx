import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface CourseOption {
    program_level_id: number;
    display_name: string;
    description: string | null;
    duration_weeks: number;
    training_days_per_week: number;
    fee_tzs: string;
}

const OTHER_OCCUPATION = 'Other';
const occupations = [
    'Secondary school student',
    'College / university student',
    'Employed',
    'Self-employed / business owner',
    'Unemployed / looking for work',
    OTHER_OCCUPATION,
];

const formatFee = (fee: string) => `TZS ${Number(fee).toLocaleString()}`;

const phone = z.string().trim().regex(/^\+?[\d\s()-]{7,30}$/, 'Enter a valid phone number, e.g. +255 712 345 678');
const optionalPhone = z.union([z.literal(''), phone]);

// Mirrors SelfRegisterTraineeRequest so most mistakes are caught before submitting.
const schema = z
    .object({
        program_level_id: z.string().min(1, 'Choose the course you want to take'),
        full_name: z.string().trim().min(1, 'Enter your full name').max(255),
        gender: z.enum(['male', 'female'], { error: 'Select your gender' }),
        occupation: z.string(),
        occupation_other: z.string().trim().max(255),
        phone,
        email: z.union([z.literal(''), z.email('Enter a valid email address').max(255)]),
        tin: z.string().trim().max(50),
        address: z.string().trim().min(1, 'Enter your residential address').max(1000),
        emergency_name: z.string().trim().max(255),
        emergency_relationship: z.string().trim().max(100),
        emergency_phone: optionalPhone,
        emergency_alternate_phone: optionalPhone,
    })
    .superRefine((data, ctx) => {
        // An emergency contact is optional, but once started it must be complete.
        const started = [data.emergency_name, data.emergency_relationship, data.emergency_phone, data.emergency_alternate_phone].some(Boolean);
        if (!started) return;
        if (!data.emergency_name) {
            ctx.addIssue({ code: 'custom', path: ['emergency_name'], message: "Enter the contact's full name" });
        }
        if (!data.emergency_relationship) {
            ctx.addIssue({ code: 'custom', path: ['emergency_relationship'], message: 'Enter the relationship' });
        }
        if (!data.emergency_phone) {
            ctx.addIssue({ code: 'custom', path: ['emergency_phone'], message: 'Enter the emergency phone number' });
        }
    });

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
    program_level_id: '',
    full_name: '',
    gender: 'male',
    occupation: '',
    occupation_other: '',
    phone: '',
    email: '',
    tin: '',
    address: '',
    emergency_name: '',
    emergency_relationship: '',
    emergency_phone: '',
    emergency_alternate_phone: '',
};

const Required = () => <span className="text-destructive">*</span>;

export default function SelfRegister() {
    const [searchParams] = useSearchParams();
    const [registered, setRegistered] = useState<{ full_name: string; trainee_number: string; course_name: string } | null>(null);

    const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { ...defaultValues, program_level_id: searchParams.get('course') ?? '' },
    });
    const [selectedCourseId, occupation] = useWatch({ control, name: ['program_level_id', 'occupation'] });

    const { data: courseData, isLoading: coursesLoading } = useQuery({
        queryKey: ['course-options'],
        queryFn: api.getCourseOptions,
    });
    const courses = (courseData?.data as CourseOption[] | undefined) ?? [];
    const selectedCourse = courses.find((course) => String(course.program_level_id) === selectedCourseId);

    const registerMutation = useMutation({
        mutationFn: (values: FormValues) => api.selfRegisterTrainee({
            program_level_id: Number(values.program_level_id),
            full_name: values.full_name,
            gender: values.gender,
            phone: values.phone,
            email: values.email || null,
            tin: values.tin || null,
            address: values.address,
            occupation: (values.occupation === OTHER_OCCUPATION ? values.occupation_other : values.occupation) || null,
            ...(values.emergency_name ? {
                emergency_contact: {
                    full_name: values.emergency_name,
                    relationship: values.emergency_relationship,
                    phone: values.emergency_phone,
                    alternate_phone: values.emergency_alternate_phone || null,
                },
            } : {}),
        }),
        onSuccess: (response) => setRegistered(response.data),
        onError: (error: Error) => toast.error(error.message),
    });

    if (registered) {
        return (
            <div className="mx-auto max-w-lg py-12">
                <Card className="text-center">
                    <CardHeader className="items-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="size-8" />
                        </div>
                        <CardTitle className="mt-2 font-heading text-2xl">Registration successful</CardTitle>
                        <CardDescription>
                            Welcome, <span className="font-medium text-foreground">{registered.full_name}</span>. You registered for{' '}
                            <span className="font-medium text-foreground">{registered.course_name}</span>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border bg-muted/50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your trainee number</p>
                            <p className="mt-1 font-mono text-2xl font-semibold text-primary">{registered.trainee_number}</p>
                        </div>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Please keep this number. Our office will contact you to agree your class schedule and payment.
                        </p>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <Button asChild>
                            <Link to="/timetable">Back to timetable</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Register as a trainee</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Choose your course and fill in your details. You can start any time — we'll contact you to agree your schedule.
                    Fields marked <Required /> are required.
                </p>
            </div>

            <Card>
                <form noValidate onSubmit={handleSubmit((values) => registerMutation.mutate(values))}>
                    <CardContent>
                        <FieldGroup>
                            <FieldSet>
                                <FieldLegend>Choose your course</FieldLegend>
                                <Controller
                                    name="program_level_id"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="program_level_id">Course <Required /></FieldLabel>
                                            <Select value={field.value} onValueChange={field.onChange} disabled={coursesLoading}>
                                                <SelectTrigger id="program_level_id" className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}>
                                                    <SelectValue placeholder={coursesLoading ? 'Loading courses…' : 'Select a course'} />
                                                </SelectTrigger>
                                                <SelectContent position="popper">
                                                    {courses.map((course) => (
                                                        <SelectItem key={course.program_level_id} value={String(course.program_level_id)}>
                                                            {course.display_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {!coursesLoading && courses.length === 0 && (
                                                <FieldDescription>No courses are open for registration right now. Please check back later.</FieldDescription>
                                            )}
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                                {selectedCourse && (
                                    <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                                        <dl className="grid grid-cols-3 gap-4">
                                            <div>
                                                <dt className="text-xs text-muted-foreground">Fee</dt>
                                                <dd className="font-semibold text-foreground">{formatFee(selectedCourse.fee_tzs)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs text-muted-foreground">Duration</dt>
                                                <dd className="font-semibold text-foreground">{selectedCourse.duration_weeks} weeks</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs text-muted-foreground">Classes</dt>
                                                <dd className="font-semibold text-foreground">{selectedCourse.training_days_per_week} days / week</dd>
                                            </div>
                                        </dl>
                                        {selectedCourse.description && (
                                            <p className="mt-3 text-muted-foreground">{selectedCourse.description}</p>
                                        )}
                                    </div>
                                )}
                            </FieldSet>

                            <FieldSeparator />

                            <FieldSet>
                                <FieldLegend>Personal information</FieldLegend>
                                <FieldGroup className="grid gap-6 sm:grid-cols-2">
                                    <Field data-invalid={!!errors.full_name} className="sm:col-span-2">
                                        <FieldLabel htmlFor="full_name">Full name <Required /></FieldLabel>
                                        <Input id="full_name" autoComplete="name" placeholder="Your full legal name" aria-invalid={!!errors.full_name} {...register('full_name')} />
                                        <FieldError errors={[errors.full_name]} />
                                    </Field>

                                    <Controller
                                        name="gender"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel>Gender <Required /></FieldLabel>
                                                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex h-9 items-center gap-6">
                                                    <Field orientation="horizontal" className="w-auto">
                                                        <RadioGroupItem value="male" id="gender-male" />
                                                        <FieldLabel htmlFor="gender-male" className="font-normal">Male</FieldLabel>
                                                    </Field>
                                                    <Field orientation="horizontal" className="w-auto">
                                                        <RadioGroupItem value="female" id="gender-female" />
                                                        <FieldLabel htmlFor="gender-female" className="font-normal">Female</FieldLabel>
                                                    </Field>
                                                </RadioGroup>
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />

                                    <Controller
                                        name="occupation"
                                        control={control}
                                        render={({ field }) => (
                                            <Field>
                                                <FieldLabel htmlFor="occupation">Occupation</FieldLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger id="occupation" className="w-full" onBlur={field.onBlur}>
                                                        <SelectValue placeholder="Select occupation" />
                                                    </SelectTrigger>
                                                    <SelectContent position="popper">
                                                        {occupations.map((option) => (
                                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                        )}
                                    />

                                    {occupation === OTHER_OCCUPATION && (
                                        <Field data-invalid={!!errors.occupation_other} className="sm:col-span-2">
                                            <FieldLabel htmlFor="occupation_other">Your occupation</FieldLabel>
                                            <Input id="occupation_other" placeholder="e.g. Farmer, Pastor, Retired" aria-invalid={!!errors.occupation_other} {...register('occupation_other')} />
                                            <FieldError errors={[errors.occupation_other]} />
                                        </Field>
                                    )}
                                </FieldGroup>
                            </FieldSet>

                            <FieldSeparator />

                            <FieldSet>
                                <FieldLegend>Contact & billing</FieldLegend>
                                <FieldGroup className="grid gap-6 sm:grid-cols-2">
                                    <Field data-invalid={!!errors.phone}>
                                        <FieldLabel htmlFor="phone">Phone number <Required /></FieldLabel>
                                        <Input id="phone" type="tel" autoComplete="tel" placeholder="+255 7XX XXX XXX" aria-invalid={!!errors.phone} {...register('phone')} />
                                        <FieldDescription>We'll send your confirmation SMS here.</FieldDescription>
                                        <FieldError errors={[errors.phone]} />
                                    </Field>
                                    <Field data-invalid={!!errors.email}>
                                        <FieldLabel htmlFor="email">Email address</FieldLabel>
                                        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} {...register('email')} />
                                        <FieldError errors={[errors.email]} />
                                    </Field>
                                    <Field data-invalid={!!errors.tin}>
                                        <FieldLabel htmlFor="tin">TIN</FieldLabel>
                                        <Input id="tin" inputMode="numeric" placeholder="9-digit TIN" aria-invalid={!!errors.tin} {...register('tin')} />
                                        <FieldDescription>Only needed if you want an EFD invoice in your name.</FieldDescription>
                                        <FieldError errors={[errors.tin]} />
                                    </Field>
                                    <Field data-invalid={!!errors.address} className="sm:col-span-2">
                                        <FieldLabel htmlFor="address">Residential address <Required /></FieldLabel>
                                        <Textarea id="address" rows={2} autoComplete="street-address" placeholder="Street, district, region — e.g. Mikocheni B, Kinondoni, Dar es Salaam" aria-invalid={!!errors.address} {...register('address')} />
                                        <FieldError errors={[errors.address]} />
                                    </Field>
                                </FieldGroup>
                            </FieldSet>

                            <FieldSeparator />

                            <FieldSet>
                                <FieldLegend>Emergency contact</FieldLegend>
                                <FieldDescription>Someone we can reach if something happens during class — for younger trainees, a parent or guardian.</FieldDescription>
                                <FieldGroup className="grid gap-6 sm:grid-cols-2">
                                    <Field data-invalid={!!errors.emergency_name}>
                                        <FieldLabel htmlFor="emergency_name">Full name</FieldLabel>
                                        <Input id="emergency_name" placeholder="Parent or guardian name" aria-invalid={!!errors.emergency_name} {...register('emergency_name')} />
                                        <FieldError errors={[errors.emergency_name]} />
                                    </Field>
                                    <Field data-invalid={!!errors.emergency_relationship}>
                                        <FieldLabel htmlFor="emergency_relationship">Relationship</FieldLabel>
                                        <Input id="emergency_relationship" placeholder="e.g. Father, Mother, Sponsor" aria-invalid={!!errors.emergency_relationship} {...register('emergency_relationship')} />
                                        <FieldError errors={[errors.emergency_relationship]} />
                                    </Field>
                                    <Field data-invalid={!!errors.emergency_phone}>
                                        <FieldLabel htmlFor="emergency_phone">Phone</FieldLabel>
                                        <Input id="emergency_phone" type="tel" placeholder="+255 7XX XXX XXX" aria-invalid={!!errors.emergency_phone} {...register('emergency_phone')} />
                                        <FieldError errors={[errors.emergency_phone]} />
                                    </Field>
                                    <Field data-invalid={!!errors.emergency_alternate_phone}>
                                        <FieldLabel htmlFor="emergency_alternate_phone">Alternate phone</FieldLabel>
                                        <Input id="emergency_alternate_phone" type="tel" placeholder="+255 7XX XXX XXX" aria-invalid={!!errors.emergency_alternate_phone} {...register('emergency_alternate_phone')} />
                                        <FieldError errors={[errors.emergency_alternate_phone]} />
                                    </Field>
                                </FieldGroup>
                            </FieldSet>
                        </FieldGroup>
                    </CardContent>

                    <CardFooter className="mt-6 flex-col-reverse gap-3 border-t sm:flex-row sm:justify-end">
                        <Button variant="outline" asChild className="w-full sm:w-auto">
                            <Link to="/timetable">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={registerMutation.isPending} className="w-full sm:w-auto">
                            {registerMutation.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
                            {registerMutation.isPending ? 'Submitting…' : 'Submit registration'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
