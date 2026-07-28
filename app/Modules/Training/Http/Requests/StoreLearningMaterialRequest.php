<?php

namespace App\Modules\Training\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLearningMaterialRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'version' => ['required', 'string', 'max:50'],
            'material_type' => ['required', Rule::in(['file', 'rich_text'])],
            'file' => [
                Rule::requiredIf(fn () => $this->input('material_type') === 'file' && !$this->route('material')),
                'nullable',
                'file',
                'max:10240',
                'mimes:pdf,doc,docx',
            ],
            'rich_text' => [
                Rule::requiredIf(fn () => $this->input('material_type') === 'rich_text'),
                'nullable',
                'string',
            ],
        ];
    }
}
