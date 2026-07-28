<?php

namespace App\Modules\Training\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Program extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
        'review_notes',
    ];

    protected function casts(): array
    {
        return ['approved_at' => 'datetime'];
    }

    public function levels(): HasMany
    {
        return $this->hasMany(ProgramLevel::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
