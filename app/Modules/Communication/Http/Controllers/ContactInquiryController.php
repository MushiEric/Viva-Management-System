<?php

namespace App\Modules\Communication\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Communication\Domain\Events\ContactInquirySubmitted;
use App\Modules\Communication\Http\Requests\StoreContactInquiryRequest;
use App\Modules\Communication\Infrastructure\Models\ContactInquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class ContactInquiryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $summary = ContactInquiry::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $inquiries = ContactInquiry::query()
            ->when(
                $request->string('status')->isNotEmpty(),
                fn ($query) => $query->where('status', $request->string('status')->toString()),
            )
            ->when($request->string('search')->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('program_of_interest', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => [
                'inquiries' => $inquiries,
                'summary' => [
                    'total' => $summary->sum(),
                    'new' => (int) ($summary['new'] ?? 0),
                    'in_progress' => (int) ($summary['in_progress'] ?? 0),
                    'contacted' => (int) ($summary['contacted'] ?? 0),
                    'closed' => (int) ($summary['closed'] ?? 0),
                ],
            ],
        ]);
    }

    public function store(StoreContactInquiryRequest $request): JsonResponse
    {
        $inquiry = ContactInquiry::create($request->validated());
        event(new ContactInquirySubmitted($inquiry));

        return response()->json([
            'success' => true,
            'message' => 'Thank you for contacting VIVA Digital Center. We will contact you shortly.',
            'data' => ['id' => $inquiry->id],
        ], 201);
    }

    public function update(Request $request, ContactInquiry $inquiry): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['new', 'in_progress', 'contacted', 'closed'])],
        ]);

        $inquiry->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Enquiry status updated.',
            'data' => $inquiry->fresh(),
        ]);
    }
}
