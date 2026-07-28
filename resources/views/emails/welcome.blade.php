<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enrollment Confirmation</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f6f8;
            color: #333333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }
        .header {
            background-color: #1e3a8a;
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
            line-height: 1.6;
        }
        .content h2 {
            color: #1e3a8a;
            font-size: 20px;
            margin-top: 0;
        }
        .details-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .details-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 8px;
        }
        .details-row:last-child {
            margin-bottom: 0;
            border-bottom: none;
            padding-bottom: 0;
        }
        .label {
            font-weight: 600;
            color: #475569;
        }
        .value {
            color: #0f172a;
        }
        .footer {
            background-color: #f1f5f9;
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Viva Digital Center</h1>
        </div>
        <div class="content">
            @if($student->role === 'minor')
                <h2>Enrollment Summary & Invoice Details</h2>
                <p>Hello,</p>
                <p>This email is sent to you because you are the registered parent/managing administrator for the minor student enrolled below.</p>
                
                <div class="details-box">
                    <div class="details-row">
                        <span class="label">Student Name:</span>
                        <span class="value">{{ $student->name }}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Course/Program:</span>
                        <span class="value">{{ $cohort->course->name }}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Cohort Group:</span>
                        <span class="value">{{ $cohort->name }}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Schedule Slot:</span>
                        <span class="value">{{ ucfirst($cohort->schedule_window) }}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Status:</span>
                        <span class="value" style="color: #10b981; font-weight: bold;">Enrolled (Confirmed)</span>
                    </div>
                </div>

                <p>An invoice has been generated for this enrollment. Please find the details attached or contact our administration desk at Viva Digital Center, Dar es Salaam for payment instructions.</p>
            @else
                <h2>Welcome to Viva Digital Center!</h2>
                <p>Dear {{ $student->name }},</p>
                <p>Congratulations! You have successfully registered for the training program. Below are your cohort details:</p>

                <div class="details-box">
                    <div class="details-row">
                        <span class="label">Course/Program:</span>
                        <span class="value">{{ $cohort->course->name }}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Cohort Group:</span>
                        <span class="value">{{ $cohort->name }}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Schedule Slot:</span>
                        <span class="value">{{ ucfirst($cohort->schedule_window) }}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Status:</span>
                        <span class="value" style="color: #10b981; font-weight: bold;">Active</span>
                    </div>
                </div>

                <p>We look forward to seeing you at our computer lab. Please arrive 10 minutes prior to your session time.</p>
            @endif
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Viva Digital Center. All rights reserved.<br>
            Dar es Salaam, Tanzania
        </div>
    </div>
</body>
</html>
