<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollment_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_enrollment_id')->constrained('enrollments')->restrictOnDelete();
            $table->foreignId('to_enrollment_id')->constrained('enrollments')->restrictOnDelete();
            $table->foreignId('transferred_by')->constrained('users')->restrictOnDelete();
            $table->text('reason');
            $table->timestamp('created_at');
            $table->unique('from_enrollment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollment_transfers');
    }
};
