<?php

namespace Tests\Feature;

use App\Mail\SendPasswordResetOtp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetOtpTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_request_password_reset_otp_for_existing_user(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'staff@example.com',
            'status' => 'approved',
        ]);

        $response = $this->postJson('/api/v1/forgot-password/otp', [
            'email' => 'staff@example.com',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'An OTP verification code has been sent to your email.',
            ]);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'staff@example.com',
        ]);

        Mail::assertSent(SendPasswordResetOtp::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    public function test_request_otp_non_existing_user_returns_success_gracefully(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/forgot-password/otp', [
            'email' => 'unknown@example.com',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'An OTP verification code has been sent to your email.',
            ]);

        Mail::assertNothingSent();
    }

    public function test_can_reset_password_with_valid_otp(): void
    {
        $user = User::factory()->create([
            'email' => 'staff@example.com',
            'password' => Hash::make('OldPassword123!'),
            'status' => 'approved',
        ]);

        $otp = '123456';
        DB::table('password_reset_tokens')->insert([
            'email' => 'staff@example.com',
            'token' => Hash::make($otp),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/reset-password/otp', [
            'email' => 'staff@example.com',
            'otp' => '123456',
            'password' => 'NewStrongPass123!',
            'password_confirmation' => 'NewStrongPass123!',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Password reset successfully. You can now log in.',
            ]);

        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'staff@example.com',
        ]);

        $user->refresh();
        $this::assertTrue(Hash::check('NewStrongPass123!', $user->password));
    }

    public function test_can_verify_valid_otp(): void
    {
        User::factory()->create([
            'email' => 'staff@example.com',
            'status' => 'approved',
        ]);

        DB::table('password_reset_tokens')->insert([
            'email' => 'staff@example.com',
            'token' => Hash::make('123456'),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/forgot-password/verify-otp', [
            'email' => 'staff@example.com',
            'otp' => '123456',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'OTP code verified successfully.',
            ]);
    }

    public function test_reset_password_with_invalid_otp_fails(): void
    {
        User::factory()->create([
            'email' => 'staff@example.com',
            'status' => 'approved',
        ]);

        DB::table('password_reset_tokens')->insert([
            'email' => 'staff@example.com',
            'token' => Hash::make('123456'),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/forgot-password/verify-otp', [
            'email' => 'staff@example.com',
            'otp' => '999999',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['otp']);

        $response = $this->postJson('/api/v1/reset-password/otp', [
            'email' => 'staff@example.com',
            'otp' => '999999',
            'password' => 'NewStrongPass123!',
            'password_confirmation' => 'NewStrongPass123!',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['otp']);
    }
}

