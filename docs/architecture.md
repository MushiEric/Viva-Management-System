# Viva Digital Center Modular Monolith

## Architectural rules

- Each module owns its domain model, application services, persistence, HTTP endpoints, and events.
- Modules do not query another module's tables directly from controllers.
- Cross-module workflows use explicit application contracts or domain events.
- Controllers validate and delegate; business rules live in application/domain services.
- Transactions are controlled by application services.
- Infrastructure implementations depend on domain/application contracts, never the reverse.
- Records with business history use statuses and soft deletion instead of destructive deletion.

## Modules

| Module | Responsibility |
| --- | --- |
| Identity | Staff accounts, single roles, predefined permissions, account approval |
| Training | Programs, levels, prerequisites, cohorts, schedules, facilitators, materials |
| Enrollment | Trainees, emergency contacts, enrollment, capacity, transfers |
| Learning | Progress, assessments, practical work, notes, optional attendance |
| Finance | TZS fees, discounts, invoices, payments, allocations, receipts |
| Certification | Completion certificates and QR payload generation |
| Communication | Enrollment, payment, and class-reminder email workflows |
| Reporting | Dashboard projections and date-based operational reports |
| Audit | Immutable records of important staff actions |

## Dependency direction

`Http -> Application -> Domain`

`Infrastructure -> Application/Domain contracts`

Cross-module example:

`EnrollmentCompleted -> Certification issues certificate`

`PaymentRecorded -> Finance updates invoice -> Communication queues email`

## Core invariants

- A staff account has exactly one role.
- Trainees never authenticate.
- Minors require an emergency contact.
- A cohort has at most seven enrolled seats, independent of schedule overlap.
- Transfers preserve the original enrollment and all related history.
- Financial records are never deleted; cancellation changes status and is audited.
- Facilitators have no financial access unless an explicit permission override allows it.
- Programs and fee changes require Manager approval.
