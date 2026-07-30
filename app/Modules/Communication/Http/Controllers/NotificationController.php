<?php

namespace App\Modules\Communication\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

final class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->paginate(min(max($request->integer('per_page', 15), 1), 50));

        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $notifications,
                'unread_count' => $request->user()->unreadNotifications()->count(),
            ],
        ]);
    }

    public function settings(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'email_notifications_enabled' => $request->user()->email_notifications_enabled,
                'in_app_notifications_enabled' => true,
            ],
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_notifications_enabled' => ['required', 'boolean'],
        ]);
        $request->user()->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Notification settings updated.',
            'data' => [
                'email_notifications_enabled' => $request->user()->email_notifications_enabled,
                'in_app_notifications_enabled' => true,
            ],
        ]);
    }

    public function markRead(Request $request, DatabaseNotification $notification): JsonResponse
    {
        abort_unless((int) $notification->notifiable_id === $request->user()->id, 404);
        $notification->markAsRead();

        return response()->json(['success' => true, 'message' => 'Notification marked as read.']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['success' => true, 'message' => 'All notifications marked as read.']);
    }
}
