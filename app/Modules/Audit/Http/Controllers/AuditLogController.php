<?php

namespace App\Modules\Audit\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Audit\Infrastructure\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'actor_id' => ['nullable', 'integer', 'exists:users,id'],
            'action' => ['nullable', 'string', 'max:255'],
            'subject_type' => ['nullable', 'string', 'max:255'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', Rule::in([15, 30, 50, 100])],
        ]);

        $logs = AuditLog::with('actor:id,name,email,role')
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('action', 'like', "%{$search}%")
                        ->orWhere('subject_type', 'like', "%{$search}%")
                        ->orWhereHas('actor', fn ($query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($validated['actor_id'] ?? null, fn ($query, int $actorId) => $query->where('actor_id', $actorId))
            ->when($validated['action'] ?? null, fn ($query, string $action) => $query->where('action', $action))
            ->when($validated['subject_type'] ?? null, fn ($query, string $subjectType) => $query->where('subject_type', $subjectType))
            ->when($validated['from'] ?? null, fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($validated['to'] ?? null, fn ($query, string $to) => $query->whereDate('created_at', '<=', $to))
            ->latest('created_at')
            ->paginate($validated['per_page'] ?? 30);

        return response()->json([
            'success' => true,
            'data' => $logs,
            'filters' => [
                'actors' => User::query()
                    ->whereHas('auditLogs')
                    ->orderBy('name')
                    ->get(['id', 'name', 'role']),
                'actions' => AuditLog::query()->distinct()->orderBy('action')->pluck('action'),
                'subject_types' => AuditLog::query()->distinct()->orderBy('subject_type')->pluck('subject_type'),
            ],
        ]);
    }
}
