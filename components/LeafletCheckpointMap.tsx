"use client";

import { Fragment } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import type { CheckpointStatus } from "@/lib/checkpoints";
import { getRegionBarHexColor } from "@/lib/status";
import LastChecked from "./LastChecked";

interface LeafletCheckpointMapProps {
  checkpoints: CheckpointStatus[];
}

const OFFLINE_COLOR = "#9aa7b3";

/** Bounds covering all 16 checkpoints (India + Indonesia + Singapore), fit on initial render. */
const BOUNDS: [[number, number], [number, number]] = [
  [-10, 70],
  [32, 118],
];

/** Stagger pulse animations so 16 markers don't all beat in lockstep. */
const PULSE_DELAY_CLASSES = ["", "checkpoint-pulse-delay-1", "checkpoint-pulse-delay-2", "checkpoint-pulse-delay-3"];

export default function LeafletCheckpointMap({ checkpoints }: LeafletCheckpointMapProps) {
  return (
    <MapContainer
      bounds={BOUNDS}
      boundsOptions={{ padding: [20, 20] }}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {checkpoints.map((checkpoint, index) => {
        const color = checkpoint.online ? getRegionBarHexColor(checkpoint.percentage) : OFFLINE_COLOR;

        return (
          <Fragment key={checkpoint.name}>
            {checkpoint.online && (
              <CircleMarker
                center={[checkpoint.lat, checkpoint.lng]}
                radius={7}
                interactive={false}
                bubblingMouseEvents={false}
                className={`checkpoint-pulse ${PULSE_DELAY_CLASSES[index % PULSE_DELAY_CLASSES.length]}`}
                pathOptions={{ stroke: false, fillColor: color, fillOpacity: 0.65 }}
              />
            )}
            <CircleMarker
              center={[checkpoint.lat, checkpoint.lng]}
              radius={7}
              pathOptions={{ color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 }}
            >
              <Tooltip>
                <div className="text-[12px]">
                  <p className="font-semibold">{checkpoint.name}</p>
                  <p className="text-muted">{checkpoint.regionLabel} checkpoint</p>
                  <p className="mt-1">
                    Status:{" "}
                    <span className="font-semibold" style={{ color }}>
                      {checkpoint.online ? `${checkpoint.percentage}% up` : "Offline"}
                    </span>
                  </p>
                  <p>
                    Domains: {checkpoint.up} up · {checkpoint.down} down
                    {checkpoint.blocked > 0 ? ` · ${checkpoint.blocked} blocked` : ""}
                  </p>
                  <p>
                    Last checked: <LastChecked timestamp={checkpoint.lastCheckedAt} />
                  </p>
                </div>
              </Tooltip>
            </CircleMarker>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
