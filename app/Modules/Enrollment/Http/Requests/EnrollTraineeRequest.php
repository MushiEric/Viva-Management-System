<?php

namespace App\Modules\Enrollment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EnrollTraineeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'trainee_id' => ['required', 'exists:trainees,id'],
            'cohort_id' => ['required', 'exists:cohorts,id'],
        ];
    }
}
