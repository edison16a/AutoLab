import type { Device } from "@/model/types";
import { ALL_DEVICES, type StatsFilter, type StatsRange } from "@/lib/stats/types";
import { Tabs } from "../ui/Tabs";

const RANGES: { id: StatsRange; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
];

interface StatsFiltersProps {
  filter: StatsFilter;
  devices: Device[];
  onRange: (range: StatsRange) => void;
  onDevice: (deviceId: string) => void;
}

/** One row above everything it scopes: the time range, then the device. */
export function StatsFilters({ filter, devices, onRange, onDevice }: StatsFiltersProps) {
  return (
    <div className="stats__filters">
      <Tabs items={RANGES} value={filter.range} onChange={onRange} label="Time range" className="stats__range" />
      {devices.length ? (
        <label className="stats-select">
          <span className="stats-select__label">Device</span>
          <select
            className="stats-select__control"
            value={filter.deviceId}
            onChange={(event) => onDevice(event.target.value)}
          >
            <option value={ALL_DEVICES}>All devices</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
