<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Course;
use App\Models\Cohort;
use App\Models\Enrollment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $manager = User::create([
            'name' => 'Viva Manager',
            'email' => 'manager@vivadigitalcenter.com',
            'phone' => '0784906044',
            'role' => 'manager',
            'status' => 'approved',
            'approved_at' => now(),
            'password' => Hash::make('ChangeMe123!'),
        ]);

        $admin = User::create([
            'name' => 'Viva Admin',
            'email' => 'vivadigitalcenter@gmail.com',
            'phone' => '0784906044',
            'role' => 'admin',
            'status' => 'approved',
            'approved_by' => $manager->id,
            'approved_at' => now(),
            'password' => Hash::make('ChangeMe123!'),
        ]);

        // 2. Create Parent/Package Courses
        $webDev = Course::create([
            'name' => 'Full Web Frontend Development',
            'description' => 'Comprehensive package covering HTML, CSS, JavaScript, and modern frameworks.',
            'parent_id' => null,
        ]);

        $flutterDev = Course::create([
            'name' => 'Full Flutter Mobile Development',
            'description' => 'Build cross-platform mobile apps for Android and iOS using Dart and Flutter.',
            'parent_id' => null,
        ]);

        // 3. Create Child Standalone Modules
        $jsModule = Course::create([
            'name' => 'JavaScript Programming Basics',
            'description' => 'Core programming logic using modern JavaScript ES6+.',
            'parent_id' => $webDev->id,
        ]);

        $reactModule = Course::create([
            'name' => 'React & State Management',
            'description' => 'Building dynamic web apps using React, Hooks, and Redux.',
            'parent_id' => $webDev->id,
        ]);

        // 4. Create Cohorts for Courses
        $cohort1 = Cohort::create([
            'course_id' => $jsModule->id,
            'name' => 'JavaScript Cohort A',
            'schedule_window' => 'morning',
            'max_seats' => 7,
            'is_active' => true,
        ]);

        $cohort2 = Cohort::create([
            'course_id' => $reactModule->id,
            'name' => 'React Cohort B',
            'schedule_window' => 'evening',
            'max_seats' => 7,
            'is_active' => true,
        ]);

        $cohort3 = Cohort::create([
            'course_id' => $flutterDev->id,
            'name' => 'Flutter Cohort C',
            'schedule_window' => 'weekend',
            'max_seats' => 7,
            'is_active' => true,
        ]);

        // 5. Create Initial Student Enrollments for Cohort 1 (JavaScript Cohort A)
        // Let's seed 5 students so that 5/7 seats are occupied.
        for ($i = 1; $i <= 5; $i++) {
            $student = User::create([
                'name' => "Student {$i}",
                'email' => "student{$i}@viva.co.tz",
                'phone' => "+25578800000{$i}",
                'role' => 'student',
                'password' => Hash::make('password'),
            ]);

            Enrollment::create([
                'user_id' => $student->id,
                'cohort_id' => $cohort1->id,
                'enrolled_at' => now()->subDays($i),
            ]);
        }

        // Add 1 minor student managed by Admin
        $minor = User::create([
            'name' => 'Kid Student 1',
            'email' => null,
            'phone' => null,
            'role' => 'minor',
            'managed_by_id' => $admin->id,
        ]);

        Enrollment::create([
            'user_id' => $minor->id,
            'cohort_id' => $cohort1->id,
            'enrolled_at' => now(),
        ]);
        // Now Cohort 1 has 6 enrollments (5 standard + 1 minor). Only 1 seat remains.
    }
}
