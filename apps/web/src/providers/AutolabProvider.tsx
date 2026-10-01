"use client";
/**
 * Wires the Autolab hooks together and hands the result to every screen via
 * context. It lives in the (app) layout, so the device connection and the
 * library survive navigation between screens.
 *
 * In lab mode only the station opens the WebSocket. Remote screens read
 * status, photos and the action log from Supabase and send commands there.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { appMode, labEnabled } from "@/lib/cloud";
import { disposeDetector, watchDetector } from "@/lib/detection";
import { downloadPhoto } from "@/lib/download";
import { errorText } from "@/lib/errors";
import { photoFromBlob } from "@/lib/photo-from-blob";
import type { Photo } from "@/model/types";
import { useAnalysis } from "@/hooks/use-analysis";
import { useDeviceChannel } from "@/hooks/use-device-channel";
import { useDevices } from "@/hooks/use-devices";
import { useLabLibrary } from "@/hooks/use-lab-library";
import { useLabMode } from "@/hooks/use-lab-mode";
import { useLiveDetection } from "@/hooks/use-live-detection";
import { useNotices } from "@/hooks/use-notices";
import { useObjectUrls } from "@/hooks/use-object-urls";
import { usePhotoLibrary } from "@/hooks/use-photo-library";
import { useRole } from "@/hooks/use-role";
import { AutolabContext, type AutolabValue } from "./autolab-context";
import type { User } from "./AuthProvider";

type Library = ReturnType<typeof usePhotoLibrary> & { saved?: (id: string) => Promise<boolean> };
// Chosen once per build, so the hooks inside never change between renders.
const usePhotos: (...args: Parameters<typeof usePhotoLibrary>) => Library = labEnabled ? useLabLibrary : usePhotoLibrary;
/** Outside lab mode nothing waits on uploads. */
const alwaysSaved = async () => true;

export function AutolabProvider({ user, children }: { user: User; children: ReactNode }) {
  const notices = useNotices();
  const { notify, log } = notices;
  const urls = useObjectUrls();
  const devices = useDevices(user.id, notify);
  const { role, setStation } = useRole(user.id);
  const library = usePhotos(user.id, devices.gateway, devices.devices, urls, notify, log);
  const [detectorStatus, setDetectorStatus] = useState("Not loaded");
  const [connectOpen, setConnectOpen] = useState(false);
  const [liveDetect, setLiveDetectState] = useState(false);

  const channel = useDeviceChannel(role === "remote" ? null : (devices.device?.id ?? null), devices.gateway, urls, {
    onCapture: library.addPhoto,
    // `analysis` is declared below. These run later, on socket messages, so it exists by then.
    onSavedAnalysis: (imageId, result) => {
      library.setAnalysis(imageId, result);
      analysis.finish(imageId);
      log(`Analysis saved: ${result.detections.length} objects`, "success");
    },
    onRequestError: (requestId) => analysis.finish(requestId),
    notify,
    log,
  });

  const lab = useLabMode({
    userId: user.id,
    role,
    setStation,
    device: devices.device,
    addDevice: devices.addDevice,
    channel,
    setAnalysis: library.setAnalysis,
    saved: library.saved ?? alwaysSaved,
    notify,
  });

  const workerFor = useCallback(
    (photo: Photo) => channel.status.worker_online && photo.device_id === devices.device?.id,
    [channel.status.worker_online, devices.device?.id],
  );
  const analysis = useAnalysis({ setAnalysis: lab.setAnalysis, sendBinary: channel.sendBinary, workerFor, notify, log });

  const stopLiveDetect = useCallback(
    (message: string) => {
      notify(message, "error");
      setLiveDetectState(false);
    },
    [notify],
  );
  const analyzedFrame = useLiveDetection(liveDetect && channel.preview, channel.latestFrame, urls, stopLiveDetect);

  // Detection only makes sense while frames are flowing.
  useEffect(() => {
    if (!channel.preview) setLiveDetectState(false);
  }, [channel.preview]);

  useEffect(() => watchDetector(setDetectorStatus), []);
  useEffect(() => () => disposeDetector(), []);

  const { startPreview } = lab;
  const setLiveDetect = useCallback(
    (enabled: boolean) => {
      setLiveDetectState(enabled);
      if (enabled) startPreview();
    },
    [startPreview],
  );

  const { addPhoto } = library;
  const { makeUrl } = urls;
  const saveLocal = useCallback<AutolabValue["saveLocal"]>(
    async (blob, source, result) => {
      try {
        const photo = await photoFromBlob(blob, source, makeUrl(blob), result);
        addPhoto(photo, blob);
        log(source === "upload" ? "Image uploaded" : "Photo captured", "success");
        return photo;
      } catch (error) {
        notify(errorText(error), "error");
        return null;
      }
    },
    [makeUrl, addPhoto, log, notify],
  );

  const download = useCallback(
    (photo: Photo) => downloadPhoto(photo).catch((error) => notify(errorText(error), "error")),
    [notify],
  );

  const value = useMemo<AutolabValue>(
    () => ({
      user,
      mode: appMode,
      role,
      setStation,
      ...devices,
      addDevice: lab.addDevice,
      connection: lab.connection,
      status: lab.status,
      reconnect: () => {
        channel.reconnect();
        devices.reloadDevices();
      },
      preview: channel.preview,
      startPreview: lab.startPreview,
      stopPreview: lab.stopPreview,
      liveFrame: liveDetect && analyzedFrame ? analyzedFrame : channel.frame,
      latestFrame: channel.latestFrame,
      liveDetect,
      setLiveDetect,
      fps: channel.fps,
      ...library,
      capturing: channel.capturing || lab.sending,
      capture: lab.capture,
      actions: lab.actions,
      analyzing: analysis.analyzing,
      analyze: analysis.analyze,
      download,
      saveLocal,
      clearLocalData: library.clearLocal,
      detectorStatus,
      activity: notices.activity,
      toasts: notices.toasts,
      notify,
      dismissToast: notices.dismiss,
      connectOpen,
      openConnect: () => setConnectOpen(true),
      closeConnect: () => setConnectOpen(false),
    }),
    [user, role, setStation, devices, channel, lab, liveDetect, analyzedFrame, setLiveDetect, library, analysis, download, saveLocal, detectorStatus, notices, notify, connectOpen],
  );
  return <AutolabContext.Provider value={value}>{children}</AutolabContext.Provider>;
}
