<?php

namespace App\Modules\Identity\Domain;

enum Permission: string
{
    case ManageStaff = 'staff.manage';
    case ApproveStaff = 'staff.approve';
    case ManagePermissions = 'permissions.manage';
    case ViewTrainees = 'trainees.view';
    case ManageTrainees = 'trainees.manage';
    case ManageEnrollments = 'enrollments.manage';
    case TransferEnrollments = 'enrollments.transfer';
    case ViewPrograms = 'programs.view';
    case DraftPrograms = 'programs.draft';
    case ApprovePrograms = 'programs.approve';
    case ManageCohorts = 'cohorts.manage';
    case ManageMaterials = 'materials.manage';
    case RecordLearning = 'learning.record';
    case CompleteEnrollments = 'enrollments.complete';
    case ViewFinance = 'finance.view';
    case ManageFinance = 'finance.manage';
    case ApproveFees = 'fees.approve';
    case ApproveDiscounts = 'discounts.approve';
    case CancelPayments = 'payments.cancel';
    case IssueCertificates = 'certificates.issue';
    case ViewReports = 'reports.view';
    case ViewAudit = 'audit.view';
    case ViewEnquiries = 'enquiries.view';
    case ManageEnquiries = 'enquiries.manage';
    case ManageSettings = 'settings.manage';
}
