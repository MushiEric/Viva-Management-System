import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { loginSchema, forgotPasswordSchema, otpOnlySchema, newPasswordOnlySchema } from '../utils/validation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, KeyRound, ArrowLeft, Send, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';

type ViewMode = 'login' | 'forgot-email' | 'verify-otp' | 'reset-password';

export default function Login() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>('login');

    // Login Form state
    const [form, setForm] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Forgot Password & OTP state
    const [forgotForm, setForgotForm] = useState({
        email: '',
        otp: '',
        password: '',
        confirmPassword: '',
    });
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [forgotErrors, setForgotErrors] = useState<Record<string, string>>({});
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);

    // Countdown Timer for Resend OTP (60 seconds)
    useEffect(() => {
        let timer: any;
        if (resendCountdown > 0) {
            timer = setInterval(() => {
                setResendCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendCountdown]);

    // TanStack mutation for login
    const mutation = useMutation({
        mutationFn: api.login,
        onSuccess: (data) => {
            if (data.success && data.user && data.token) {
                setAuth(data.user, data.token);
                toast.success(`Welcome back, ${data.user.name}!`);
                navigate('/dashboard');
            } else {
                toast.error(data.message || 'Login failed');
            }
        },
        onError: (err: any) => {
            toast.error(err.message || 'The email or password you entered is incorrect.');
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy[name];
                return copy;
            });
        }
    };

    const handleForgotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForgotForm(prev => ({ ...prev, [name]: value }));
        if (forgotErrors[name]) {
            setForgotErrors(prev => {
                const copy = { ...prev };
                delete copy[name];
                return copy;
            });
        }
    };

    const handleSubmitLogin = (e: React.FormEvent) => {
        e.preventDefault();

        const result = loginSchema.safeParse(form);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((err: any) => {
                const path = err.path[0] as string;
                fieldErrors[path] = err.message;
            });
            setErrors(fieldErrors);
            return;
        }

        mutation.mutate(form);
    };

    // Step 1: Request OTP for Email
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = forgotPasswordSchema.safeParse({ email: forgotForm.email });
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((err: any) => {
                const path = err.path[0] as string;
                fieldErrors[path] = err.message;
            });
            setForgotErrors(fieldErrors);
            return;
        }

        setIsSendingOtp(true);
        try {
            await api.requestPasswordOtp(forgotForm.email);
            toast.success(`OTP verification code sent to ${forgotForm.email}`);
            setResendCountdown(60);
            setViewMode('verify-otp');
        } catch (err: any) {
            toast.error(err.message || 'Failed to send OTP code.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    // Step 2: Verify OTP Only
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = otpOnlySchema.safeParse({ otp: forgotForm.otp });
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((err: any) => {
                const path = err.path[0] as string;
                fieldErrors[path] = err.message;
            });
            setForgotErrors(fieldErrors);
            return;
        }

        setIsVerifyingOtp(true);
        try {
            await api.verifyOtp(forgotForm.email, forgotForm.otp);
            toast.success('OTP code verified successfully!');
            setViewMode('reset-password');
        } catch (err: any) {
            toast.error(err.message || 'The provided OTP verification code is invalid.');
            setForgotErrors({ otp: err.message || 'Invalid or expired OTP code.' });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // Step 3: Change Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = newPasswordOnlySchema.safeParse({
            password: forgotForm.password,
            confirmPassword: forgotForm.confirmPassword,
        });

        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((err: any) => {
                const path = err.path[0] as string;
                fieldErrors[path] = err.message;
            });
            setForgotErrors(fieldErrors);
            return;
        }

        setIsResettingPassword(true);
        try {
            await api.resetPasswordWithOtp({
                email: forgotForm.email,
                otp: forgotForm.otp,
                password: forgotForm.password,
                password_confirmation: forgotForm.confirmPassword,
            });
            toast.success('Password changed successfully! You can now log in with your new password.');
            setViewMode('login');
            setForgotForm({ email: '', otp: '', password: '', confirmPassword: '' });
        } catch (err: any) {
            toast.error(err.message || 'Failed to reset password.');
            setForgotErrors({ confirmPassword: err.message || 'Failed to reset password.' });
        } finally {
            setIsResettingPassword(false);
        }
    };

    // Resend OTP handler with countdown
    const handleResendOtp = async () => {
        if (resendCountdown > 0) return;

        setIsSendingOtp(true);
        try {
            await api.requestPasswordOtp(forgotForm.email);
            toast.success(`Resent OTP verification code to ${forgotForm.email}`);
            setResendCountdown(60);
        } catch (err: any) {
            toast.error(err.message || 'Failed to resend OTP.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    return (
        <div className="flex min-h-[70vh] items-center justify-center py-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100/50"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <img
                        src="/viva_logo.jpeg"
                        alt="Viva Digital Center"
                        className="mx-auto mb-5 h-36 w-auto object-contain"
                    />
                    <AnimatePresence mode="wait">
                        {viewMode === 'login' && (
                            <motion.div
                                key="header-login"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                            >
                                <h2 className="font-display text-2xl font-extrabold text-ink">Welcome Back</h2>
                                <p className="text-sm text-slate-400 mt-1">Sign in to manage your training enrollments.</p>
                            </motion.div>
                        )}
                        {viewMode === 'forgot-email' && (
                            <motion.div
                                key="header-forgot"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                            >
                                <h2 className="font-display text-2xl font-extrabold text-ink">Forgot Password?</h2>
                                <p className="text-sm text-slate-400 mt-1">Enter your email to receive an OTP verification code.</p>
                            </motion.div>
                        )}
                        {viewMode === 'verify-otp' && (
                            <motion.div
                                key="header-otp"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                            >
                                <h2 className="font-display text-2xl font-extrabold text-ink">Verify OTP Code</h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    Enter the 6-digit code sent to <span className="font-semibold text-slate-700">{forgotForm.email}</span>
                                </p>
                            </motion.div>
                        )}
                        {viewMode === 'reset-password' && (
                            <motion.div
                                key="header-reset"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                            >
                                <h2 className="font-display text-2xl font-extrabold text-ink">Set New Password</h2>
                                <p className="text-sm text-slate-400 mt-1">Create a strong new password for your account.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Form Content */}
                <AnimatePresence mode="wait">
                    {/* View 1: Standard Login Form */}
                    {viewMode === 'login' && (
                        <motion.form 
                            key="login-form"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleSubmitLogin} 
                            className="space-y-5"
                        >
                            {/* Email */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Email Address</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Mail className="h-4.5 w-4.5" />
                                    </span>
                                    <input 
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="name@example.com"
                                        className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-viva-blue/20 ${errors.email ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-viva-blue'}`}
                                    />
                                </div>
                                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                            </div>

                            {/* Password with Visibility Toggle */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Password</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotForm(prev => ({ ...prev, email: form.email }));
                                            setViewMode('forgot-email');
                                        }}
                                        className="text-xs font-semibold text-viva-blue hover:underline focus:outline-none"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Lock className="h-4.5 w-4.5" />
                                    </span>
                                    <input 
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="Enter your password"
                                        className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-viva-blue/20 ${errors.password ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-viva-blue'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                        title={showPassword ? "Hide password" : "Show password"}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="w-full rounded-xl bg-viva-blue py-3 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition-all hover:bg-slate-900 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {mutation.isPending ? 'Logging in...' : 'Login'}
                            </button>
                        </motion.form>
                    )}

                    {/* View 2: Request OTP (Enter Email) */}
                    {viewMode === 'forgot-email' && (
                        <motion.form
                            key="forgot-email-form"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleRequestOtp}
                            className="space-y-5"
                        >
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Email Address</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Mail className="h-4.5 w-4.5" />
                                    </span>
                                    <input 
                                        type="email"
                                        name="email"
                                        value={forgotForm.email}
                                        onChange={handleForgotChange}
                                        placeholder="name@example.com"
                                        className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-viva-blue/20 ${forgotErrors.email ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-viva-blue'}`}
                                    />
                                </div>
                                {forgotErrors.email && <p className="text-xs text-red-500 mt-1">{forgotErrors.email}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isSendingOtp}
                                className="w-full rounded-xl bg-viva-blue py-3 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition-all hover:bg-slate-900 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSendingOtp ? (
                                    <span>Sending OTP...</span>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        <span>Send OTP Code</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewMode('login')}
                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back to Login
                            </button>
                        </motion.form>
                    )}

                    {/* View 3: Enter OTP Only */}
                    {viewMode === 'verify-otp' && (
                        <motion.form
                            key="verify-otp-form"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleVerifyOtp}
                            className="space-y-4"
                        >
                            {/* OTP Code Input Only */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">6-Digit OTP Code</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <KeyRound className="h-4.5 w-4.5" />
                                    </span>
                                    <input 
                                        type="text"
                                        name="otp"
                                        maxLength={6}
                                        value={forgotForm.otp}
                                        onChange={handleForgotChange}
                                        placeholder="123456"
                                        autoFocus
                                        className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-viva-blue/20 ${forgotErrors.otp ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-viva-blue'}`}
                                    />
                                </div>
                                {forgotErrors.otp && <p className="text-xs text-red-500 mt-1">{forgotErrors.otp}</p>}
                            </div>

                            {/* Verify OTP Button */}
                            <button
                                type="submit"
                                disabled={isVerifyingOtp}
                                className="w-full rounded-xl bg-viva-blue py-3 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition-all hover:bg-slate-900 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                            >
                                {isVerifyingOtp ? (
                                    <span>Verifying OTP...</span>
                                ) : (
                                    <>
                                        <ShieldCheck className="h-4 w-4" />
                                        <span>Verify OTP Code</span>
                                    </>
                                )}
                            </button>

                            {/* Resend OTP with 1 Minute Countdown */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                {resendCountdown > 0 ? (
                                    <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                        <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
                                        Resend OTP in 0:{resendCountdown < 10 ? `0${resendCountdown}` : resendCountdown}
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={isSendingOtp}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-viva-blue hover:underline focus:outline-none disabled:opacity-50"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Resend OTP
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setViewMode('login')}
                                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                                >
                                    <ArrowLeft className="h-3 w-3" />
                                    Back to Login
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {/* View 4: Change Password */}
                    {viewMode === 'reset-password' && (
                        <motion.form
                            key="reset-password-form"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleResetPassword}
                            className="space-y-4"
                        >
                            {/* New Password */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">New Password</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Lock className="h-4.5 w-4.5" />
                                    </span>
                                    <input 
                                        type={showNewPassword ? 'text' : 'password'}
                                        name="password"
                                        value={forgotForm.password}
                                        onChange={handleForgotChange}
                                        placeholder="Enter new password"
                                        autoFocus
                                        className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-viva-blue/20 ${forgotErrors.password ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-viva-blue'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                        title={showNewPassword ? "Hide password" : "Show password"}
                                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                                    >
                                        {showNewPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                    </button>
                                </div>
                                {forgotErrors.password && <p className="text-xs text-red-500 mt-1">{forgotErrors.password}</p>}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Confirm New Password</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <Lock className="h-4.5 w-4.5" />
                                    </span>
                                    <input 
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={forgotForm.confirmPassword}
                                        onChange={handleForgotChange}
                                        placeholder="Re-enter new password"
                                        className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-viva-blue/20 ${forgotErrors.confirmPassword ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-viva-blue'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                        title={showConfirmPassword ? "Hide password" : "Show password"}
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                    </button>
                                </div>
                                {forgotErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{forgotErrors.confirmPassword}</p>}
                            </div>

                            {/* Action Button */}
                            <button
                                type="submit"
                                disabled={isResettingPassword}
                                className="w-full rounded-xl bg-viva-blue py-3 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition-all hover:bg-slate-900 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                            >
                                {isResettingPassword ? (
                                    <span>Changing Password...</span>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Change Password</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewMode('login')}
                                className="w-full flex items-center justify-center gap-1 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                Back to Login
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <p className="mt-6 text-center text-xs text-slate-500">
                    Staff accounts are created by an authorized administrator.
                </p>
            </motion.div>
        </div>
    );
}


