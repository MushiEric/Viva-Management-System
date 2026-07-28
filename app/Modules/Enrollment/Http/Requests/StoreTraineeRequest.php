<?php

namespace App\Modules\Enrollment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTraineeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['required', 'date', 'before_or_equal:today'],
            'gender' => ['required', Rule::in(['male', 'female'])],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'emergency_contact' => ['nullable', 'array'],
            'emergency_contact.full_name' => ['required_with:emergency_contact', 'string', 'max:255'],
            'emergency_contact.relationship' => ['required_with:emergency_contact', 'string', 'max:100'],
            'emergency_contact.phone' => ['required_with:emergency_contact', 'string', 'max:30'],
            'emergency_contact.alternate_phone' => ['nullable', 'string', 'max:30'],
        ];
    }
}
