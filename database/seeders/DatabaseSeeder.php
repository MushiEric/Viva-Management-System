<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Settings\Infrastructure\Models\SystemSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Only the manager is seeded; admins and facilitators are created as staff from the app.
        $managerEmail = env('VIVA_MANAGER_EMAIL', 'vivadigitalcenter@gmail.com');
        $manager = User::firstOrCreate(['email' => $managerEmail], [
            'name' => 'Viva Manager',
            'phone' => '0784906044',
            'role' => 'manager',
            'status' => 'approved',
            'approved_at' => now(),
            'password' => Hash::make(env('VIVA_MANAGER_PASSWORD', 'ChangeMe123!')),
        ]);
        $manager->update([
            'role' => 'manager',
            'status' => 'approved',
            'approved_at' => $manager->approved_at ?? now(),
        ]);

        $settings = SystemSetting::query()->firstOrCreate(['id' => 1], SystemSetting::defaults());
        $settings->fill([
            'email' => $settings->email ?: config('viva.company.email'),
            'tin' => $settings->tin ?: config('viva.company.tin'),
            'account_name' => $settings->account_name ?: config('viva.company.name'),
        ])->save();
    }
}
