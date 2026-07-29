<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Identity\Domain\Permission;
use App\Modules\Identity\Infrastructure\Models\PermissionOverride;
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
        $managerEmail = env('VIVA_MANAGER_EMAIL', 'manager@vivadigitalcenter.com');
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

        $adminEmail = env('VIVA_ADMIN_EMAIL', 'vivadigitalcenter@gmail.com');
        $admin = User::firstOrCreate(['email' => $adminEmail], [
            'name' => 'Viva Admin',
            'phone' => '0784906044',
            'role' => 'admin',
            'status' => 'approved',
            'approved_by' => $manager->id,
            'approved_at' => now(),
            'password' => Hash::make(env('VIVA_ADMIN_PASSWORD', 'ChangeMe123!')),
        ]);
        $admin->update([
            'role' => 'admin',
            'status' => 'approved',
            'approved_by' => $manager->id,
            'approved_at' => $admin->approved_at ?? now(),
        ]);

        PermissionOverride::updateOrCreate([
            'user_id' => $admin->id,
            'permission' => Permission::ManageSettings->value,
        ], [
            'allowed' => true,
            'granted_by' => $manager->id,
        ]);

        $settings = SystemSetting::query()->firstOrCreate(['id' => 1], SystemSetting::defaults());
        $settings->fill([
            'email' => $settings->email ?: config('viva.company.email'),
            'tin' => $settings->tin ?: config('viva.company.tin'),
            'account_name' => $settings->account_name ?: config('viva.company.name'),
        ])->save();
    }
}
