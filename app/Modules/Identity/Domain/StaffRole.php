<?php

namespace App\Modules\Identity\Domain;

enum StaffRole: string
{
    case Manager = 'manager';
    case Admin = 'admin';
    case Facilitator = 'facilitator';
}
