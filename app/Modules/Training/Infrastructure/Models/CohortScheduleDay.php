<?php

namespace App\Modules\Training\Infrastructure\Models;

use App\Models\Cohort;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CohortScheduleDay extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'cohort_id',
        'day_of_week',
        'start_time',
        'end_time',
    ];

    public function cohort(): BelongsTo
    {
        return $this->belongsTo(Cohort::class);
    }
}
