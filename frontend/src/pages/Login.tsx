import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft2, Refresh, Send2, ShieldTick, Sms, TickCircle } from 'iconsax-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'
import { PasswordField } from '@/components/form/PasswordField'
import { Spinner } from '@/components/ui/spinner'
import {
    forgotPasswordSchema,
    loginSchema,
    newPasswordOnlySchema,
    otpOnlySchema,
    type ForgotPasswordInput,
    type LoginInput,
    type NewPasswordOnlyInput,
    type OtpOnlyInput,
} from '@/utils/validation'

type ViewMode = 'login' | 'forgot-email' | 'verify-otp' | 'reset-password'

export default function Login() {
    const navigate = useNavigate()
    const setAuth = useAuthStore((state) => state.setAuth)
    const [viewMode, setViewMode] = useState<ViewMode>('login')
    const [resetEmail, setResetEmail] = useState('')
    const [verifiedOtp, setVerifiedOtp] = useState('')
    const [resendCountdown, setResendCountdown] = useState(0)

    const loginForm = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    })
    const forgotForm = useForm<ForgotPasswordInput>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    })
    const otpForm = useForm<OtpOnlyInput>({
        resolver: zodResolver(otpOnlySchema),
        defaultValues: { otp: '' },
    })
    const passwordForm = useForm<NewPasswordOnlyInput>({
        resolver: zodResolver(newPasswordOnlySchema),
        defaultValues: { password: '', confirmPassword: '' },
    })

    useEffect(() => {
        if (resendCountdown <= 0) return
        const timer = window.setInterval(() => setResendCountdown((value) => value - 1), 1000)
        return () => window.clearInterval(timer)
    }, [resendCountdown])

    const loginMutation = useMutation({
        mutationFn: api.login,
        onSuccess: (data) => {
            if (data.success && data.user && data.token) {
                setAuth(data.user, data.token)
                toast.success(`Welcome back, ${data.user.name}!`)
                navigate('/dashboard')
                return
            }
            toast.error(data.message || 'Login failed')
        },
        onError: (error: Error) => toast.error(error.message || 'The email or password you entered is incorrect.'),
    })

    const sendOtp = async (email: string) => {
        await api.requestPasswordOtp(email)
        setResetEmail(email)
        setResendCountdown(60)
        setViewMode('verify-otp')
        toast.success(`OTP sent to ${email}`)
    }

    const titles: Record<ViewMode, { heading: string; text: string }> = {
        login: { heading: 'Welcome back', text: 'Sign in to manage training, students, and staff.' },
        'forgot-email': { heading: 'Forgot password', text: 'Enter the email on your staff account. We will send a 6-digit code.' },
        'verify-otp': { heading: 'Verify the code', text: `Enter the 6-digit code sent to ${resetEmail}.` },
        'reset-password': { heading: 'Set a new password', text: 'Choose a password you have not used on this account before.' },
    }

    return (
        <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]">
            <aside className="relative hidden overflow-hidden bg-viva-navy text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
                <div className="absolute -top-24 -right-16 size-72 rounded-full bg-viva-blue/40" />
                <div className="absolute bottom-16 -left-16 size-56 rounded-full bg-viva-green/30" />
                <img src="/viva_logo.jpeg" alt="Viva Digital Center" className="relative h-20 w-fit rounded-2xl bg-white object-contain p-2" />
                <div className="relative max-w-md">
                    <p className="text-xs font-bold tracking-[0.22em] text-viva-green uppercase">Viva Digital Center</p>
                    <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight">Training operations, in one place.</h1>
                    <p className="mt-4 text-sm leading-6 text-blue-100">Enroll students, approve staff, and follow each cohort from the same portal.</p>
                </div>
                <p className="relative text-xs text-blue-200">Dar es Salaam, Tanzania</p>
            </aside>

            <section className="flex items-center justify-center bg-[#f3f7fb] px-4 py-10">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
                    <img src="/viva_logo.jpeg" alt="Viva Digital Center" className="mx-auto mb-6 h-20 w-auto object-contain lg:hidden" />
                    <h2 className="font-display text-2xl font-extrabold text-ink">{titles[viewMode].heading}</h2>
                    <p className="mt-1 text-sm text-slate-500">{titles[viewMode].text}</p>

                    {viewMode === 'login' ? (
                        <form className="mt-6 space-y-4" onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values))} noValidate>
                            <FormField id="email" label="Email address" required error={loginForm.formState.errors.email?.message}>
                                <div className="relative">
                                    <Sms variant="Bold" size={18} color="currentColor" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                                    <Input id="email" type="email" autoComplete="email" placeholder="name@vivadigital.co.tz" className="h-11 pl-10" aria-invalid={!!loginForm.formState.errors.email} {...loginForm.register('email')} />
                                </div>
                            </FormField>
                            <PasswordField
                                id="password"
                                label="Password"
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                registration={loginForm.register('password')}
                                error={loginForm.formState.errors.password?.message}
                                labelAction={(
                                    <button
                                        type="button"
                                        className="text-xs font-semibold text-viva-blue hover:underline"
                                        onClick={() => {
                                            forgotForm.setValue('email', loginForm.getValues('email'))
                                            setViewMode('forgot-email')
                                        }}
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            />
                            <Button type="submit" disabled={loginMutation.isPending} className="h-11 w-full text-sm font-bold">
                                {loginMutation.isPending ? <Spinner /> : null}
                                {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                            </Button>
                        </form>
                    ) : null}

                    {viewMode === 'forgot-email' ? (
                        <form
                            className="mt-6 space-y-4"
                            onSubmit={forgotForm.handleSubmit(async (values) => {
                                try {
                                    await sendOtp(values.email)
                                } catch (error) {
                                    toast.error(error instanceof Error ? error.message : 'Failed to send the OTP.')
                                }
                            })}
                            noValidate
                        >
                            <FormField id="reset-email" label="Email address" required error={forgotForm.formState.errors.email?.message}>
                                <div className="relative">
                                    <Sms variant="Bold" size={18} color="currentColor" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                                    <Input id="reset-email" type="email" autoComplete="email" placeholder="name@vivadigital.co.tz" className="h-11 pl-10" aria-invalid={!!forgotForm.formState.errors.email} {...forgotForm.register('email')} />
                                </div>
                            </FormField>
                            <Button type="submit" disabled={forgotForm.formState.isSubmitting} className="h-11 w-full text-sm font-bold">
                                {forgotForm.formState.isSubmitting ? <Spinner /> : <Send2 variant="Bold" size={16} color="currentColor" />}
                                Send OTP
                            </Button>
                            <BackToLogin onClick={() => setViewMode('login')} />
                        </form>
                    ) : null}

                    {viewMode === 'verify-otp' ? (
                        <form
                            className="mt-6 space-y-4"
                            onSubmit={otpForm.handleSubmit(async (values) => {
                                try {
                                    await api.verifyOtp(resetEmail, values.otp)
                                    setVerifiedOtp(values.otp)
                                    toast.success('OTP verified.')
                                    setViewMode('reset-password')
                                } catch (error) {
                                    const message = error instanceof Error ? error.message : 'The OTP is invalid.'
                                    otpForm.setError('otp', { message })
                                    toast.error(message)
                                }
                            })}
                            noValidate
                        >
                            <FormField id="otp" label="6-digit OTP" required error={otpForm.formState.errors.otp?.message}>
                                <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" className="h-11 tracking-[0.3em]" aria-invalid={!!otpForm.formState.errors.otp} {...otpForm.register('otp')} />
                            </FormField>
                            <Button type="submit" disabled={otpForm.formState.isSubmitting} className="h-11 w-full text-sm font-bold">
                                {otpForm.formState.isSubmitting ? <Spinner /> : <ShieldTick variant="Bold" size={16} color="currentColor" />}
                                Verify OTP
                            </Button>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                {resendCountdown > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                        <Refresh variant="Bold" size={14} color="currentColor" className="animate-spin" />
                                        Resend in 0:{String(resendCountdown).padStart(2, '0')}
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-viva-blue hover:underline"
                                        onClick={async () => {
                                            try {
                                                await sendOtp(resetEmail)
                                            } catch (error) {
                                                toast.error(error instanceof Error ? error.message : 'Failed to resend the OTP.')
                                            }
                                        }}
                                    >
                                        <Refresh variant="Bold" size={14} color="currentColor" />
                                        Resend OTP
                                    </button>
                                )}
                                <BackToLogin onClick={() => setViewMode('login')} compact />
                            </div>
                        </form>
                    ) : null}

                    {viewMode === 'reset-password' ? (
                        <form
                            className="mt-6 space-y-4"
                            onSubmit={passwordForm.handleSubmit(async (values) => {
                                try {
                                    await api.resetPasswordWithOtp({
                                        email: resetEmail,
                                        otp: verifiedOtp,
                                        password: values.password,
                                        password_confirmation: values.confirmPassword,
                                    })
                                    toast.success('Password changed. Sign in with the new password.')
                                    loginForm.setValue('email', resetEmail)
                                    passwordForm.reset()
                                    setViewMode('login')
                                } catch (error) {
                                    toast.error(error instanceof Error ? error.message : 'Failed to reset the password.')
                                }
                            })}
                            noValidate
                        >
                            <PasswordField
                                id="new-password"
                                label="New password"
                                autoComplete="new-password"
                                placeholder="Enter a new password"
                                registration={passwordForm.register('password')}
                                error={passwordForm.formState.errors.password?.message}
                            />
                            <PasswordField
                                id="confirm-password"
                                label="Confirm new password"
                                autoComplete="new-password"
                                placeholder="Re-enter the new password"
                                registration={passwordForm.register('confirmPassword')}
                                error={passwordForm.formState.errors.confirmPassword?.message}
                            />
                            <Button type="submit" disabled={passwordForm.formState.isSubmitting} className="h-11 w-full text-sm font-bold">
                                {passwordForm.formState.isSubmitting ? <Spinner /> : <TickCircle variant="Bold" size={16} color="currentColor" />}
                                Change password
                            </Button>
                            <BackToLogin onClick={() => setViewMode('login')} />
                        </form>
                    ) : null}

                    <p className="mt-6 text-center text-xs text-slate-500">Staff accounts are created by an administrator.</p>
                </div>
            </section>
        </div>
    )
}

function BackToLogin({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
    return (
        <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 ${compact ? '' : 'w-full justify-center py-1'}`}>
            <ArrowLeft2 variant="Bold" size={14} color="currentColor" />
            Back to login
        </button>
    )
}
