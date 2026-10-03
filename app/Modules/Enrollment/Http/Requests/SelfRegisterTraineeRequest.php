<?php

namespace App\Modules\Enrollment\Http\Requests;

use Illuminate\Validation\Rule;

class SelfRegisterTraineeRequest extends StoreTraineeRequest
{
    public function rules(): array
    {
        $rules = parent::rules();
        unset($rules['registration_form']);

        return [
            ...$rules,
            'cohort_id' => ['required', 'integer', Rule::exists('cohorts', 'id')->where('is_active', true)],
        ];
    }

    public function messages(): array
    {
        return [
            'cohort_id.exists' => 'The selected class is no longer open for registration.',
        ];
    }
}
