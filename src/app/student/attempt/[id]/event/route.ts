// Anti-cheat events from the test screen, sent with navigator.sendBeacon so `pagehide` still arrives. Body: the event type.
import { getSession } from "@/lib/auth";
import { attemptState, CLIENT_EVENTS, recordEvent } from "@/lib/attempt";
import type { AttemptEventType } from "@/db/schema";

export async function POST(req: Request, { params }: RouteContext<"/student/attempt/[id]/event">) {
  const me = await getSession();
  if (me?.kind !== "student") return new Response(null, { status: 401 });
  const type = (await req.text()).trim();
  const id = Number((await params).id);
  if (!CLIENT_EVENTS.has(type) || !Number.isInteger(id)) return new Response(null, { status: 400 });

  const state = await attemptState(id, me.id);
  if (state && state.status !== "finished") await recordEvent(id, type as AttemptEventType);
  return new Response(null, { status: 204 });
}
