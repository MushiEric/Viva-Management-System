<?php

namespace App\Modules\Reporting\Application;

use App\Models\Cohort;
use App\Models\Enrollment;
use App\Models\User;
use App\Modules\Audit\Infrastructure\Models\AuditLog;
use App\Modules\Certification\Infrastructure\Models\Certificate;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use App\Modules\Finance\Infrastructure\Models\DiscountRequest;
use App\Modules\Finance\Infrastructure\Models\Invoice;
use App\Modules\Finance\Infrastructure\Models\Payment;
use App\Modules\Identity\Application\AuthorizationService;
use App\Modules\Identity\Domain\Permission;
use App\Modules\Training\Infrastructure\Models\LearningMaterial;
use App\Modules\Training\Infrastructure\Models\Program;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final readonly class ReportingService
{
    public function __construct(private AuthorizationService $authorization)
    {
    }

    public function dashboard(User $user): array
    {
        $canViewFinance = $this->authorization->allows($user, Permission::ViewFinance);
        $canViewAudit = $this->authorization->allows($user, Permission::ViewAudit);

        $data = [
            'role' => $user->role,
            'operations' => [
                'active_trainees' => Trainee::whereHas('enrollments', fn ($query) => $query->whereIn('status', ['active', 'ongoing', 'paused']))->count(),
                'active_enrollments' => Enrollment::whereIn('status', ['active', 'ongoing', 'paused'])->count(),
                'completed_enrollments' => Enrollment::where('status', 'completed')->count(),
                'active_cohorts' => Cohort::where('is_active', true)->count(),
                'approved_programs' => Program::where('status', 'approved')->count(),
                'learning_materials' => LearningMaterial::count(),
                'certificates' => Certificate::where('status', 'issued')->count(),
            ],
            'upcoming_cohorts' => Cohort::query()
                ->where('is_active', true)
                ->whereNotNull('start_date')
                ->whereDate('end_date', '>=', today())
                ->with(['programLevel.program', 'facilitators:id,name'])
                ->withCount(['enrollments as occupied_seats' => fn ($query) => $query->whereIn('status', ['active', 'ongoing', 'pending'])])
                ->orderBy('start_date')
                ->limit(8)
                ->get(),
            'recent_completions' => Enrollment::query()
                ->where('status', 'completed')
                ->with(['trainee:id,trainee_number,full_name', 'cohort.programLevel.program'])
                ->latest('completed_at')
                ->limit(8)
                ->get(),
        ];

        if (in_array($user->role, ['manager', 'admin'], true)) {
            $data['pending_approvals'] = [
                'staff' => User::where('status', 'pending')->count(),
                'programs' => Program::where('status', 'pending_approval')->count(),
                'fees' => ProgramLevel::where('fee_status', 'pending_approval')->count(),
                'discounts' => DiscountRequest::where('status', 'pending')->count(),
            ];
        }

        if ($canViewFinance) {
            $data['finance'] = [
                'invoiced' => (float) Invoice::whereNot('status', 'cancelled')->sum('total'),
                'paid' => (float) Invoice::whereNot('status', 'cancelled')->sum('amount_paid'),
                'outstanding' => (float) Invoice::whereNot('status', 'cancelled')
                    ->selectRaw('COALESCE(SUM(total - amount_paid), 0) as balance')
                    ->value('balance'),
                'overdue_invoices' => Invoice::where('status', 'overdue')->count(),
            ];
        }

        if ($canViewAudit) {
            $data['recent_activity'] = AuditLog::with('actor:id,name')
                ->latest('created_at')
                ->limit(12)
                ->get();
        }

        if ($user->role === 'facilitator') {
            $data['assigned_cohorts'] = $user->belongsToMany(Cohort::class, 'cohort_facilitators')
                ->where('is_active', true)
                ->with('programLevel.program')
                ->withCount('enrollments')
                ->get();
        }

        return $data;
    }

    public function report(string $period, ?string $from, ?string $to): array
    {
        [$start, $end] = $this->resolveRange($period, $from, $to);

        $enrollments = Enrollment::whereBetween('enrolled_at', [$start, $end]);
        $payments = Payment::where('status', 'confirmed')->whereBetween('paid_at', [$start, $end]);
        $completions = Enrollment::where('status', 'completed')->whereBetween('completed_at', [$start, $end]);

        return [
            'period' => [
                'type' => $period,
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
            ],
            'summary' => [
                'new_trainees' => Trainee::whereBetween('created_at', [$start, $end])->count(),
                'new_enrollments' => (clone $enrollments)->count(),
                'completed_enrollments' => (clone $completions)->count(),
                'payments_received' => (float) (clone $payments)->sum('amount'),
                'invoices_issued' => Invoice::whereBetween('issued_at', [$start, $end])->count(),
                'certificates_issued' => Certificate::whereBetween('issued_at', [$start, $end])->count(),
            ],
            'enrollments_by_status' => Enrollment::whereBetween('enrolled_at', [$start, $end])
                ->select('status', DB::raw('COUNT(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status'),
            'payments_by_method' => Payment::where('status', 'confirmed')
                ->whereBetween('paid_at', [$start, $end])
                ->select('method', DB::raw('SUM(amount) as total'))
                ->groupBy('method')
                ->pluck('total', 'method'),
            'daily_activity' => $this->dailyActivity($start, $end),
            'program_enrollments' => DB::table('enrollments')
                ->join('cohorts', 'cohorts.id', '=', 'enrollments.cohort_id')
                ->leftJoin('program_levels', 'program_levels.id', '=', 'cohorts.program_level_id')
                ->leftJoin('programs', 'programs.id', '=', 'program_levels.program_id')
                ->whereBetween('enrollments.enrolled_at', [$start, $end])
                ->selectRaw("COALESCE(programs.name, 'Legacy Program') as program_name, COUNT(enrollments.id) as total")
                ->groupBy('program_name')
                ->orderByDesc('total')
                ->get(),
        ];
    }

    private function dailyActivity(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $enrollments = Enrollment::whereBetween('enrolled_at', [$start, $end])
            ->selectRaw('DATE(enrolled_at) as activity_date, COUNT(*) as total')
            ->groupBy('activity_date')
            ->pluck('total', 'activity_date');
        $payments = Payment::where('status', 'confirmed')
            ->whereBetween('paid_at', [$start, $end])
            ->selectRaw('DATE(paid_at) as activity_date, SUM(amount) as total')
            ->groupBy('activity_date')
            ->pluck('total', 'activity_date');

        $days = [];
        for ($date = $start->startOfDay(); $date->lte($end); $date = $date->addDay()) {
            $key = $date->toDateString();
            $days[] = [
                'date' => $key,
                'enrollments' => (int) ($enrollments[$key] ?? 0),
                'payments' => (float) ($payments[$key] ?? 0),
            ];
        }

        return $days;
    }

    private function resolveRange(string $period, ?string $from, ?string $to): array
    {
        $today = CarbonImmutable::today();

        return match ($period) {
            'daily' => [$today->startOfDay(), $today->endOfDay()],
            'weekly' => [$today->startOfWeek(), $today->endOfWeek()],
            'monthly' => [$today->startOfMonth(), $today->endOfMonth()],
            'custom' => [
                CarbonImmutable::parse($from)->startOfDay(),
                CarbonImmutable::parse($to)->endOfDay(),
            ],
        };
    }
}
