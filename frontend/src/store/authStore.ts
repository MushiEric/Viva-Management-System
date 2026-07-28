import { create } from 'zustand';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'manager' | 'admin' | 'facilitator';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    initialize: () => void;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    /**
     * Load initial auth state from localStorage.
     */
    initialize: () => {
        const token = localStorage.getItem('viva_auth_token');
        const userStr = localStorage.getItem('viva_auth_user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                set({ user, token, isAuthenticated: true });
            } catch (e) {
                // Clear corrupted items
                localStorage.removeItem('viva_auth_token');
                localStorage.removeItem('viva_auth_user');
            }
        }
    },

    /**
     * Save authentication details.
     */
    setAuth: (user, token) => {
        localStorage.setItem('viva_auth_token', token);
        localStorage.setItem('viva_auth_user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
    },

    /**
     * Clear authentication details.
     */
    logout: () => {
        localStorage.removeItem('viva_auth_token');
        localStorage.removeItem('viva_auth_user');
        set({ user: null, token: null, isAuthenticated: false });
    },
}));
