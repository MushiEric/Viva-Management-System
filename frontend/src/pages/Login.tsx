import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { loginSchema } from '../utils/validation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [form, setForm] = useState({
        email: '',
        password: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // TanStack mutation for login
    const mutation = useMutation({
        mutationFn: api.login,
        onSuccess: (data) => {
            if (data.success && data.user && data.token) {
                setAuth(data.user, data.token);
                toast.success(`Welcome back, ${data.user.name}!`);
                navigate('/timetable');
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
        // Clear field error on edit
        if (errors[name]) {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy[name];
                return copy;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate using Zod schema
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

        // Trigger mutation
        mutation.mutate(form);
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
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-viva-blue/10 text-viva-blue">
                        <LogIn className="h-6 w-6" />
                    </div>
                    <h2 className="font-display text-2xl font-extrabold text-ink">Welcome Back</h2>
                    <p className="text-sm text-slate-400 mt-1">Sign in to manage your training enrollments.</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
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

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <Lock className="h-4.5 w-4.5" />
                            </span>
                            <input 
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-viva-blue/20 ${errors.password ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-viva-blue'}`}
                            />
                        </div>
                        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="w-full rounded-xl bg-viva-blue py-3 font-display text-sm font-bold text-white shadow-md shadow-viva-blue/20 transition-all hover:bg-slate-900 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {mutation.isPending ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* Register Link */}
                <div className="text-center mt-6 text-xs text-slate-500">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-semibold text-viva-blue hover:underline">
                        Register
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
