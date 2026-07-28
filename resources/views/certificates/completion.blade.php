<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 0; }
        body { margin: 0; font-family: DejaVu Sans, sans-serif; color: #0f172a; }
        .page { border: 18px solid #1d4ed8; height: 555px; padding: 42px 58px; position: relative; text-align: center; }
        .inner { border: 3px solid #16a34a; height: 465px; padding: 28px; }
        .brand { color: #1d4ed8; font-size: 18px; font-weight: bold; letter-spacing: 3px; }
        h1 { font-size: 42px; margin: 20px 0 8px; }
        .subtitle { color: #64748b; font-size: 16px; }
        .name { color: #15803d; font-size: 34px; font-weight: bold; margin: 24px 0 12px; }
        .program { font-size: 24px; font-weight: bold; margin: 12px; }
        .motto { color: #1d4ed8; font-style: italic; margin-top: 24px; }
        .footer { position: absolute; bottom: 38px; left: 70px; right: 70px; text-align: left; font-size: 11px; color: #475569; }
        .qr { position: absolute; right: 78px; bottom: 42px; width: 90px; height: 90px; }
    </style>
</head>
<body>
<div class="page">
    <div class="inner">
        <div class="brand">VIVA DIGITAL CENTER</div>
        <h1>Certificate of Completion</h1>
        <div class="subtitle">This internal certificate is proudly presented to</div>
        <div class="name">{{ $traineeName }}</div>
        <div class="subtitle">for successfully completing</div>
        <div class="program">{{ $programName }} — {{ $levelName }}</div>
        <div>Completed on {{ $completedAt->format('d F Y') }}</div>
        <div class="motto">Learning By Doing</div>
    </div>
    <div class="footer">
        Certificate: {{ $certificateNumber }}<br>
        VIVA DIGITAL CENTER · Ferry, Kigamboni, Dar es Salaam · 0784906044
    </div>
    <img class="qr" src="{{ $qrDataUri }}" alt="Certificate QR code">
</div>
</body>
</html>
