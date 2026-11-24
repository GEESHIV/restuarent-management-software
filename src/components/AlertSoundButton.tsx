import { Bell, Volume2 } from "lucide-react";
import { Button } from "@/components/ui";

export function AlertSoundButton({ enabled, onEnable }: { enabled: boolean; onEnable: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onEnable} disabled={enabled}>
      {enabled ? <Volume2 size={15} /> : <Bell size={15} />}
      {enabled ? "Sound on" : "Enable sound"}
    </Button>
  );
}
