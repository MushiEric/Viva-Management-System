<?php

namespace App\Modules\Identity\Http\Requests;

use App\Modules\Identity\Domain\StaffRole;
use App\Shared\Validation\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->route('staff'))],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['sometimes', 'required', Rule::enum(StaffRole::class)],
            'password' => ['nullable', 'confirmed', StrongPassword::rule()],
        ];
    }
}
