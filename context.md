@workspace 
Act as a Senior Laravel & PostgreSQL Software Architect. We are building a lightweight, high-performance training management portal for "Viva Digital Center" based in Dar es Salaam, Tanzania. The system must run fast on 8GB RAM local machines, avoiding domain overhead.

Our target stack is Laravel 11, PostgreSQL, and The system must scale up to support a Flutter mobile app API later.

Execute the implementation of the system framework systematically following these absolute architectural constraints and business criteria:

1. CORE DATABASE LAYER (PostgreSQL Migration & Eloquent Models)
Generate lean migrations and models utilizing a parent-child self-referencing relationship for courses.
- A null 'parent_id' indicates a "Full Package Course" (e.g., Full Web Frontend Development).
- A valid 'parent_id' indicates a "Granular Standalone Module" (e.g., Just JavaScript instead of the whole package).
- Users can be 'admin', 'student', or 'minor' (Kids/Teens). Track minors via a self-referencing 'managed_by_id' pointing to the admin or parent user who registered them. Minors can have a NULL email and phone.
- Cohorts table must contain strict scheduling windows ('morning', 'afternoon', 'evening', 'weekend') and a hard ceiling attribute 'max_seats' DEFAULT 7 (to match our 7 computer lab PCs).

2. HARD LAB CAPACITY CAPACITY LOGIC (Enrollment Controller)
Write the registration processing controller logic. Ensure all enrollment attempts hit a database transaction check. If a specific cohort has >= 7 active students already bound to that time window, reject the request with a clean error message: "Lab at maximum capacity (7/7 stations occupied) for this session."

3. EVENT-DRIVEN COMMUNICATIONS LAYER
Implement an asynchronous, queued event-driven notification flow using Laravel Events and Listeners:
- Fire a `StudentRegistered` event upon enrollment.
- Create an asynchronous listener `SendWelcomeEmail` (implementing ShouldQueue). If the user is a standard student, email them. If they are a minor, query the `managed_by_id` relation and dispatch the welcome summary/invoice details to the parent or managing admin's email instead.
- Scaffold a shell listener `QueueSmsNotification` as a pre-configured architecture hook for future local Tanzanian SMS gateway integrations (e.g., Beem or NextSMS).

4. PUBLIC TIME-TABLE VIEW (Wall QR Code Router Target)
Create a responsive, mobile-first Blade template view mapped to the public web route `/timetable`. This page will be loaded when users scan our office wall QR code. It must read active cohorts from the database and render a beautiful, scannable grid showing the Program, Day Sequence, Time Window, and Seat Availability (X out of 7 spots taken).

5. FLUTTER INTEGRATION FOUNDATION
Expose a separate API route file module (`routes/api.php`) protected via Laravel Sanctum. Create api controllers providing raw JSON outputs of the active timetables and enrollment request hooks so a Flutter application can consume it dynamically later.

---

ANTIGRAVITY AGENT EXECUTION RULES:
- Read the entire existing project directory using your workspace context tools.
- Generate a cohesive implementation plan in Planning Mode first. 
- Once approved, proceed to execute file changes, write complete code blocks (no partial snippets or placeholders), run artisan migrations, and verify your changes autonomously via your terminal/browser loop surfaces.
