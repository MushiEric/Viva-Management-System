<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Identity\Application\StaffManagementService;
use App\Modules\Identity\Domain\Permission;
use App\Modules\Identity\Domain\RolePermissions;
use App\Modules\Identity\Domain\StaffRole;
use App\Modules\Identity\Http\Requests\StoreStaffRequest;
use App\Modules\Identity\Http\Requests\UpdateStaffRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class StaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $staff = User::withTrashed()
            ->with('permissionOverrides')
            ->whereIn('role', array_column(StaffRole::cases(), 'value'))
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json(['success' => true, 'data' => $staff]);
    }

    public function store(StoreStaffRequest $request, StaffManagementService $service): JsonResponse
    {
        $staff = $service->create($request->validated(), $request->user());

        return response()->json(['success' => true, 'data' => $staff], 201);
    }

    public function update(UpdateStaffRequest $request, User $staff, StaffManagementService $service): JsonResponse
    {
        $staff = $service->update($staff, $request->validated(), $request->user());

        return response()->json(['success' => true, 'data' => $staff]);
    }

    public function approve(Request $request, User $staff, StaffManagementService $service): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $service->approve($staff, $request->user()),
        ]);
    }

    public function destroy(Request $request, User $staff, StaffManagementService $service): JsonResponse
    {
        $service->deactivate($staff, $request->user());

        return response()->json(['success' => true, 'message' => 'Staff account deactivated.']);
    }

    public function permissions(): JsonResponse
    {
        $roles = collect(StaffRole::cases())->mapWithKeys(
            fn (StaffRole $role) => [
                $role->value => array_map(
                    fn (Permission $permission) => $permission->value,
                    RolePermissions::for($role),
                ),
            ],
        );

        return response()->json([
            'success' => true,
            'data' => [
                'permissions' => array_column(Permission::cases(), 'value'),
                'role_defaults' => $roles,
            ],
        ]);
    }

    public function updatePermissions(Request $request, User $staff, StaffManagementService $service): JsonResponse
    {
        $validated = $request->validate([
            'overrides' => ['required', 'array'],
            'overrides.*' => ['boolean'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $service->replacePermissionOverrides($staff, $validated['overrides'], $request->user()),
        ]);
    }
}
