<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>New Website Enquiry</title>
</head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#155eef;padding:24px 32px;color:#ffffff;">
            <h1 style="margin:0;font-size:22px;">New Website Enquiry</h1>
        </div>
        <div style="padding:32px;">
            <p><strong>Name:</strong> {{ $inquiry->name }}</p>
            <p><strong>Email:</strong> <a href="mailto:{{ $inquiry->email }}">{{ $inquiry->email }}</a></p>
            <p><strong>Phone:</strong> {{ $inquiry->phone ?: 'Not provided' }}</p>
            <p><strong>Program:</strong> {{ $inquiry->program_of_interest ?: 'Not specified' }}</p>
            <div style="margin-top:24px;padding:20px;background:#f8fafc;border-radius:12px;white-space:pre-wrap;">{{ $inquiry->message }}</div>
            <p style="margin-top:24px;color:#64748b;font-size:13px;">Reply to this email to respond directly to {{ $inquiry->name }}.</p>
        </div>
    </div>
</body>
</html>
