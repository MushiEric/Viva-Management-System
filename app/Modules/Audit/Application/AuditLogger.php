<?php

namespace App\Modules\Audit\Application;

use App\Models\User;
use App\Modules\Audit\Infrastructure\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

final class AuditLogger
{
    public function record(
        ?User $actor,
        string $action,
        Model $subject,
        ?array $before = null,
        ?array $after = null,
    ): void {
        AuditLog::create([
            'actor_id' => $actor?->id,
            'action' => $action,
            'subject_type' => $subject->getMorphClass(),
            'subject_id' => $subject->getKey(),
            'before' => $before,
            'after' => $after,
            'ip_address' => request()?->ip(),
            'created_at' => now(),
        ]);
    }
}
