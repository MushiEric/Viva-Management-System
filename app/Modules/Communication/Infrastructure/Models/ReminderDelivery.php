<?php

namespace App\Modules\Communication\Infrastructure\Models;

use App\Models\Enrollment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReminderDelivery extends Model
{
    protected $fillable = [
        'enrollment_id',
        'session_date',
        'channel',
        'status',
        'queued_at',
        'sent_at',
        'failure_reason',
    ];

    protected function casts(): array
    {
        return [
            'session_date' => 'date',
            'queued_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }
}
