// WhatsAble API client — server only.
// Docs: https://whatsable.app (Send messages via API).
const BASE = process.env.WHATSABLE_BASE_URL ?? "https://api.whatsable.app";

export async function sendWhatsAbleMessage(to: string, message: string) {
  const key = process.env.WHATSABLE_API_KEY;
  if (!key) throw new Error("WHATSABLE_API_KEY not configured");
  const phone = to.replace(/\D/g, "");
  const res = await fetch(`${BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ to: phone, type: "text", text: { body: message } }),
  });
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`WhatsAble ${res.status}: ${text.slice(0, 300)}`);
  }
  return json as Record<string, unknown>;
}
