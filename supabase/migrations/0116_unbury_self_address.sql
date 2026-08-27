-- Phoxta — 0116: give back the mail 0114 buried.
--
-- 0114 shipped an automated-mail classifier with a "sent from this business's
-- own address" rule, and fed it a list that included every MEMBER'S LOGIN
-- ADDRESS as well as the business's own mailbox. A member's login address is a
-- person, not an identity the agent has ever sent from, so it could never be
-- the agent hearing its own echo — but any mail from one matched, and the
-- verdict was DEFINITIVE.
--
-- Definitive means settled forever: agent-catchup drops those rows from its
-- candidate set permanently, so the message was never answered and never
-- reconsidered. In practice it caught exactly the people most likely to write
-- in — an owner testing by mailing their own business, and any customer who
-- happens to hold an account on this platform — and left them in the Inbox
-- under a line that reads as nonsense next to a real customer's message:
-- "Not answered automatically — sent from this business's own address."
--
-- The rule is fixed in _shared/autoReply.ts (selfAddresses no longer includes
-- member logins). This repairs the rows that the broken version already settled.
--
-- WHAT IT TOUCHES, precisely: customer messages whose auto_reply verdict carries
-- that exact reason. Removing the whole auto_reply object returns the row to the
-- state it would have been in had the classifier never run, which is what makes
-- it a live agent-catchup candidate again — the worker's own gates then decide
-- it properly, including the watermark, the human-already-replied check and the
-- per-thread ceiling. Nothing is sent by this migration.
--
-- WHAT IT DOES NOT TOUCH: a successful send writes {answered: true} with no
-- `reason`, so the filter cannot match one and no delivered reply is re-queued.
-- Every other refusal reason keeps its verdict.

update conversation_messages
   set meta = meta - 'auto_reply'
 where role = 'customer'
   and meta -> 'auto_reply' ->> 'reason' = 'sent from this business''s own address';

-- A note for whoever reads this later: if the count above was large, the cause
-- was almost certainly one shared address on the org record rather than many
-- staff writing in. Check organizations.billing_email — it is still treated as
-- the business's own identity, correctly, but if it is set to the same address
-- customers write TO, every customer reply will match it.
