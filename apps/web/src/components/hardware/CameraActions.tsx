"use client";
import { useRouter } from "next/navigation";
import { Camera, Video } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";

/** Shortcuts on the camera's panel: open the live view, or take a still right here. */
export function CameraActions() {
  const router = useRouter();
  const { status, capture, capturing, notify } = useAutolab();

  const takePhoto = async () => {
    const photo = await capture();
    if (photo) notify("Photo saved", "success");
  };

  return (
    <div className="hardware-details__pair">
      <button type="button" className="btn" onClick={() => router.push("/live")}>
        <Video size={16} strokeWidth={1.8} aria-hidden="true" />
        Live view
      </button>
      <button type="button" className="btn" onClick={takePhoto} disabled={!status.camera_online || capturing}>
        <Camera size={16} strokeWidth={1.8} aria-hidden="true" />
        {capturing ? "Taking photo" : "Take photo"}
      </button>
    </div>
  );
}
