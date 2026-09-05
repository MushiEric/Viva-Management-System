<?php

namespace App\Modules\Training\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProgramLevelRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'syllabus' => ['nullable', 'string'],
            'syllabus_outline' => ['required', 'array', 'min:1', 'max:100'],
            'syllabus_outline.*' => ['required', 'array:title,submodules'],
            'syllabus_outline.*.title' => ['required', 'string', 'max:255'],
            'syllabus_outline.*.submodules' => ['nullable', 'array', 'max:100'],
            'syllabus_outline.*.submodules.*' => ['required', 'array:title'],
            'syllabus_outline.*.submodules.*.title' => ['required', 'string', 'max:255'],
            'duration_weeks' => ['nullable', 'integer', 'min:1', 'max:104'],
            'training_days_per_week' => ['nullable', 'integer', 'min:1', 'max:6'],
            'fee_tzs' => ['required', 'numeric', 'min:0'],
            'prerequisite_level_ids' => ['nullable', 'array'],
            'prerequisite_level_ids.*' => ['integer', 'distinct', Rule::exists('program_levels', 'id')],
            'facilitator_ids' => ['nullable', 'array'],
            'facilitator_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'facilitator')->where('status', 'approved')),
            ],
        ];
    }
}
