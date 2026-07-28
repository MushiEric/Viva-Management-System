<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Cohort;
use Illuminate\Http\Request;

class TimetableController extends Controller
{
    /**
     * Display the public timetable grid.
     */
    public function index()
    {
        $cohorts = Cohort::where('is_active', true)
            ->with(['course.parent', 'programLevel.program', 'scheduleDays', 'facilitators:id,name'])
            ->withCount(['enrollments' => fn ($query) => $query->whereIn('status', ['pending', 'active', 'ongoing'])])
            ->get();

        return view('timetable', compact('cohorts'));
    }
}
