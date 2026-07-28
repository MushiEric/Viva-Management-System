<?php

namespace App\Modules\Learning\Infrastructure\Models;

use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnrollmentNote extends Model
{
    protected $fillable = ['enrollment_id', 'note', 'recorded_by'];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
