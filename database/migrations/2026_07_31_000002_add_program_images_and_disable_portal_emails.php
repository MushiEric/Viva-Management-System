<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('description');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_notifications_enabled')->default(false)->change();
        });

        DB::table('users')->update(['email_notifications_enabled' => false]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_notifications_enabled')->default(true)->change();
        });

        Schema::table('programs', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }
};
