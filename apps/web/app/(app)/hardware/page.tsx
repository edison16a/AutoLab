"use client";
import { useRouter } from "next/navigation";
import DigitalTwin from "@/components/autolab-3d/DigitalTwin";
import { useAutolab } from "@/components/providers/autolab-provider";
import ImageView from "@/components/ui/image-view";

export default function HardwarePage() {
  const a = useAutolab(),
    router = useRouter();
  const lastCapture = a.photos.find((p) => p.device_id === a.device?.id)?.captured_at;
  return (
    <DigitalTwin
      deviceId={a.device?.id}
      status={a.status}
      connection={a.connection}
      preview={a.preview}
      lastCapture={lastCapture}
      capturing={a.capturing}
      onCapture={() => void a.capture()}
      onLive={() => router.push("/live")}
      onSettings={() => router.push("/settings")}
      full
      livePanel={a.liveFrame ? <ImageView {...a.liveFrame} /> : null}
    />
  );
}
