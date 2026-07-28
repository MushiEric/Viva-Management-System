<?php

namespace App\Modules\Training\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCohortRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'program_level_id' => ['required', 'exists:program_levels,id'],
            'name' => ['required', 'string', 'max:255'],
            'schedule_window' => ['required', Rule::in(['morning', 'afternoon', 'evening', 'weekend', 'custom'])],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'default_start_time' => ['nullable', 'date_format:H:i'],
            'default_end_time' => ['nullable', 'date_format:H:i'],
            'is_active' => ['nullable', 'boolean'],
            'facilitator_ids' => ['required', 'array', 'min:1'],
            'facilitator_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'facilitator')->where('status', 'approved')),
            ],
            'schedule_days' => ['required', 'array', 'min:1', 'max:6'],
            'schedule_days.*.day_of_week' => ['required', 'integer', 'between:1,6', 'distinct'],
            'schedule_days.*.start_time' => ['nullable', 'date_format:H:i'],
            'schedule_days.*.end_time' => ['nullable', 'date_format:H:i'],
        ];
    }
}
