<?php

namespace App\Modules\Enrollment\Infrastructure\Models;

use App\Models\Enrollment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Trainee extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'trainee_number',
        'full_name',
        'date_of_birth',
        'gender',
        'phone',
        'email',
        'tin',
        'address',
        'occupation',
        'registration_form_path',
    ];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date'];
    }

    public function emergencyContact(): HasOne
    {
        return $this->hasOne(EmergencyContact::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function isMinor(): bool
    {
        return $this->date_of_birth->age < 18;
    }
}
