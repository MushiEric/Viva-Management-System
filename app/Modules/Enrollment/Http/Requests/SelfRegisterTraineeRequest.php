<?php

namespace App\Modules\Enrollment\Http\Requests;

use App\Modules\Training\Infrastructure\Models\ProgramLevel;
use Closure;

class SelfRegisterTraineeRequest extends StoreTraineeRequest
{
    public function rules(): array
    {
        $rules = parent::rules();
        unset($rules['registration_form']);

        return [
            ...$rules,
            'program_level_id' => [
                'required',
                'integer',
                function (string $attribute, mixed $value, Closure $fail) {
                    if (! ProgramLevel::offeredForEnrollment()->whereKey($value)->exists()) {
                        $fail('The selected course is no longer open for registration.');
                    }
                },
            ],
        ];
    }
}
