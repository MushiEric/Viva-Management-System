<?php

namespace App\Modules\Learning\Infrastructure\Models;

use App\Models\Enrollment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PracticalWork extends Model
{
    protected $fillable = ['enrollment_id', 'title', 'description', 'outcome', 'percentage', 'recorded_by', 'completed_at'];

    protected function casts(): array
    {
        return ['percentage' => 'decimal:2', 'completed_at' => 'datetime'];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }
}
