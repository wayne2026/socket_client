/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

const socket = io('http://localhost:3000'); // Adjust this URL if needed
window.socket = socket;
const LocationMarker = ({ position, userId }) => {
  console.log('Rendering Marker for:', userId, 'at position:', position);
  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        User ID: {userId} <br />
        Current Location
      </Popup>
    </Marker>
  );
};

const AutoZoom = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 13); // Set the view to the user's location with zoom level 13
    }
  }, [map, position]);

  return null; // This component does not render anything
};

const MapComponent = () => {
  const [userPosition, setUserPosition] = useState(null); // Default position to null
  const [locations, setLocations] = useState([]); // Array to hold multiple user locations

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const userPosition = [latitude, longitude];
        setUserPosition(userPosition); // Set the position to user's location

        // Emit the user's location to the server
        socket.emit('locationUpdate', { lat: latitude, lng: longitude, userId: socket.id });
      }, (error) => {
        console.error('Error getting location:', error);
      });
    } else {
      console.log('Geolocation is not supported by this browser.');
    }

    // Listen for initial locations from the server
    socket.on('initialLocations', (initialLocations) => {
      setLocations(initialLocations);
    });

    // Listen for location updates from the server
    socket.on('locationUpdate', (location) => {
      console.log('Received location update:', location);
      // Update the state with the new user's location
      setLocations((prev) => {
        const existingLocation = prev.find(loc => loc.userId === location.userId);
        if (existingLocation) {
          // Update the existing location
          return prev.map(loc => loc.userId === location.userId ? location : loc);
        } else {
          // Add the new location
          return [...prev, location];
        }
      });
    });

    // Listen for location removals from the server
    socket.on('removeLocation', (userId) => {
      setLocations((prev) => prev.filter(loc => loc.userId !== userId));
    });

    return () => {
      socket.off('initialLocations');
      socket.off('locationUpdate');
      socket.off('removeLocation'); // Clean up the event listeners
    };
  }, []);

  return (
    <MapContainer center={userPosition || [51.505, -0.09]} zoom={13} scrollWheelZoom={true} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Render the user's location */}
      {userPosition && <LocationMarker position={userPosition} userId="You" />}
      {/* Render other users' locations */}
      {locations.map((loc) => (
        <LocationMarker key={loc.userId} position={[loc.lat, loc.lng]} userId={loc.userId} />
      ))}
      <AutoZoom position={userPosition} /> {/* Auto zoom to user's position */}
    </MapContainer>
  );
};

export default MapComponent;
