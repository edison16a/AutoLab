"use client";
/**
 * The contract between the Autolab provider and every screen. Screens read
 * state and call actions from here and never talk to the socket, storage or
 * gateway directly.
 */
import { createContext, useContext, type RefObject } from "react";
import type { Analysis, Connection, Device, DeviceStatus, Frame, Notice, NoticeKind, Photo, PhotoSource } from "@/model/types";
import type { AppMode } from "@/lib/cloud";
import type { User } from "./AuthProvider";

export interface AutolabValue {
  user: User;
  mode: AppMode;

  gateway: string;
  setGateway: (url: string) => void;
  devices: Device[];
  /** The selected device, or null before one is connected. */
  device: Device | null;
  selectDevice: (id: string) => void;
  addDevice: (id: string, name: string) => Promise<void>;
  renameDevice: (id: string, name: string) => Promise<void>;
  /** Demo only. Other modes keep devices linked to the account. */
  forgetDevice: (id: string) => void;
  connection: Connection;
  status: DeviceStatus;
  reconnect: () => void;

  preview: boolean;
  startPreview: () => void;
  stopPreview: () => void;
  /** What the live stage should show: the analyzed frame while detection is on. */
  liveFrame: Frame | null;
  /** The newest raw frame, for code that needs it outside React renders. */
  latestFrame: RefObject<Frame | null>;
  liveDetect: boolean;
  setLiveDetect: (enabled: boolean) => void;
  fps: number;

  /** Every photo across devices, newest first. */
  photos: Photo[];
  photosReady: boolean;
  capturing: boolean;
  /** Resolves with the new photo once the Pi returns the full resolution still. */
  capture: () => Promise<Photo | null>;
  analyzing: string[];
  analyze: (photo: Photo) => Promise<void>;
  removePhotos: (ids: string[]) => Promise<void>;
  download: (photo: Photo) => Promise<void>;
  /** Adds a webcam shot or upload to the library. */
  saveLocal: (blob: Blob, source: Extract<PhotoSource, "computer" | "upload">, analysis?: Analysis) => Promise<Photo | null>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refreshPhotos: () => Promise<void>;
  clearLocalData: () => Promise<void>;
  detectorStatus: string;

  activity: Notice[];
  toasts: Notice[];
  notify: (text: string, kind?: NoticeKind) => void;
  dismissToast: (id: string) => void;
  connectOpen: boolean;
  openConnect: () => void;
  closeConnect: () => void;
}

export const AutolabContext = createContext<AutolabValue | null>(null);

export function useAutolab() {
  const value = useContext(AutolabContext);
  if (!value) throw new Error("useAutolab must be used inside AutolabProvider");
  return value;
}
