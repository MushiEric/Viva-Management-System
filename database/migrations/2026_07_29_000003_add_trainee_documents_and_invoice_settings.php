<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainees', function (Blueprint $table) {
            $table->string('tin', 50)->nullable()->after('email');
            $table->string('registration_form_path')->nullable()->after('occupation');
        });

        Schema::table('system_settings', function (Blueprint $table) {
            $table->string('email')->nullable()->after('website');
            $table->string('tin', 50)->nullable()->after('email');
            $table->string('bank_name')->nullable()->after('tin');
            $table->string('account_name')->nullable()->after('bank_name');
            $table->string('account_number')->nullable()->after('account_name');
            $table->string('mobile_money')->nullable()->after('account_number');
        });
    }

    public function down(): void
    {
        Schema::table('trainees', function (Blueprint $table) {
            $table->dropColumn(['tin', 'registration_form_path']);
        });

        Schema::table('system_settings', function (Blueprint $table) {
            $table->dropColumn(['email', 'tin', 'bank_name', 'account_name', 'account_number', 'mobile_money']);
        });
    }
};
