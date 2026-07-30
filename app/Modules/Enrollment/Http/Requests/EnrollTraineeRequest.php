<?php

namespace App\Modules\Enrollment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EnrollTraineeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'trainee_id' => [
                'required',
                Rule::exists('trainees', 'id')->whereNull('deleted_at'),
            ],
            'cohort_id' => ['required', 'exists:cohorts,id'],
        ];
    }
}
