<?php

namespace App\Modules\Learning\Infrastructure\Models;

use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    protected $fillable = [
        'enrollment_id',
        'session_date',
        'status',
        'notes',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return ['session_date' => 'date'];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
