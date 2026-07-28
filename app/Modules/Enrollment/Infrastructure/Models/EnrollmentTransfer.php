<?php

namespace App\Modules\Enrollment\Infrastructure\Models;

use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnrollmentTransfer extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'from_enrollment_id',
        'to_enrollment_id',
        'transferred_by',
        'reason',
        'created_at',
    ];

    public function fromEnrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class, 'from_enrollment_id');
    }

    public function toEnrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class, 'to_enrollment_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transferred_by');
    }
}
