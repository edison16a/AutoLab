"use client";
/**
 * Wires the Autolab hooks together and hands the result to every screen via
 * context. It lives in the (app) layout, so the device connection and the
 * library survive navigation between screens.
 *
 * In lab mode there is no gateway: the Pi talks to Supabase itself, and every
 * screen reads status, photos and the action log from there and sends its
 * commands there too.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { appMode, labEnabled } from "@/lib/cloud";
import { addAction } from "@/lib/lab/actions";
import { disposeDetector, watchDetector } from "@/lib/detection";
import { downloadPhoto } from "@/lib/download";
import { errorText } from "@/lib/errors";
import { photoFromBlob } from "@/lib/photo-from-blob";
import type { Analysis, Device, Photo } from "@/model/types";
import { useActionLog } from "@/hooks/use-action-log";
import { useAnalysis } from "@/hooks/use-analysis";
import { useDeviceChannel, type ChannelHandlers } from "@/hooks/use-device-channel";
import { useDevices } from "@/hooks/use-devices";
import { useLabChannel } from "@/hooks/use-lab-channel";
import { useLabLibrary } from "@/hooks/use-lab-library";
import { useLiveDetection } from "@/hooks/use-live-detection";
import { useNotices } from "@/hooks/use-notices";
import { useObjectUrls, type ObjectUrls } from "@/hooks/use-object-urls";
import { usePhotoLibrary } from "@/hooks/use-photo-library";
import { AutolabContext, type AutolabValue } from "./autolab-context";
import type { User } from "./AuthProvider";

type Library = ReturnType<typeof usePhotoLibrary> & { saved?: (id: string) => Promise<boolean> };
// Chosen once per build, so the hooks inside never change between renders.
const usePhotos: (...args: Parameters<typeof usePhotoLibrary>) => Library = labEnabled ? useLabLibrary : usePhotoLibrary;
/** Outside lab mode nothing waits on uploads. */
const alwaysSaved = async () => true;
function useGatewayChannel(device: Device | null, gateway: string, urls: ObjectUrls, handlers: ChannelHandlers) {
  return useDeviceChannel(device?.id ?? null, gateway, urls, handlers);
}
// The same for the channel: the gateway's WebSocket, or Supabase in lab mode.
const useChannel = labEnabled ? useLabChannel : useGatewayChannel;

export function AutolabProvider({ user, children }: { user: User; children: ReactNode }) {
  const notices = useNotices();
  const { notify, log } = notices;
  const urls = useObjectUrls();
  const devices = useDevices(user.id, notify);
  const library = usePhotos(user.id, devices.gateway, devices.devices, urls, notify, log);
  const [detectorStatus, setDetectorStatus] = useState("Not loaded");
  const [connectOpen, setConnectOpen] = useState(false);
  const [liveDetect, setLiveDetectState] = useState(false);

  const actionLog = useActionLog(user.id);

  const channel = useChannel(devices.device, devices.gateway, urls, {
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

  // Lab mode logs each analysis once its photo is stored, since the entry points at the photo's row.
  const { setAnalysis: storeAnalysis, saved = alwaysSaved } = library;
  const setAnalysis = useCallback(
    (id: string, result: Analysis) => {
      storeAnalysis(id, result);
      if (!labEnabled) return;
      void saved(id)
        .then((stored) => addAction({ device_id: null, kind: "analyze_image", status: "done", image_id: stored ? id : null }))
        .catch(() => undefined);
    },
    [storeAnalysis, saved],
  );

  const workerFor = useCallback(
    (photo: Photo) => channel.status.worker_online && photo.device_id === devices.device?.id,
    [channel.status.worker_online, devices.device?.id],
  );
  const analysis = useAnalysis({ setAnalysis, sendBinary: channel.sendBinary, workerFor, notify, log });

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

  const { startPreview } = channel;
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
      ...devices,
      connection: channel.connection,
      status: channel.status,
      reconnect: () => {
        channel.reconnect();
        devices.reloadDevices();
      },
      preview: channel.preview,
      startPreview: channel.startPreview,
      stopPreview: channel.stopPreview,
      liveFrame: liveDetect && analyzedFrame ? analyzedFrame : channel.frame,
      latestFrame: channel.latestFrame,
      liveDetect,
      setLiveDetect,
      fps: channel.fps,
      ...library,
      capturing: channel.capturing,
      capture: channel.capture,
      actions: actionLog.entries,
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
    [user, devices, channel, actionLog.entries, liveDetect, analyzedFrame, setLiveDetect, library, analysis, download, saveLocal, detectorStatus, notices, notify, connectOpen],
  );
  return <AutolabContext.Provider value={value}>{children}</AutolabContext.Provider>;
}
