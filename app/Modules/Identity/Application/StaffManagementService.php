<?php

namespace App\Modules\Identity\Application;

use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Identity\Domain\Events\StaffAccountApproved;
use App\Modules\Identity\Domain\Events\StaffAccountCreated;
use App\Modules\Identity\Domain\Permission;
use App\Modules\Identity\Domain\StaffRole;
use App\Shared\Application\EventBus;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final readonly class StaffManagementService
{
    public function __construct(
        private EventBus $events,
        private AuditLogger $audit,
    ) {
    }

    public function create(array $data, User $actor): User
    {
        return DB::transaction(function () use ($data, $actor) {
            $role = StaffRole::from($data['role']);
            $staff = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'role' => $role->value,
                'status' => 'pending',
                'password' => Hash::make($data['password']),
            ]);

            $this->audit->record($actor, 'staff.created', $staff, null, $staff->toArray());
            $this->events->dispatch(new StaffAccountCreated($staff));

            return $staff;
        });
    }

    public function update(User $staff, array $data, User $actor): User
    {
        $before = $staff->toArray();
        $roleChanged = isset($data['role']) && $data['role'] !== $staff->role;
        $staff->fill([
            'name' => $data['name'] ?? $staff->name,
            'email' => $data['email'] ?? $staff->email,
            'phone' => array_key_exists('phone', $data) ? $data['phone'] : $staff->phone,
            'role' => $data['role'] ?? $staff->role,
        ]);

        if (!empty($data['password'])) {
            $staff->password = Hash::make($data['password']);
        }

        if ($roleChanged && $actor->role !== StaffRole::Manager->value) {
            $staff->status = 'pending';
            $staff->approved_by = null;
            $staff->approved_at = null;
        }

        $staff->save();

        if ($roleChanged && $actor->role !== StaffRole::Manager->value) {
            $staff->tokens()->delete();
        }
        $this->audit->record($actor, 'staff.updated', $staff, $before, $staff->fresh()->toArray());

        return $staff;
    }

    public function approve(User $staff, User $manager): User
    {
        if ($staff->status === 'approved') {
            throw new DomainException('Staff account is already approved.');
        }

        $before = $staff->toArray();
        $staff->update([
            'status' => 'approved',
            'approved_by' => $manager->id,
            'approved_at' => now(),
        ]);
        $this->audit->record($manager, 'staff.approved', $staff, $before, $staff->fresh()->toArray());
        $this->events->dispatch(new StaffAccountApproved($staff));

        return $staff;
    }

    public function deactivate(User $staff, User $actor): void
    {
        if ($staff->is($actor)) {
            throw new DomainException('You cannot deactivate your own account.');
        }

        $before = $staff->toArray();
        $staff->update(['status' => 'inactive']);
        $staff->tokens()->delete();
        $staff->delete();
        $this->audit->record($actor, 'staff.deactivated', $staff, $before, $staff->toArray());
    }

    /**
     * @param array<string, bool> $overrides
     */
    public function replacePermissionOverrides(User $staff, array $overrides, User $manager): User
    {
        return DB::transaction(function () use ($staff, $overrides, $manager) {
            $before = $staff->permissionOverrides()->get()->toArray();
            $staff->permissionOverrides()->delete();

            foreach ($overrides as $permission => $allowed) {
                Permission::from($permission);
                $staff->permissionOverrides()->create([
                    'permission' => $permission,
                    'allowed' => $allowed,
                    'granted_by' => $manager->id,
                ]);
            }

            $this->audit->record(
                $manager,
                'staff.permissions_updated',
                $staff,
                $before,
                $staff->permissionOverrides()->get()->toArray(),
            );

            return $staff->load('permissionOverrides');
        });
    }
}
