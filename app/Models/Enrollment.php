<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\Enrollment\Infrastructure\Models\Trainee;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Modules\Learning\Infrastructure\Models\Assessment;
use App\Modules\Learning\Infrastructure\Models\PracticalWork;
use App\Modules\Learning\Infrastructure\Models\EnrollmentNote;
use App\Modules\Learning\Infrastructure\Models\AttendanceRecord;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'cohort_id',
        'enrolled_at',
        'trainee_id',
        'status',
        'progress_percentage',
        'completed_at',
        'ended_at',
        'created_by',
        'transferred_to_enrollment_id',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
        'progress_percentage' => 'decimal:2',
        'completed_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    /**
     * User who is enrolled.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Cohort for which the user is enrolled.
     */
    public function cohort(): BelongsTo
    {
        return $this->belongsTo(Cohort::class);
    }

    public function trainee(): BelongsTo
    {
        return $this->belongsTo(Trainee::class);
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class);
    }

    public function practicalWorks(): HasMany
    {
        return $this->hasMany(PracticalWork::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(EnrollmentNote::class);
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }
}
