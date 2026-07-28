<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Timetable - Viva Digital Center</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: rgba(20, 26, 45, 0.6);
            --card-border: rgba(255, 255, 255, 0.08);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent-primary: #6366f1;
            --accent-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            --success-glow: rgba(16, 185, 129, 0.15);
            --success-border: rgba(16, 185, 129, 0.4);
            --success-text: #34d399;
            --danger-glow: rgba(239, 68, 68, 0.15);
            --danger-border: rgba(239, 68, 68, 0.4);
            --danger-text: #f87171;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 2rem 1.5rem;
            position: relative;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* Abstract glowing blobs for premium feel */
        body::before {
            content: '';
            position: absolute;
            top: -20%;
            left: -10%;
            width: 50vw;
            height: 50vw;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
            z-index: -1;
            pointer-events: none;
        }

        body::after {
            content: '';
            position: absolute;
            bottom: -10%;
            right: -10%;
            width: 40vw;
            height: 40vw;
            background: radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(0, 0, 0, 0) 70%);
            z-index: -1;
            pointer-events: none;
        }

        header {
            text-align: center;
            margin-bottom: 3rem;
            max-width: 600px;
            width: 100%;
        }

        header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.025em;
        }

        header p {
            color: var(--text-secondary);
            font-size: 1.1rem;
            line-height: 1.6;
        }

        header .location-badge {
            display: inline-block;
            margin-top: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--card-border);
            padding: 0.4rem 1rem;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            text-transform: uppercase;
        }

        .container {
            max-width: 1200px;
            width: 100%;
            margin: 0 auto;
            flex-grow: 1;
        }

        .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }

        @media (min-width: 768px) {
            .grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (min-width: 1024px) {
            .grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 1.75rem;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: var(--accent-gradient);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
            border-color: rgba(99, 102, 241, 0.3);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        }

        .card:hover::before {
            opacity: 1;
        }

        .card-header {
            margin-bottom: 1.25rem;
        }

        .card-header .type-tag {
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--accent-primary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: block;
            margin-bottom: 0.4rem;
        }

        .card-header h2 {
            font-size: 1.35rem;
            font-weight: 600;
            color: var(--text-primary);
            line-height: 1.3;
        }

        .card-header .parent-course {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-top: 0.25rem;
            display: block;
            font-style: italic;
        }

        .card-body {
            margin-bottom: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.95rem;
        }

        .info-label {
            color: var(--text-secondary);
        }

        .info-value {
            font-weight: 600;
            color: var(--text-primary);
        }

        .card-footer {
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 1.25rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        /* Capacity Badge logic */
        .capacity-badge {
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .capacity-badge.available {
            background-color: var(--success-glow);
            border: 1px solid var(--success-border);
            color: var(--success-text);
        }

        .capacity-badge.full {
            background-color: var(--danger-glow);
            border: 1px solid var(--danger-border);
            color: var(--danger-text);
        }

        .capacity-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .capacity-badge.available .capacity-dot {
            background-color: var(--success-text);
            box-shadow: 0 0 8px var(--success-text);
        }

        .capacity-badge.full .capacity-dot {
            background-color: var(--danger-text);
            box-shadow: 0 0 8px var(--danger-text);
        }

        .schedule-badge {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: capitalize;
        }

        .empty-state {
            grid-column: 1 / -1;
            text-align: center;
            padding: 4rem 2rem;
            background: var(--card-bg);
            border: 1px dashed var(--card-border);
            border-radius: 16px;
            color: var(--text-secondary);
        }

        footer {
            margin-top: 4rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            text-align: center;
            color: var(--text-secondary);
            font-size: 0.85rem;
            width: 100%;
            max-width: 1200px;
        }
    </style>
</head>
<body>

    <header>
        <span class="location-badge">Ferry, Kigamboni · Dar es Salaam</span>
        <h1>VIVA DIGITAL CENTER</h1>
        <p>Learning By Doing. Check program dates, session times, fees, and current computer availability.</p>
    </header>

    <main class="container">
        <div class="grid">
            @forelse($cohorts as $cohort)
                @php
                    $enrolled = $cohort->enrollments_count;
                    $total = $cohort->max_seats;
                    $availableSeats = $total - $enrolled;
                    $isFull = $availableSeats <= 0;
                    $level = $cohort->programLevel;
                    $programName = $level?->program?->name ?? $cohort->course?->parent?->name ?? $cohort->course?->name;
                    $levelName = $level?->name ?? $cohort->course?->name;
                @endphp

                <div class="card" id="cohort-{{ $cohort->id }}">
                    <div class="card-header">
                        <span class="type-tag">
                            {{ $programName }}
                        </span>
                        <h2>{{ $levelName }}</h2>
                        <span class="parent-course">{{ $cohort->name }}</span>
                    </div>

                    <div class="card-body">
                        <div class="info-row">
                            <span class="info-label">Dates:</span>
                            <span class="info-value">{{ $cohort->start_date ?: 'TBA' }} – {{ $cohort->end_date ?: 'TBA' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Training days:</span>
                            <span class="info-value">
                                @foreach($cohort->scheduleDays as $day)
                                    {{ ['Mon','Tue','Wed','Thu','Fri','Sat'][$day->day_of_week - 1] }}{{ !$loop->last ? ', ' : '' }}
                                @endforeach
                            </span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Time:</span>
                            <span class="info-value">{{ substr($cohort->default_start_time ?? '', 0, 5) }} – {{ substr($cohort->default_end_time ?? '', 0, 5) }}</span>
                        </div>
                        @if($level)
                            <div class="info-row">
                                <span class="info-label">Fee:</span>
                                <span class="info-value">TZS {{ number_format((float) $level->fee_tzs) }}</span>
                            </div>
                        @endif
                        <div class="info-row">
                            <span class="info-label">Facilitator:</span>
                            <span class="info-value">{{ $cohort->facilitators->pluck('name')->join(', ') ?: 'TBA' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Occupancy:</span>
                            <span class="info-value">{{ $enrolled }} / {{ $total }} stations</span>
                        </div>
                    </div>

                    <div class="card-footer">
                        <span class="schedule-badge">
                            {{ $cohort->schedule_window }}
                        </span>

                        @if($isFull)
                            <div class="capacity-badge full">
                                <span class="capacity-dot"></span>
                                Fully Booked
                            </div>
                        @else
                            <div class="capacity-badge available">
                                <span class="capacity-dot"></span>
                                {{ $availableSeats }} spots left
                            </div>
                        @endif
                    </div>
                </div>
            @empty
                <div class="empty-state">
                    <h3>No active training cohorts configured.</h3>
                    <p>Please log in to the admin panel to seed new training groups and courses.</p>
                </div>
            @endforelse
        </div>
    </main>

    <footer>
        <p>&copy; {{ date('Y') }} VIVA DIGITAL CENTER · 0784906044 · vivadigitalcenter@gmail.com · vivadigitalcenter.com</p>
    </footer>

</body>
</html>
