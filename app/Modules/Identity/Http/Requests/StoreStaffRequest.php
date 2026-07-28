<?php

namespace App\Modules\Identity\Http\Requests;

use App\Modules\Identity\Domain\StaffRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStaffRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', Rule::enum(StaffRole::class)],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
