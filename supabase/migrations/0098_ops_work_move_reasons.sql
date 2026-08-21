-- Phoxta — 0098: say WHY a work card would not move.
--
-- 0097 sent eight different record types down one catch-all branch: "This card
-- tracks a record the board only reports on — move it from its own screen."
-- True, and useless. It does not say which record, why it cannot move, or where
-- the real control is — so the only thing a user learns is that the board
-- refused them.
--
-- The refusals are not one rule, they are several, and they deserve their own
-- sentences. Some are policy (money and governed approvals stay off the board),
-- some are physics (a stay is Ready when its dates pass), and some are category
-- errors (a low-stock warning is not a task with stages).
--
-- The client now also refuses to start these drags at all (see WORK_MOVES), so
-- these strings are the backstop rather than the everyday path — but a backstop
-- that explains itself is what makes the rule learnable instead of arbitrary.

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

  -- Every branch is scoped by organization_id as well as id, so a card id from
  -- another tenant cannot be moved by passing someone else's uuid.
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
        'reason', 'Tickets go Open → Under Review → Ready. There is no In Progress stage for a ticket.');
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
        'reason', 'An order is either outstanding or fulfilled — there is no middle stage.');
    end if;
    update orders set
      fulfillment_status = case p_col when 'ready' then 'fulfilled' else 'unfulfilled' end,
      updated_at         = now()
    where id = v_id and organization_id = p_org;
    get diagnostics v_hit = row_count;

  elsif v_kind = 'reservation' then
    if p_col not in ('todo','doing') then
      return jsonb_build_object('ok', false,
        'reason', 'A reservation becomes Ready when its dates pass, not by being moved there.');
    end if;
    update reservations set
      status     = case p_col when 'doing' then 'confirmed' else 'pending' end,
      updated_at = now()
    where id = v_id and organization_id = p_org;
    get diagnostics v_hit = row_count;

  elsif v_kind = 'booking' then
    if p_col = 'review' then
      return jsonb_build_object('ok', false, 'reason', 'Bookings have no Under Review stage.');
    end if;
    if p_col = 'ready' and exists (
      select 1 from bookings b where b.id = v_id and b.organization_id = p_org and b.start_at >= now()
    ) then
      return jsonb_build_object('ok', false,
        'reason', 'This booking has not started yet, so it cannot be Ready.');
    end if;
    update bookings set
      status     = case p_col when 'ready' then 'completed'
                              when 'doing' then 'confirmed'
                              else 'pending' end,
      updated_at = now()
    where id = v_id and organization_id = p_org;
    get diagnostics v_hit = row_count;

  -- ── Deliberately not movable, each for its own reason ──────────────────
  elsif v_kind = 'invoice' then
    return jsonb_build_object('ok', false,
      'reason', 'Invoices are not moved from the board: the next stage emails the customer, and marking one paid is a money change. Use Invoicing.');

  elsif v_kind = 'campaign' then
    return jsonb_build_object('ok', false,
      'reason', 'Campaigns are not moved from the board: the next stage sends to your audience. Use Marketing.');

  elsif v_kind = 'agent_action' then
    return jsonb_build_object('ok', false,
      'reason', 'Agent actions are approved or rejected in the approvals queue, where the decision is recorded. A drag must not become an approval.');

  elsif v_kind = 'product' then
    return jsonb_build_object('ok', false,
      'reason', 'This is a low-stock warning rather than a task. It clears when the product is restocked.');

  elsif v_kind = 'domain' then
    return jsonb_build_object('ok', false,
      'reason', 'A domain advances as DNS verifies, which is not something the board can hurry. Check it in Settings → Domains.');

  elsif v_kind = 'contact' then
    return jsonb_build_object('ok', false,
      'reason', 'This card is a prompt to follow someone up, not a task with stages. Open the contact to act on it.');

  elsif v_kind in ('automation_run','outbound') then
    return jsonb_build_object('ok', false,
      'reason', 'This is a record of something that already ran. There is no stage left to move it to.');

  else
    return jsonb_build_object('ok', false,
      'reason', 'This card tracks a record the board only reports on. Open it to act on it.');
  end if;

  if coalesce(v_hit, 0) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'That record no longer exists.');
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.app_org_work_move(uuid, text, text) from public, anon;
grant execute on function public.app_org_work_move(uuid, text, text) to authenticated, service_role;
