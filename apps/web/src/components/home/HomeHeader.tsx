"use client";
import Link from "next/link";
import { Camera, Loader2, Video } from "lucide-react";
import { useDeviceSummary } from "@/hooks/use-device-summary";
import { useAutolab } from "@/providers/autolab-context";
import { PageHeader } from "../ui/PageHeader";
import { StatusDot } from "../ui/StatusDot";

/** Take a still from Home. Errors are already raised as toasts by the provider. */
function TakePhotoButton() {
  const { status, capture, capturing, notify } = useAutolab();

  const takePhoto = async () => {
    const photo = await capture();
    if (photo) notify("Photo saved", "success");
  };

  return (
    <button
      type="button"
      className="btn btn--primary"
      onClick={takePhoto}
      disabled={!status.camera_online || capturing}
      aria-busy={capturing || undefined}
    >
      {capturing ? (
        <Loader2 size={16} strokeWidth={1.8} className="spin" aria-hidden="true" />
      ) : (
        <Camera size={16} strokeWidth={1.8} aria-hidden="true" />
      )}
      {capturing ? "Taking photo" : "Take photo"}
    </button>
  );
}

/**
 * The device's name and state, plus the two things people come to Home to
 * do. Before any device is added there's nothing to photograph, and the
 * connect card below (and the top bar) already offer to connect one, so a
 * third "Connect device" here would only add noise.
 */
export function HomeHeader() {
  const { device } = useAutolab();
  const summary = useDeviceSummary();

  return (
    <PageHeader
      title={device?.name ?? "Autolab"}
      subtitle={
        <span className="home-state">
          <StatusDot state={summary.dot} />
          {summary.label}
        </span>
      }
      actions={
        <>
          <Link href="/live" className="btn">
            <Video size={16} strokeWidth={1.8} aria-hidden="true" />
            Live view
          </Link>
          {device ? <TakePhotoButton /> : null}
        </>
      }
    />
  );
}
