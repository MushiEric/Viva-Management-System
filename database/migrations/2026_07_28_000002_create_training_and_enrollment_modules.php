<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('draft');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('program_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->longText('syllabus')->nullable();
            $table->unsignedSmallInteger('duration_weeks')->default(4);
            $table->unsignedSmallInteger('training_days_per_week')->default(6);
            $table->decimal('fee_tzs', 14, 2)->default(0);
            $table->string('fee_status')->default('pending_approval');
            $table->foreignId('fee_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('fee_approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('program_level_prerequisites', function (Blueprint $table) {
            $table->foreignId('program_level_id')->constrained()->cascadeOnDelete();
            $table->foreignId('prerequisite_level_id')->constrained('program_levels')->cascadeOnDelete();
            $table->primary(['program_level_id', 'prerequisite_level_id']);
        });

        Schema::create('program_level_facilitators', function (Blueprint $table) {
            $table->foreignId('program_level_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['program_level_id', 'user_id']);
        });

        Schema::table('cohorts', function (Blueprint $table) {
            $table->foreignId('course_id')->nullable()->change();
            $table->foreignId('program_level_id')->nullable()->after('course_id')->constrained()->nullOnDelete();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->time('default_start_time')->nullable();
            $table->time('default_end_time')->nullable();
            $table->softDeletes();
        });

        Schema::create('cohort_schedule_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cohort_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->unique(['cohort_id', 'day_of_week']);
        });

        Schema::create('cohort_facilitators', function (Blueprint $table) {
            $table->foreignId('cohort_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['cohort_id', 'user_id']);
        });

        Schema::create('learning_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('version')->default('1.0');
            $table->string('material_type');
            $table->string('file_path')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->longText('rich_text')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('trainees', function (Blueprint $table) {
            $table->id();
            $table->string('trainee_number')->unique();
            $table->string('full_name');
            $table->date('date_of_birth');
            $table->string('gender');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('occupation')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('emergency_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trainee_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('full_name');
            $table->string('relationship');
            $table->string('phone');
            $table->string('alternate_phone')->nullable();
            $table->timestamps();
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
            $table->foreignId('trainee_id')->nullable()->after('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('active');
            $table->decimal('progress_percentage', 5, 2)->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('transferred_to_enrollment_id')->nullable()->constrained('enrollments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transferred_to_enrollment_id');
            $table->dropConstrainedForeignId('created_by');
            $table->dropConstrainedForeignId('trainee_id');
            $table->dropColumn(['status', 'progress_percentage', 'completed_at', 'ended_at']);
        });
        Schema::dropIfExists('emergency_contacts');
        Schema::dropIfExists('trainees');
        Schema::dropIfExists('learning_materials');
        Schema::dropIfExists('cohort_facilitators');
        Schema::dropIfExists('cohort_schedule_days');
        Schema::table('cohorts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('program_level_id');
            $table->dropColumn(['start_date', 'end_date', 'default_start_time', 'default_end_time', 'deleted_at']);
        });
        Schema::dropIfExists('program_level_facilitators');
        Schema::dropIfExists('program_level_prerequisites');
        Schema::dropIfExists('program_levels');
        Schema::dropIfExists('programs');
    }
};
