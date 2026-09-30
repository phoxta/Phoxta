# Phoxta 2.0 data retention and deletion policy

This policy implements Product Specification §§15 and 18. It is an operating rule for the product and must be reviewed whenever a connected provider or governing retention duty changes.

## Product data

| Data | Active retention | After deletion request |
|---|---:|---|
| Private opportunity workspaces, evidence, interview notes, artifacts and private files | Until the owner deletes the workspace or account | Delete from the primary database and private storage within 30 days; purge recoverable backups on their normal cycle, no later than 35 additional days |
| Research source metadata and short excerpts | While referenced by an active workspace | Delete with the workspace. A published editorial source reference remains only if it is independently part of a public opportunity |
| Generated research proposals and job payloads | 12 months after job completion, while the workspace exists | Delete with the workspace |
| Product analytics | 13 months | Remove direct user identifiers when the account is deleted; never store research text, interview notes or source excerpts in analytics |
| Notifications and expired invitations | 90 days | Delete with the account; expired invitations may be removed earlier |
| Audit events for security and publishing | 24 months | Replace the user identifier with a deletion receipt identifier where the event must remain for security review |
| Billing event IDs, invoices and transaction records | According to the payment provider and applicable accounting duties, up to 7 years | Remove product content and retain only the minimum billing record required; show the request as `retention_review` until this split is complete |
| Deletion request receipts | 6 years | Keep request ID, dates, scope and outcome; do not retain the deleted content |

## Connected and public data

- Provider credentials stay in the provider vault or server environment and are revoked when the integration is removed.
- Public editorial images are removed when the associated publication is retired and no other published page uses them.
- Phoxta stores a source URL, publisher, dates, geography, content hash and a short review excerpt. It does not retain a fetched article as a substitute for the publisher's copy.
- A user may redact an interview observation without deleting the whole workspace. References to that observation must then show it as removed rather than silently changing a finalised decision snapshot.

## Processing rules

Deletion is an explicit, authenticated request. Workspace deletion requires the owner and an administrator confirmation. Account deletion is processed by a server-side administrator workflow, revokes sessions and provider credentials, removes private storage first, then deletes product records. A receipt records each stage. Failures stay visible for retry and alert an administrator; partial deletion is never reported as complete.

Backups are encrypted and access logged. A deleted record is not restored into the live service from a backup. Disaster recovery must replay the deletion ledger before restored data becomes accessible.
