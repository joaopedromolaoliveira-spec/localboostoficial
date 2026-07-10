// Available-slot computation for a given owner.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Slot = { start: string; end: string };

export async function getAvailableSlots(ownerId: string, daysAhead = 7): Promise<Slot[]> {
  const [{ data: sched }, { data: hours }, { data: appts }] = await Promise.all([
    supabaseAdmin.from("schedule_settings").select("*").eq("owner_id", ownerId).maybeSingle(),
    supabaseAdmin.from("working_hours").select("*").eq("owner_id", ownerId),
    supabaseAdmin
      .from("appointments")
      .select("start_time,end_time,status")
      .eq("owner_id", ownerId)
      .gte("start_time", new Date().toISOString())
      .in("status", ["PENDING_CONFIRMATION", "CONFIRMED", "RESCHEDULE_REQUESTED"]),
  ]);
  if (!sched || !hours?.length) return [];

  const duration = sched.appointment_duration_minutes;
  const buffer = sched.buffer_minutes;
  const step = duration + buffer;
  const byDow = new Map<number, { start: string; end: string; enabled: boolean }>();
  for (const h of hours) byDow.set(h.day_of_week, { start: h.start_time, end: h.end_time, enabled: h.is_enabled });

  const busy = (appts ?? []).map((a) => ({
    start: new Date(a.start_time).getTime(),
    end: new Date(a.end_time).getTime(),
  }));

  const slots: Slot[] = [];
  const now = Date.now();
  const startDay = new Date(); startDay.setMinutes(0, 0, 0);
  for (let d = 0; d < daysAhead; d++) {
    const day = new Date(startDay); day.setDate(day.getDate() + d);
    const dow = day.getDay();
    const hh = byDow.get(dow);
    if (!hh?.enabled) continue;
    const [sH, sM] = hh.start.split(":").map(Number);
    const [eH, eM] = hh.end.split(":").map(Number);
    const dayStart = new Date(day); dayStart.setHours(sH, sM, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(eH, eM, 0, 0);
    for (let t = dayStart.getTime(); t + duration * 60_000 <= dayEnd.getTime(); t += step * 60_000) {
      if (t < now + 30 * 60_000) continue; // 30-min lead time
      const sEnd = t + duration * 60_000;
      const clash = busy.some((b) => t < b.end && sEnd > b.start);
      if (clash) continue;
      slots.push({ start: new Date(t).toISOString(), end: new Date(sEnd).toISOString() });
      if (slots.length >= 24) return slots;
    }
  }
  return slots;
}
