<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password Reset OTP</title>
</head>
<body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);">
        <div style="background:#155eef;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:800;letter-spacing:0.5px;">VIVA DIGITAL CENTER</h1>
        </div>
        <div style="padding:32px;line-height:1.6;">
            <h2 style="margin-top:0;font-size:20px;color:#0f172a;">Hello {{ $userName }},</h2>
            <p style="color:#475569;font-size:15px;">You recently requested a password reset for your Viva Digital Center account. Use the 6-digit OTP verification code below to complete the process:</p>
            
            <div style="margin:28px 0;text-align:center;">
                <div style="display:inline-block;background:#f1f5f9;border:2px dashed #155eef;border-radius:12px;padding:16px 32px;">
                    <span style="font-family:monospace;font-size:32px;font-weight:800;letter-spacing:10px;color:#155eef;">{{ $otp }}</span>
                </div>
            </div>

            <p style="color:#64748b;font-size:13px;margin-bottom:24px;">This OTP verification code is valid for <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>

            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">

            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">VIVA DIGITAL CENTER &bull; Learning By Doing</p>
        </div>
    </div>
</body>
</html>
