<?php

namespace Database\Seeders;

use App\Models\User;
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
            'email' => env('VIVA_MANAGER_EMAIL', 'manager@vivadigitalcenter.com'),
            'phone' => '0784906044',
            'role' => 'manager',
            'status' => 'approved',
            'approved_at' => now(),
            'password' => Hash::make(env('VIVA_MANAGER_PASSWORD', 'ChangeMe123!')),
        ]);

        $admin = User::create([
            'name' => 'Viva Admin',
            'email' => env('VIVA_ADMIN_EMAIL', 'vivadigitalcenter@gmail.com'),
            'phone' => '0784906044',
            'role' => 'admin',
            'status' => 'approved',
            'approved_by' => $manager->id,
            'approved_at' => now(),
            'password' => Hash::make(env('VIVA_ADMIN_PASSWORD', 'ChangeMe123!')),
        ]);
    }
}
