<?php

namespace App\Modules\Training\Infrastructure\Models;

use App\Models\Cohort;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProgramLevel extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'program_id',
        'name',
        'description',
        'syllabus',
        'syllabus_outline',
        'duration_weeks',
        'training_days_per_week',
        'fee_tzs',
        'fee_status',
        'fee_approved_by',
        'fee_approved_at',
    ];

    protected function casts(): array
    {
        return [
            'syllabus_outline' => 'array',
            'fee_tzs' => 'decimal:2',
            'fee_approved_at' => 'datetime',
        ];
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function prerequisites(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'program_level_prerequisites', 'program_level_id', 'prerequisite_level_id');
    }

    public function facilitators(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'program_level_facilitators')->withTimestamps();
    }

    public function cohorts(): HasMany
    {
        return $this->hasMany(Cohort::class);
    }
}
