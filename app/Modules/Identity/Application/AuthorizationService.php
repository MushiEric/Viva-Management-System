<?php

namespace App\Modules\Identity\Application;

use App\Models\User;
use App\Modules\Identity\Domain\Permission;
use App\Modules\Identity\Domain\RolePermissions;
use App\Modules\Identity\Domain\StaffRole;

final class AuthorizationService
{
    public function allows(User $user, Permission $permission): bool
    {
        $override = $user->permissionOverrides()
            ->where('permission', $permission->value)
            ->value('allowed');

        if ($override !== null) {
            return (bool) $override;
        }

        $role = StaffRole::tryFrom($user->role);

        return $role !== null && in_array($permission, RolePermissions::for($role), true);
    }
}
