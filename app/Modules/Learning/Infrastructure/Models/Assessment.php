<?php

namespace App\Modules\Learning\Infrastructure\Models;

use App\Models\Enrollment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Assessment extends Model
{
    protected $fillable = ['enrollment_id', 'title', 'percentage', 'feedback', 'recorded_by', 'assessed_at'];

    protected function casts(): array
    {
        return ['percentage' => 'decimal:2', 'assessed_at' => 'datetime'];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }
}
