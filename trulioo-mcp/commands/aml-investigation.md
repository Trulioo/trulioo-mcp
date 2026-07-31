---
description: Run the Trulioo AML watchlist/sanctions screening and investigation workflow.
argument-hint: "[person|business]"
---

Execute the AML investigation workflow using the `trulioo` MCP server. Entity
type is an optional argument (default `person`): `$ARGUMENTS`.

Follow these steps in order:

1. Gather the required identifying information for the entity.
2. Call `aml_screen(entity_type, ...)` with the identifying information.
3. Inspect the response: check `watchlist_state` (Clear | Potential Hit | Hit).
4. If not Clear, examine `watchlist_data` for hit counts.
5. Apply a risk decision:
   - Clear = proceed.
   - Potential Hit = flag for manual review.
   - Hit = escalate; do not proceed without human review.
6. Document the decision and rationale.

Never make a final adverse decision on AML data alone. This is a sandbox/mock
demo unless pointed at the live endpoint.
