"use client";

import { useMemo } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";

type StoreLocationPickerProps = {
  lat: number | null;
  lng: number | null;
  onChange: (coords: { lat: number; lng: number }) => void;
};

const defaultCenter = {
  lat: -25.7479,
  lng: 28.2293,
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({
  onChange,
}: {
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(event) {
      onChange({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useMemo(() => {
    map.setView([lat, lng], 17);
  }, [lat, lng, map]);

  return null;
}

export function StoreLocationPicker({
  lat,
  lng,
  onChange,
}: StoreLocationPickerProps) {
  const center = {
    lat: lat ?? defaultCenter.lat,
    lng: lng ?? defaultCenter.lng,
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-black/10 bg-white">
      <div className="h-[320px] w-full">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={lat && lng ? 17 : 11}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onChange={onChange} />

          {lat && lng && (
            <>
              <RecenterMap lat={lat} lng={lng} />

              <Marker
                position={[lat, lng]}
                icon={markerIcon}
                draggable
                eventHandlers={{
                  dragend(event) {
                    const marker = event.target;
                    const position = marker.getLatLng();

                    onChange({
                      lat: position.lat,
                      lng: position.lng,
                    });
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      <div className="border-t border-black/10 bg-kasi-cream px-4 py-3">
        <p className="text-xs font-bold leading-5 text-black/55">
          Click on the map or drag the pin to the exact store entrance. This
          helps customers find the correct collection point.
        </p>
      </div>
    </div>
  );
}