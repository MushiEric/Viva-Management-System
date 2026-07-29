<?php

namespace App\Modules\Communication\Infrastructure\Models;

use Illuminate\Database\Eloquent\Model;

class ContactInquiry extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'program_of_interest',
        'message',
        'status',
    ];
}
