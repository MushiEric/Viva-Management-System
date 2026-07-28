<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use App\Modules\Training\Infrastructure\Models\CohortScheduleDay;

class Cohort extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'course_id',
        'name',
        'schedule_window',
        'max_seats',
        'is_active',
        'program_level_id',
        'start_date',
        'end_date',
        'default_start_time',
        'default_end_time',
    ];

    /**
     * The course that this cohort belongs to.
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Enrollments in this cohort.
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function programLevel(): BelongsTo
    {
        return $this->belongsTo(ProgramLevel::class);
    }

    public function facilitators(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'cohort_facilitators')->withTimestamps();
    }

    public function scheduleDays(): HasMany
    {
        return $this->hasMany(CohortScheduleDay::class)->orderBy('day_of_week');
    }
}
