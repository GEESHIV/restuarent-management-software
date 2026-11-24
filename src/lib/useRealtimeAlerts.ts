import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { enableAlertSound, playAlertSound } from "@/lib/alertSound";

export function useRealtimeAlerts(events: { id: string; message: string }[], loading: boolean) {
  const { notify } = useToast();
  const seenIds = useRef<Set<string> | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    if (loading) {
      seenIds.current = null;
      return;
    }

    const currentIds = new Set(events.map((event) => event.id));
    if (seenIds.current === null) {
      seenIds.current = currentIds;
      return;
    }

    const newEvents = events.filter((event) => !seenIds.current?.has(event.id));
    seenIds.current = currentIds;
    if (newEvents.length === 0) return;
    if (soundEnabled) playAlertSound();
    newEvents.forEach((event) => notify(event.message, "success"));
  }, [events, loading, notify, soundEnabled]);

  async function turnSoundOn() {
    try {
      await enableAlertSound();
      setSoundEnabled(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to enable sound", "error");
    }
  }

  return { soundEnabled, turnSoundOn };
}
