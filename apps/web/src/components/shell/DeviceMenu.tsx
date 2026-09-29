"use client";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useDeviceSummary } from "@/hooks/use-device-summary";
import { useAutolab } from "@/providers/autolab-context";
import { Menu } from "../ui/Menu";
import { StatusDot } from "../ui/StatusDot";

/** Shows the selected Autolab and its state. Opens to switch or add devices. */
export function DeviceMenu() {
  const { devices, device, selectDevice, openConnect } = useAutolab();
  const { dot, label } = useDeviceSummary();

  if (!device)
    return (
      <button type="button" className="btn btn--primary btn--sm" onClick={openConnect}>
        <Plus size={16} aria-hidden="true" />
        Connect device
      </button>
    );

  return (
    <Menu
      label="Devices"
      trigger={({ open, toggle }) => (
        <button type="button" className="device-trigger" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
          <StatusDot state={dot} />
          <span className="device-trigger__name">{device.name}</span>
          <span className="device-trigger__state">{label}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      )}
    >
      {(close) => (
        <>
          {devices.map((d) => (
            <button
              key={d.id}
              type="button"
              role="menuitemradio"
              aria-checked={d.id === device.id}
              className="menu__item"
              onClick={() => {
                selectDevice(d.id);
                close();
              }}
            >
              <span className="grow">{d.name}</span>
              {d.id === device.id ? <Check size={14} aria-hidden="true" /> : null}
            </button>
          ))}
          <hr className="menu__divider" />
          <button
            type="button"
            role="menuitem"
            className="menu__item"
            onClick={() => {
              close();
              openConnect();
            }}
          >
            <Plus size={14} aria-hidden="true" />
            Connect device
          </button>
        </>
      )}
    </Menu>
  );
}
