<?php

namespace Tests\Unit;

use App\Modules\Communication\Infrastructure\Sms\BeemSmsClient;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class BeemSmsClientTest extends TestCase
{
    #[DataProvider('phones')]
    public function test_phone_numbers_are_normalized_to_international_format(string $input, ?string $expected): void
    {
        $this->assertSame($expected, BeemSmsClient::normalizePhone($input));
    }

    public static function phones(): array
    {
        return [
            'local with leading zero' => ['0712345678', '255712345678'],
            'international with plus and spaces' => ['+255 712 345 678', '255712345678'],
            'international without plus' => ['255612345678', '255612345678'],
            'nine digits' => ['712345678', '255712345678'],
            'dashes' => ['0712-345-678', '255712345678'],
            'landline prefix' => ['0222123456', null],
            'too short' => ['07123', null],
            'foreign number' => ['+1 555 123 4567', null],
        ];
    }
}
