<?php

namespace App\Shared\Validation;

use Illuminate\Validation\Rules\Password;

final class StrongPassword
{
    public static function rule(): Password
    {
        return Password::min(8)
            ->mixedCase()
            ->numbers()
            ->symbols();
    }
}
