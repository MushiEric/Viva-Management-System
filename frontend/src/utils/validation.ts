import { z } from 'zod';

/**
 * Validation schema for User Registration.
 */
export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.string().email('Please enter a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    phone: z.string().optional().or(z.literal('')),
});

/**
 * Validation schema for User Login.
 */
export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
    password: z.string().min(1, 'Password is required.'),
});

/**
 * Validation schema for Cohort Enrollment.
 */
export const enrollSchema = z.object({
    cohort_id: z.number(),
    role: z.enum(['student', 'minor']),
    name: z.string().min(2, 'Student name must be at least 2 characters.'),
    email: z.string().email('Please enter a valid email address.').nullable().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
    // Check cohort selection
    if (!data.cohort_id || data.cohort_id === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['cohort_id'],
            message: 'Please select a training cohort.',
        });
    }

    // If enrolling as a standard student, email is required!
    if (data.role === 'student') {
        if (!data.email) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['email'],
                message: 'Email is required for standard student registration.',
            });
        }
    }
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EnrollInput = z.infer<typeof enrollSchema>;
