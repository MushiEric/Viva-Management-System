<?php

namespace App\Shared\Application;

use Illuminate\Support\Facades\DB;

final class SequentialNumberGenerator
{
    public function next(string $type, string $prefix): string
    {
        return DB::transaction(function () use ($type, $prefix) {
            $sequence = DB::table('document_sequences')->lockForUpdate()->where('type', $type)->first();
            $next = $sequence ? $sequence->last_number + 1 : 1;

            DB::table('document_sequences')->updateOrInsert(
                ['type' => $type],
                ['last_number' => $next, 'updated_at' => now()],
            );

            return sprintf('%s-%s-%06d', $prefix, now()->format('Y'), $next);
        });
    }
}
