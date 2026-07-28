<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cohort;
use App\Models\Enrollment;
use App\Models\User;
use App\Events\StudentRegistered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EnrollmentController extends Controller
{
    /**
     * Handle enrollment request.
     */
    public function enroll(Request $request)
    {
        $request->validate([
            'cohort_id' => 'required|exists:cohorts,id',
            'role' => 'nullable|in:student,minor',
            'name' => 'required_with:role|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $cohortId = $request->input('cohort_id');

        try {
            $enrollment = DB::transaction(function () use ($request, $cohortId) {
                // Lock the cohort row to prevent race conditions during parallel requests
                $cohort = Cohort::lockForUpdate()->findOrFail($cohortId);

                // Count active enrollments for this cohort
                $activeCount = Enrollment::where('cohort_id', $cohortId)->count();

                if ($activeCount >= $cohort->max_seats) {
                    throw new \Exception("Lab at maximum capacity (7/7 stations occupied) for this session.");
                }

                $user = null;

                if ($request->filled('role')) {
                    $role = $request->input('role');
                    $email = $request->input('email');

                    if ($role === 'minor') {
                        // Minors don't need email/phone, registered by current authenticated user
                        $user = User::create([
                            'name' => $request->input('name'),
                            'email' => $email ?: null,
                            'phone' => $request->input('phone'),
                            'role' => 'minor',
                            'managed_by_id' => auth()->id(),
                            'password' => null,
                        ]);
                    } else {
                        // Role is standard student
                        if (!$email) {
                            throw new \Exception("Email is required for standard student enrollment.");
                        }

                        $user = User::where('email', $email)->first();
                        if (!$user) {
                            $user = User::create([
                                'name' => $request->input('name'),
                                'email' => $email,
                                'phone' => $request->input('phone'),
                                'role' => 'student',
                                'password' => Hash::make(Str::random(16)),
                            ]);
                        }
                    }
                } else {
                    // Default: Enroll the authenticated user
                    $user = auth()->user();
                }

                // Check for duplicate enrollment in the same cohort
                $exists = Enrollment::where('user_id', $user->id)
                    ->where('cohort_id', $cohortId)
                    ->exists();

                if ($exists) {
                    throw new \Exception("Student is already enrolled in this cohort.");
                }

                // Create enrollment record
                $enrollment = Enrollment::create([
                    'user_id' => $user->id,
                    'cohort_id' => $cohortId,
                    'enrolled_at' => now(),
                ]);

                // Fire event
                event(new StudentRegistered($user, $cohort));

                return $enrollment;
            });

            return response()->json([
                'success' => true,
                'message' => 'Enrollment successful.',
                'data' => [
                    'enrollment_id' => $enrollment->id,
                    'student_name' => $enrollment->user->name,
                    'cohort_name' => $enrollment->cohort->name,
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }
}
