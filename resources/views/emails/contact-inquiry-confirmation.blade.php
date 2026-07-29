<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Enquiry Received</title>
</head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#155eef;padding:24px 32px;color:#ffffff;">
            <h1 style="margin:0;font-size:22px;">VIVA DIGITAL CENTER</h1>
        </div>
        <div style="padding:32px;line-height:1.65;">
            <h2 style="margin-top:0;">Hello {{ $inquiry->name }},</h2>
            <p>Thank you for contacting us. We have received your enquiry and a member of our team will contact you shortly.</p>
            @if($inquiry->program_of_interest)
                <p><strong>Program of interest:</strong> {{ $inquiry->program_of_interest }}</p>
            @endif
            <p style="margin-top:28px;">VIVA DIGITAL CENTER<br>Learning By Doing</p>
        </div>
    </div>
</body>
</html>
