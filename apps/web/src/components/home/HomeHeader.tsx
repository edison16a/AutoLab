"use client";
import Link from "next/link";
import { Camera, Loader2, Plug, Video } from "lucide-react";
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
 * do. Before any device is added the main action becomes connecting one.
 */
export function HomeHeader() {
  const { device, openConnect } = useAutolab();
  const summary = useDeviceSummary();

  const primary = device ? (
    <TakePhotoButton />
  ) : (
    <button type="button" className="btn btn--primary" onClick={openConnect}>
      <Plug size={16} strokeWidth={1.8} aria-hidden="true" />
      Connect device
    </button>
  );

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
          {primary}
        </>
      }
    />
  );
}
