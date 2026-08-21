-- Phoxta — 0085: tell the Saveur agent what the business actually is.
--
-- 0084 removed the booking tools, which stopped "would you like a table
-- reservation?". The agent then still closed with "…or a reservation?" — it was
-- not calling a tool, it was inferring from the "restaurant" vertical that
-- reserving is a thing customers do here.
--
-- Removing a tool stops the agent ACTING; it does not stop it OFFERING. The
-- statement of what the business does belongs in the owner-authored operating
-- procedures, which agentCore injects as overriding everything else.

update agent_config ac
set procedures = trim(both E'\n' from coalesce(nullif(ac.procedures, ''), '') || E'\n' ||
$proc$
Saveur is a delivery and collection kitchen. There is no dining room and no
table service.

- Never offer, imply or accept a table reservation, a booking, a sitting or a
  dine-in visit. If someone asks to book a table, say warmly that we are a
  delivery and collection kitchen, and offer delivery, collection, or the
  special-orders form for catering and large events.
- Order paths: delivery and collection from the menu; catering, bulk orders,
  custom bakes and events go through the special-orders request form.
- To check an existing order you need BOTH its reference and the email on it.
- Recommend real dishes from the menu. Never invent a dish, a price or an
  ingredient — call the tools and use what they return.
$proc$)
from organizations o
where o.id = ac.organization_id
  and o.slug = 'saveur-demo'
  -- Idempotent: a re-run must not append the block twice.
  and coalesce(ac.procedures, '') not like '%delivery and collection kitchen%';
