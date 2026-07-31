---
description: Run the Trulioo ongoing business monitoring enrollment and alert workflow.
argument-hint: "[business_name]"
---

Execute the monitoring enrollment workflow using the `trulioo` MCP server.
Business name is an optional argument: `$ARGUMENTS`.

Enrollment (one-time setup):

1. Ensure you have a `TransactionRecordID` from a prior `kyb_verify` for the
   business.
2. Decide the monitoring `frequency`: Daily (high-risk / active sanctions
   exposure), Weekly (elevated risk under active due diligence), Monthly
   (standard ongoing compliance - recommended default), Quarterly/Yearly (low
   risk, low activity).
3. Decide which fields to watch via `filter_on`: `ownership`, `directors`,
   `watchlist` (default: all three).
4. Call `monitoring_enroll(transaction_record_id, frequency, filter_on=[...])`
   and save the `enrollment_id`.

Ongoing alert checking:

5. Call `monitoring_get_alert(enrollment_id)`; check `status` (`no_change`,
   `alert`, `error`).
6. If `status='alert'`, inspect `changed_fields`. Ownership change = re-verify
   UBOs; watchlist change = escalate.
7. Call `monitoring_refresh(enrollment_id)` to force an immediate check after a
   material event.

Cancellation:

8. Call `monitoring_cancel(enrollment_id)` when no longer required (irreversible).

Use `monitoring_get_enrollment(enrollment_id)` any time to audit the config.
This is a sandbox/mock demo unless pointed at the live endpoint.
