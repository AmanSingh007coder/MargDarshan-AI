import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon not showing up in React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function Map({ trucks }) {
  // Center on Bengaluru since you are building for DSCE/Bengaluru context!
  const center = [12.9716, 77.5946]; 

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {trucks.map((truck) => (
          <Marker key={truck.id} position={[truck.lat, truck.lng]}>
            <Popup>
              <div className="text-dark">
                <p className="font-bold">{truck.name}</p>
                <p className="text-sm">Status: {truck.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}