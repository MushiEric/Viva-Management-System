<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'parent_id',
    ];

    /**
     * Parent package course.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Course::class, 'parent_id');
    }

    /**
     * Granular modules of this course.
     */
    public function modules(): HasMany
    {
        return $this->hasMany(Course::class, 'parent_id');
    }

    /**
     * Cohorts under this course.
     */
    public function cohorts(): HasMany
    {
        return $this->hasMany(Cohort::class);
    }
}
