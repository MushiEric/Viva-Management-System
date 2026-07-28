<?php

namespace App\Modules\Identity\Domain;

final class RolePermissions
{
    /**
     * @return list<Permission>
     */
    public static function for(StaffRole $role): array
    {
        return match ($role) {
            StaffRole::Manager => Permission::cases(),
            StaffRole::Admin => [
                Permission::ManageStaff,
                Permission::ViewTrainees,
                Permission::ManageTrainees,
                Permission::ManageEnrollments,
                Permission::TransferEnrollments,
                Permission::ViewPrograms,
                Permission::ManageCohorts,
                Permission::ManageMaterials,
                Permission::RecordLearning,
                Permission::CompleteEnrollments,
                Permission::ViewFinance,
                Permission::ManageFinance,
                Permission::IssueCertificates,
                Permission::ViewReports,
            ],
            StaffRole::Facilitator => [
                Permission::ViewTrainees,
                Permission::ViewPrograms,
                Permission::DraftPrograms,
                Permission::ManageMaterials,
                Permission::RecordLearning,
            ],
        };
    }
}
