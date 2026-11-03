<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainees', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->change();
            // Course a self-registered trainee asked for; the office enrolls them into a cohort later.
            $table->foreignId('requested_program_level_id')
                ->nullable()
                ->after('registration_source')
                ->constrained('program_levels')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('trainees', function (Blueprint $table) {
            $table->dropConstrainedForeignId('requested_program_level_id');
            $table->date('date_of_birth')->nullable(false)->change();
        });
    }
};
