# Phase 4: Payments (module plan)

Status: **In progress** (decisions confirmed 2026-11-28). Part of `plans/implementation-plan.md`.
Goal: captains pay the entry fee online through Razorpay; organizers record offline payments. Each paid payment has a PDF receipt for the captain, the organizer and admins.

## Flow
```
Team AWAITING_PAYMENT
 ├─ Captain "Pay ₹1,536" ─► server creates Razorpay order ─► Razorpay Checkout (UPI/card/netbanking)
 │        └─► success: browser sends ids + signature ─► server verifies HMAC ─► payment PAID ─► team CONFIRMED
 │        └─► webhook (payment.captured / order.paid) does the same if the browser never returns
 │        └─► failure/cancel: team stays AWAITING_PAYMENT, captain can retry
 └─ Organizer "Record offline payment" (amount, mode, reference) ─► payment PAID (offline) ─► team CONFIRMED
```

## Decisions (confirmed 2026-11-28)
| Topic | Decision |
|---|---|
| Gateway | Razorpay **Orders API + Standard Checkout**, owner's own account. Test keys in development |
| Amount | Captain pays **entry fee + convenience fee**. Convenience fee = **one platform rate**, `CONVENIENCE_FEE_PERCENT` (default **2.36%** = 2% Razorpay + 18% GST), rounded **up to the whole rupee**. E.g. ₹1,500 → ₹36 → **₹1,536**. Shown separately in the app and on the receipt |
| Pay window | Online payment allowed while the team is **Awaiting payment** and the tournament has **not started** (not Ongoing/Completed/Cancelled) |
| Failure | Failed or cancelled payment: team **stays Awaiting payment**, the captain can retry. The same open order is reused while the amount is unchanged |
| Confirmation | Server-side only: checkout signature (HMAC-SHA256 of `order_id|payment_id` with the key secret) **or** a signed webhook. Both paths are idempotent |
| Offline payment | The organizer/admin "confirm" now records **amount, mode (Cash / UPI / Bank transfer / Other) and an optional reference**. Saved as an offline payment with its own receipt |
| Receipt | **Server-generated PDF** (pdfkit). Number `MDN-<year>-<000001>`. **View and download** for the team's captain, the tournament's organizer and admins. **No emails** |
| Payment status | Shown on the team page (captain, organizer, admin) and per team in the organizer's Teams tab |
| Late payment | If money arrives after the team was confirmed offline, withdrawn or removed, the payment is kept as **Refund due** and the team is not changed |
| Refunds | **Outside the app** for now (Razorpay dashboard / bank) |

## Data model
`payments`: `id`, `uuid`, `team_id`, `tournament_id`, `method` (1 online, 2 offline), `status` (1 created, 2 paid, 3 refund due), `offline_mode` (1 cash, 2 UPI, 3 bank transfer, 4 other), `reference`, `entry_fee`, `convenience_fee`, `amount` (DECIMAL 10,2, INR), `gateway_order_id` (unique), `gateway_payment_id` (unique), `failure_reason`, `receipt_number` (unique, set when paid), `paid_by_user_id` (captain), `recorded_by_user_id` (offline), `paid_at`, timestamps. Indexes: `team_id`, `tournament_id + status`.

## API (`/api/v1`)
| Method | Path | Who / what |
|---|---|---|
| POST | `/teams/:teamId/payment-orders` | Captain: create (or reuse) the Razorpay order. Returns key id, order id, amount in paise, breakdown, prefill |
| POST | `/payments/:paymentId/verification` | Captain: checkout result (`razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`) → confirms the team |
| POST | `/payments/failure` | Captain: record a checkout failure reason (informational) |
| POST | `/payments/webhook` | Razorpay → raw body + `X-Razorpay-Signature` (webhook secret) |
| POST | `/teams/:teamId/confirmation` | Organizer/admin: record an offline payment `{ amount, mode, reference? }` → confirms the team (replaces the empty-body confirm) |
| GET | `/teams/:teamId/payments` | Captain/organizer/admin: payments of the team (paid + refund due) |
| GET | `/payments/:paymentId/receipt` | Captain/organizer/admin: PDF (`?download=1` for attachment) |

## Configuration
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CONVENIENCE_FEE_PERCENT` (2.36). Online payment is disabled (clear message) when keys are missing. `RAZORPAY_API_URL` is only for local mocks in development/test. Razorpay dashboard: enable **auto-capture**, add a webhook to `<api>/api/v1/payments/webhook` with events `payment.captured`, `order.paid`, `payment.failed`.

## Open points (later phases)
- Refunds and cancellations inside the app.
- Admin-wide payments report / settlement export.
- Payments for other items (e.g. featured listings) reuse the same table with a `purpose`.
