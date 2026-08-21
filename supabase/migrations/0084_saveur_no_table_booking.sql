-- Phoxta — 0084: stop the restaurant agent offering a table.
--
-- The Saveur storefront became a digital-first kitchen — delivery and collection
-- only. /reservations now redirects to the special-orders form, and there is no
-- dine-in service to seat anyone in.
--
-- The agent did not get the memo. buildAgentTools picks its booking tools from
-- resolveBookingMode(vertical), and "restaurant" matches TABLE_VERTICAL, so the
-- agent was handed book_table and closed replies with "would you like a table
-- reservation?" — offering something the business cannot honour.
--
-- capabilities.bookings=false already removes the whole booking tool group, so
-- this is configuration rather than a code change: the same vertical still gets
-- table tools for a restaurant that genuinely seats guests.

update agent_config ac
set capabilities = coalesce(ac.capabilities, '{}'::jsonb) || '{"bookings": false}'::jsonb
from organizations o
where o.id = ac.organization_id
  and o.slug = 'saveur-demo';

-- Note: there is no blueprints.config column to seed a default into, so a NEW
-- restaurant org will still start with bookings enabled from its vertical. That
-- is a product decision (some restaurants do seat guests) and belongs in the
-- blueprint provisioning path, not here.
