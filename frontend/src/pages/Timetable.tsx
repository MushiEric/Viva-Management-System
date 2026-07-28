import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { Calendar, Users, ArrowRight, Sparkles, MapPin } from 'lucide-react';

interface Cohort {
    cohort_id: number;
    cohort_name: string;
    schedule_window: 'morning' | 'afternoon' | 'evening' | 'weekend';
    start_date: string | null;
    end_date: string | null;
    default_start_time: string | null;
    default_end_time: string | null;
    schedule_days: Array<{ day_name: string; start_time: string; end_time: string }>;
    facilitators: Array<{ id: number; name: string }>;
    course: {
        id: number;
        name: string;
        is_module: boolean;
        parent_course: string | null;
        fee_tzs: string | null;
    };
    capacity: {
        max_seats: number;
        occupied_seats: number;
        available_seats: number;
        status: 'available' | 'full';
    };
}

export default function Timetable() {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // Fetch timetables using TanStack Query
    const { data: response, isLoading, isError, error } = useQuery({
        queryKey: ['timetable'],
        queryFn: api.getTimetable,
        refetchInterval: 10000, // Refresh every 10 seconds to keep occupancy sync'd
    });

    const cohorts = (response?.data as Cohort[]) || [];

    const handleEnrollClick = (cohortId: number) => {
        if (isAuthenticated) {
            navigate(`/enroll?cohort_id=${cohortId}`);
        } else {
            navigate(`/login?cohort_id=${cohortId}`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-viva-blue" />
                <p className="text-sm text-slate-400 font-medium">Fetching active lab schedule...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 font-semibold">Failed to load timetable details.</p>
                <p className="text-xs text-slate-400 mt-1">{(error as Error)?.message || 'Database connection error.'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Hero / Header Section */}
            <div className="text-center max-w-2xl mx-auto space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-viva-blue/20 bg-viva-blue/5 px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-viva-blue">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Real-time Occupancy Tracker</span>
                </div>
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl leading-tight">
                    Active Computer Lab <br />
                    <span className="bg-gradient-to-r from-viva-blue to-viva-green bg-clip-text text-transparent">
                        Timetable & Availability
                    </span>
                </h1>
                <p className="text-slate-500 leading-relaxed text-sm">
                    Viva Digital Center equips learners in Dar es Salaam with practical skills. 
                    Check current seats in our computer lab below (each session is strictly limited to 7 computer stations).
                </p>
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-red-400" />
                    Kigamboni, Dar es Salaam, Tanzania
                </div>
            </div>

            {/* Timetable Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cohorts.map((cohort, index) => {
                    const isFull = cohort.capacity.status === 'full';
                    const available = cohort.capacity.available_seats;

                    return (
                        <motion.div
                            key={cohort.cohort_id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all hover:border-viva-blue/30 hover:shadow-lg"
                        >
                            <div className="space-y-4">
                                {/* Type tag & Status dot */}
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-viva-blue uppercase tracking-wider bg-viva-blue/5 border border-viva-blue/15 px-2.5 py-1 rounded-lg">
                                        {cohort.course.is_module ? 'Module Course' : 'Full Program'}
                                    </span>
                                    
                                    <div className="flex items-center gap-1.5">
                                        <span className={`h-2.5 w-2.5 rounded-full ${isFull ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                                        <span className="text-xs font-bold text-slate-500">
                                            {isFull ? 'Full' : `${available} Left`}
                                        </span>
                                    </div>
                                </div>

                                {/* Title */}
                                <div className="space-y-1">
                                    <h3 className="font-display text-lg font-extrabold text-ink leading-snug">
                                        {cohort.course.name}
                                    </h3>
                                    {cohort.course.parent_course && (
                                        <p className="text-xs text-slate-400 font-semibold italic">
                                            Part of: {cohort.course.parent_course}
                                        </p>
                                    )}
                                </div>

                                {/* Cohort details */}
                                <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-xs border border-slate-100">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-medium">Group:</span>
                                        <span className="font-bold text-ink">{cohort.cohort_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-medium">Time Window:</span>
                                        <span className="font-bold text-ink capitalize">{cohort.schedule_window}</span>
                                    </div>
                                    {cohort.start_date && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-medium">Dates:</span>
                                            <span className="font-bold text-ink">{cohort.start_date} – {cohort.end_date}</span>
                                        </div>
                                    )}
                                    {cohort.schedule_days.length > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-medium">Days:</span>
                                            <span className="font-bold text-ink">{cohort.schedule_days.map((day) => day.day_name.slice(0, 3)).join(', ')}</span>
                                        </div>
                                    )}
                                    {cohort.default_start_time && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-medium">Time:</span>
                                            <span className="font-bold text-ink">{cohort.default_start_time.slice(0, 5)} – {cohort.default_end_time?.slice(0, 5)}</span>
                                        </div>
                                    )}
                                    {cohort.course.fee_tzs && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-medium">Fee:</span>
                                            <span className="font-bold text-ink">TZS {Number(cohort.course.fee_tzs).toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60">
                                        <span className="text-slate-400 font-medium flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5 text-slate-400" />
                                            Stations Occupied:
                                        </span>
                                        <span className="font-bold text-ink">
                                            {cohort.capacity.occupied_seats} / {cohort.capacity.max_seats}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => handleEnrollClick(cohort.cohort_id)}
                                disabled={isFull}
                                className={`mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-bold text-white transition-all shadow-md ${isFull ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' : 'bg-viva-blue shadow-viva-blue/20 hover:bg-slate-900 hover:shadow-none'}`}
                            >
                                <span>{isFull ? 'Fully Booked (7/7)' : 'Enroll Student'}</span>
                                {!isFull && <ArrowRight className="h-4 w-4" />}
                            </button>
                        </motion.div>
                    );
                })}

                {cohorts.length === 0 && (
                    <div className="col-span-full border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400">
                        <Calendar className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                        <h3 className="font-bold text-ink mb-1">No Active Cohorts</h3>
                        <p className="text-xs">There are currently no active training cohorts scheduled in the database.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
