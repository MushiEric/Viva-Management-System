<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('program_levels', function (Blueprint $table) {
            $table->json('syllabus_outline')->nullable()->after('syllabus');
        });
    }

    public function down(): void
    {
        Schema::table('program_levels', function (Blueprint $table) {
            $table->dropColumn('syllabus_outline');
        });
    }
};
