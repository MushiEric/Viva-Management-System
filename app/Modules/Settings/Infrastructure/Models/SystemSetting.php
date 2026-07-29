<?php

namespace App\Modules\Settings\Infrastructure\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = [
        'brand_name',
        'phone',
        'location',
        'website',
        'email',
        'tin',
        'bank_name',
        'account_name',
        'account_number',
        'mobile_money',
    ];

    public static function defaults(): array
    {
        return [
            'brand_name' => config('viva.office.name'),
            'phone' => config('viva.office.phone'),
            'location' => config('viva.office.location'),
            'website' => config('viva.office.website'),
            'email' => config('viva.office.email'),
            'tin' => config('viva.office.tin'),
            'bank_name' => null,
            'account_name' => config('viva.office.name'),
            'account_number' => null,
            'mobile_money' => null,
        ];
    }

    public static function current(): self
    {
        return self::query()->firstOrCreate(['id' => 1], self::defaults());
    }
}
