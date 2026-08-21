-- Phoxta — 0097: move a work-board card between columns.
--
-- The board's column is DERIVED. app_org_work_board computes `col` from each
-- record's real status (and in places its dates), across thirteen source types.
-- So a drag cannot just store a new column: the next refetch recomputes `col`
-- from the record and the card springs back. Moving a card has to change the
-- thing the card is about, or it is theatre.
--
-- Which means most moves are not expressible, and this function says so instead
-- of guessing:
--
--   * A ticket has no 'doing' state in the board's mapping. Dropping one there
--     would compute col = null and the card would vanish, not move.
--   * A reservation reaches 'ready' by its end_date passing, not by a status.
--     No status change can put a future stay there.
--   * A booking can only be 'ready' once it has started.
--   * Invoices and campaigns are excluded outright: "sent" mails a customer and
--     "paid" is money. Neither should be one mis-drag away.
--   * Agent actions are excluded: approvals are governed, audited, and have
--     their own queue. A drag must not become an approval.
--   * Products (low stock), domains, contacts, automation runs and outbound
--     have no kanban transition at all.
--
-- Everything refused comes back with a reason the UI can show, so a user learns
-- why a card would not move rather than watching it snap back.

create or replace function public.app_org_work_move(p_org uuid, p_card text, p_col text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_kind text;
  v_id   uuid;
  v_uid  uuid := auth.uid();
  v_hit  int;
begin
  if not public.app_is_org_member(p_org) then raise exception 'Not allowed'; end if;

  if p_col not in ('todo','doing','review','ready') then
    return jsonb_build_object('ok', false, 'reason', 'Unknown column.');
  end if;

  v_kind := split_part(p_card, ':', 1);
  begin
    v_id := split_part(p_card, ':', 2)::uuid;
  exception when others then
    return jsonb_build_object('ok', false, 'reason', 'Unrecognised card.');
  end;

  -- Every branch below is scoped by organization_id as well as id, so a card id
  -- from another tenant cannot be moved by passing someone else's uuid.
  if v_kind = 'conversation' then
    update conversations set
      status      = case p_col when 'review' then 'escalated'
                               when 'ready'  then 'closed'
                               else 'open' end,
      unread      = (p_col = 'todo'),
      assigned_to = case when p_col = 'doing' then coalesce(assigned_to, v_uid) else assigned_to end,
      updated_at  = now()
    where id = v_id and organization_id = p_org;
    get diagnostics v_hit = row_count;

  elsif v_kind = 'ticket' then
    if p_col = 'doing' then
      return jsonb_build_object('ok', false,
        'reason', 'Tickets move Open → Under Review → Ready. There is no In Progress state for a ticket.');
    end if;
    update tickets set
      status     = case p_col when 'review' then 'pending'
                              when 'ready'  then 'resolved'
                              else 'open' end,
      updated_at = now()
    where id = v_id and organization_id = p_org;
    get diagnostics v_hit = row_count;

  elsif v_kind = 'order' then
    if p_col not in ('todo','ready') then
      return jsonb_build_object('ok', false,
        'reason', 'An order is either outstanding or fulfilled — it has no middle column.');
    end if;
    update orders set
      fulfillment_status = case p_col when 'ready' then 'fulfilled' else 'unfulfilled' end,
      updated_at         = now()
    where id = v_id and organization_id = p_org;
    get diagnostics v_hit = row_count;

  elsif v_kind = 'reservation' then
    if p_col not in ('todo','doing') then
      return jsonb_build_object('ok', false,
        'reason', 'A reservation reaches Ready when its dates pass, not by being moved.');
    end if;
    update reservations set
      status     = case p_col when 'doing' then 'confirmed' else 'pending' end,
      updated_at = now()
    where id = v_id and organization_id = p_org;
    get diagnostics v_hit = row_count;

  elsif v_kind = 'booking' then
    if p_col = 'review' then
      return jsonb_build_object('ok', false, 'reason', 'Bookings have no Under Review state.');
    end if;
    if p_col = 'ready' and exists (
      select 1 from bookings b where b.id = v_id and b.organization_id = p_org and b.start_at >= now()
    ) then
      return jsonb_build_object('ok', false, 'reason', 'This booking has not started yet, so it cannot be Ready.');
    end if;
    update bookings set
      status     = case p_col when 'ready' then 'completed'
                              when 'doing' then 'confirmed'
                              else 'pending' end,
      updated_at = now()
    where id = v_id and organization_id = p_org;
    get diagnostics v_hit = row_count;

  else
    return jsonb_build_object('ok', false,
      'reason', 'This card tracks a record the board only reports on — move it from its own screen.');
  end if;

  if coalesce(v_hit, 0) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'That record no longer exists.');
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.app_org_work_move(uuid, text, text) from public, anon;
grant execute on function public.app_org_work_move(uuid, text, text) to authenticated, service_role;
