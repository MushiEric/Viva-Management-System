
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    token?: string;
    user?: any;
    data?: T;
    filters?: any;
}

/**
 * Handle API responses and throw detailed error messages.
 */
async function handleResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    let data: any = null;

    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = { message: await response.text() };
    }

    if (!response.ok) {
        // Return structured message if present, otherwise default HTTP status text
        const errorMessage = data?.message || data?.error || response.statusText || 'An error occurred';
        throw new Error(errorMessage);
    }

    return data;
}

/**
 * Get headers for API request.
 */
function getHeaders(requireAuth = true): HeadersInit {
    const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    if (requireAuth) {
        const token = localStorage.getItem('viva_auth_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
}

async function downloadAuthenticated(path: string, filename: string): Promise<void> {
    const response = await fetch(`${BASE_URL}${path}`, {
        headers: {
            'Accept': 'application/octet-stream',
            ...(localStorage.getItem('viva_auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('viva_auth_token')}` } : {}),
        },
    });
    if (!response.ok) {
        throw new Error('Download failed.');
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

async function openAuthenticatedPdf(path: string): Promise<void> {
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
        throw new Error('Allow pop-ups to open the printable document.');
    }
    previewWindow.opener = null;
    previewWindow.document.write('<p style="font-family:sans-serif;padding:24px">Preparing document...</p>');

    const response = await fetch(`${BASE_URL}${path}`, {
        headers: {
            'Accept': 'application/pdf',
            ...(localStorage.getItem('viva_auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('viva_auth_token')}` } : {}),
        },
    });
    if (!response.ok) {
        previewWindow.close();
        throw new Error('Unable to open the printable document.');
    }

    const url = URL.createObjectURL(await response.blob());
    previewWindow.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const api = {
    /**
     * Issue authentication token (login).
     */
    async login(payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/token`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    /**
     * Fetch active timetables (cohorts & seats availability).
     */
    async getTimetable(): Promise<ApiResponse<any[]>> {
        const response = await fetch(`${BASE_URL}/timetable`, {
            method: 'GET',
            headers: getHeaders(false), // Timetable is public
        });
        return handleResponse(response);
    },

    /**
     * Submit student or minor enrollment.
     */
    async enroll(payload: { cohort_id: number; trainee_id: number }): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/staff/enrollments`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async getTrainees(search = ''): Promise<ApiResponse> {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await fetch(`${BASE_URL}/trainees${query}`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async getTraineeOptions(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/trainee-options`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async createTrainee(payload: FormData): Promise<ApiResponse> {
        const token = localStorage.getItem('viva_auth_token');
        const response = await fetch(`${BASE_URL}/trainees`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: payload,
        });
        return handleResponse(response);
    },

    async getTrainee(traineeId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/trainees/${traineeId}`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async updateTrainee(traineeId: number, payload: FormData): Promise<ApiResponse> {
        const token = localStorage.getItem('viva_auth_token');
        payload.set('_method', 'PUT');
        const response = await fetch(`${BASE_URL}/trainees/${traineeId}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: payload,
        });
        return handleResponse(response);
    },

    downloadTraineeRegistrationForm(traineeId: number, number: string): Promise<void> {
        return downloadAuthenticated(`/trainees/${traineeId}/registration-form`, `${number}-registration-form.pdf`);
    },

    async deactivateTrainee(traineeId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/trainees/${traineeId}`, {
            method: 'DELETE',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async transferEnrollment(enrollmentId: number, cohortId: number, reason: string): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/staff/enrollments/${enrollmentId}/transfer`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ cohort_id: cohortId, reason }),
        });
        return handleResponse(response);
    },

    async getStaff(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/staff`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async createStaff(payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/staff`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async approveStaff(staffId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/staff/${staffId}/approve`, {
            method: 'POST',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async deactivateStaff(staffId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/staff/${staffId}`, {
            method: 'DELETE',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async getStaffPermissions(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/staff-permissions`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async updateStaffPermissions(staffId: number, overrides: Record<string, boolean>): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/staff/${staffId}/permissions`, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify({ overrides }),
        });
        return handleResponse(response);
    },

    async getPrograms(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/programs`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    programImageUrl(programId: number): string {
        return `${BASE_URL}/programs/${programId}/image`;
    },

    async getProgramFacilitators(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/program-facilitators`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async createProgram(payload: FormData): Promise<ApiResponse> {
        const token = localStorage.getItem('viva_auth_token');
        const response = await fetch(`${BASE_URL}/programs`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: payload,
        });
        return handleResponse(response);
    },

    async updateProgram(programId: number, payload: FormData): Promise<ApiResponse> {
        const token = localStorage.getItem('viva_auth_token');
        payload.set('_method', 'PUT');
        const response = await fetch(`${BASE_URL}/programs/${programId}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: payload,
        });
        return handleResponse(response);
    },

    async addProgramLevel(programId: number, payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/programs/${programId}/levels`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async updateProgramLevel(levelId: number, payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/program-levels/${levelId}`, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async submitProgram(programId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/programs/${programId}/submit`, {
            method: 'POST',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async approveProgram(programId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/programs/${programId}/approve`, {
            method: 'POST',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async requestProgramChanges(programId: number, notes: string): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/programs/${programId}/request-changes`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ notes }),
        });
        return handleResponse(response);
    },

    async approveProgramFee(levelId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/program-levels/${levelId}/approve-fee`, {
            method: 'POST',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async getCohorts(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/cohorts`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async getCohortOptions(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/cohort-options`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async createCohort(payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/cohorts`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async updateCohort(cohortId: number, payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/cohorts/${cohortId}`, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async deactivateCohort(cohortId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/cohorts/${cohortId}`, {
            method: 'DELETE',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async getLearningEnrollments(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/learning/enrollments`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async getLearningEnrollment(enrollmentId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/learning/enrollments/${enrollmentId}`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async addAssessment(enrollmentId: number, payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/learning/enrollments/${enrollmentId}/assessments`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async addPracticalWork(enrollmentId: number, payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/learning/enrollments/${enrollmentId}/practical-work`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async addLearningNote(enrollmentId: number, note: string): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/learning/enrollments/${enrollmentId}/notes`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ note }),
        });
        return handleResponse(response);
    },

    async recordAttendance(enrollmentId: number, payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/learning/enrollments/${enrollmentId}/attendance`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async updateLearningProgress(enrollmentId: number, percentage: number, status: string): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/learning/enrollments/${enrollmentId}/progress`, {
            method: 'PATCH',
            headers: getHeaders(true),
            body: JSON.stringify({ percentage, status }),
        });
        return handleResponse(response);
    },

    async completeEnrollment(enrollmentId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/learning/enrollments/${enrollmentId}/complete`, {
            method: 'POST',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async getFinance(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/finance`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async createInvoice(payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/finance/invoices`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async issueInvoice(invoiceId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/finance/invoices/${invoiceId}/issue`, {
            method: 'POST',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async getInvoice(invoiceId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/finance/invoices/${invoiceId}`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    downloadInvoice(invoiceId: number, invoiceNumber: string): Promise<void> {
        return downloadAuthenticated(`/finance/invoices/${invoiceId}/pdf`, `${invoiceNumber}.pdf`);
    },

    openInvoice(invoiceId: number): Promise<void> {
        return openAuthenticatedPdf(`/finance/invoices/${invoiceId}/pdf`);
    },

    async requestDiscount(invoiceId: number, amount: number, reason: string): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/finance/invoices/${invoiceId}/discounts`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ amount, reason }),
        });
        return handleResponse(response);
    },

    async approveDiscount(discountId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/finance/discounts/${discountId}/approve`, {
            method: 'POST',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async recordPayment(payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/finance/payments`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async cancelPayment(paymentId: number, reason: string): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/finance/payments/${paymentId}/cancel`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ reason }),
        });
        return handleResponse(response);
    },

    downloadReceipt(paymentId: number, receiptNumber: string): Promise<void> {
        return downloadAuthenticated(`/finance/payments/${paymentId}/pdf`, `${receiptNumber}.pdf`);
    },

    openReceipt(paymentId: number): Promise<void> {
        return openAuthenticatedPdf(`/finance/payments/${paymentId}/pdf`);
    },

    async getCertificates(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/certificates`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async issueCertificate(enrollmentId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/certificates/enrollments/${enrollmentId}`, {
            method: 'POST',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    downloadCertificate(certificateId: number, number: string): Promise<void> {
        return downloadAuthenticated(`/certificates/${certificateId}/download`, `${number}.pdf`);
    },

    async getLearningMaterials(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/learning-materials`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async uploadLearningMaterial(programId: number, formData: FormData): Promise<ApiResponse> {
        const token = localStorage.getItem('viva_auth_token');
        const response = await fetch(`${BASE_URL}/programs/${programId}/learning-materials`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData,
        });
        return handleResponse(response);
    },

    async deactivateLearningMaterial(materialId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/learning-materials/${materialId}`, {
            method: 'DELETE',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    downloadLearningMaterial(materialId: number, title: string): Promise<void> {
        return downloadAuthenticated(`/learning-materials/${materialId}/download`, title);
    },

    async getDashboard(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/dashboard`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async getReport(period: string, from?: string, to?: string): Promise<ApiResponse> {
        const params = new URLSearchParams({ period });
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const response = await fetch(`${BASE_URL}/reports?${params}`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async getAuditLogs(filters: string | {
        search?: string;
        actor_id?: string;
        action?: string;
        subject_type?: string;
        from?: string;
        to?: string;
        page?: number;
        per_page?: number;
    } = ''): Promise<ApiResponse> {
        const params = new URLSearchParams();
        if (typeof filters === 'string') {
            if (filters) params.set('search', filters);
        } else {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') params.set(key, String(value));
            });
        }
        const response = await fetch(`${BASE_URL}/audit-logs?${params}`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async getContactInquiries(search = '', status = '', page = 1): Promise<ApiResponse> {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        const response = await fetch(`${BASE_URL}/contact-inquiries?${params}`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async updateContactInquiryStatus(inquiryId: number, status: string): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/contact-inquiries/${inquiryId}`, {
            method: 'PATCH',
            headers: getHeaders(true),
            body: JSON.stringify({ status }),
        });
        return handleResponse(response);
    },

    async getSystemSettings(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/settings`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async updateSystemSettings(payload: {
        brand_name: string;
        phone: string;
        location: string;
        website: string;
        email: string;
        tin: string;
        bank_name: string;
        account_name: string;
        account_number: string;
        mobile_money: string;
    }): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/settings`, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async changePassword(payload: {
        current_password: string;
        password: string;
        password_confirmation: string;
    }): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/profile/password`, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async getNotifications(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/notifications?per_page=15`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async markNotificationRead(notificationId: string): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async markAllNotificationsRead(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/notifications/read-all`, {
            method: 'POST',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async getNotificationSettings(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/notification-settings`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async updateNotificationSettings(emailNotificationsEnabled: boolean): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/notification-settings`, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify({ email_notifications_enabled: emailNotificationsEnabled }),
        });
        return handleResponse(response);
    },

    /**
     * Request password reset OTP code.
     */
    async requestPasswordOtp(email: string): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/forgot-password/otp`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ email }),
        });
        return handleResponse(response);
    },

    /**
     * Verify OTP code validity.
     */
    async verifyOtp(email: string, otp: string): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/forgot-password/verify-otp`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ email, otp }),
        });
        return handleResponse(response);
    },

    /**
     * Reset password using OTP code.
     */
    async resetPasswordWithOtp(payload: { email: string; otp: string; password: string; password_confirmation: string }): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/reset-password/otp`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    /**
     * Get authenticated user profile.
     */
    async getProfile(): Promise<any> {
        const response = await fetch(`${BASE_URL}/user`, {
            method: 'GET',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async logout(): Promise<void> {
        const response = await fetch(`${BASE_URL}/logout`, {
            method: 'POST',
            headers: getHeaders(true),
        });
        await handleResponse(response);
    }
};
