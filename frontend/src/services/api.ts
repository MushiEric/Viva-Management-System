const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    token?: string;
    user?: any;
    data?: T;
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

    async createTrainee(payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/trainees`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
    },

    async getTrainee(traineeId: number): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/trainees/${traineeId}`, {
            headers: getHeaders(true),
        });
        return handleResponse(response);
    },

    async updateTrainee(traineeId: number, payload: any): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/trainees/${traineeId}`, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
        });
        return handleResponse(response);
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

    async getProgramFacilitators(): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/program-facilitators`, { headers: getHeaders(true) });
        return handleResponse(response);
    },

    async createProgram(payload: { name: string; description?: string }): Promise<ApiResponse> {
        const response = await fetch(`${BASE_URL}/programs`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(payload),
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

    /**
     * Get authenticated user profile.
     */
    async getProfile(): Promise<any> {
        const response = await fetch(`${BASE_URL}/user`, {
            method: 'GET',
            headers: getHeaders(true),
        });
        return handleResponse(response);
    }
};
