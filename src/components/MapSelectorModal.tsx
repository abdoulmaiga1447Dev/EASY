import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, X, Check, Navigation, Loader2 } from "lucide-react";

// Fix Leaflet marker icon issues in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: string) => void;
}

export const MapSelectorModal: React.FC<MapSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [searching, setSearching] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Default center: Abidjan (Cocody/Plateau area)
    const defaultLat = 5.3484;
    const defaultLng = -4.0150;

    // Avoid double initialization
    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([defaultLat, defaultLng], 13);

    mapRef.current = map;

    // Use a stunning premium Dark Matter tile layer to match our branding
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Add zoom controls to bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Create custom gold/green marker
    const marker = L.marker([defaultLat, defaultLng], {
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;

    // Initial reverse geocode
    geocodeCoordinates(defaultLat, defaultLng);

    // Click handler on map
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      geocodeCoordinates(lat, lng);
    });

    // Drag end handler on marker
    marker.on("dragend", () => {
      const position = marker.getLatLng();
      geocodeCoordinates(position.lat, position.lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen]);

  // Reverse geocoding helper using Nominatim
  const geocodeCoordinates = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      // Nominatim reverse search
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=fr`,
        {
          headers: {
            "User-Agent": "EasyBySaverApp/1.0",
          },
        }
      );
      if (!response.ok) throw new Error("Geocoding failed");
      const data = await response.json();
      
      if (data && data.display_name) {
        // Clean up the name a bit to make it friendly
        const nameParts = [];
        const addr = data.address;
        
        if (addr.amenity || addr.building || addr.shop) {
          nameParts.push(addr.amenity || addr.building || addr.shop);
        }
        if (addr.road) nameParts.push(addr.road);
        if (addr.suburb || addr.neighbourhood) nameParts.push(addr.suburb || addr.neighbourhood);
        if (addr.city || addr.town || addr.village) nameParts.push(addr.city || addr.town || addr.village);
        
        let cleanedName = nameParts.join(", ");
        if (!cleanedName) cleanedName = data.display_name;
        
        // Ensure Côte d'Ivoire is clean
        if (!cleanedName.includes("Côte d'Ivoire") && !cleanedName.includes("Ivory Coast")) {
          cleanedName += ", Côte d'Ivoire";
        }

        setSelectedAddress(cleanedName);
      } else {
        setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoadingAddress(false);
    }
  };

  // Live searching inside the map modal
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `/api/autocomplete?input=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      if (data && Array.isArray(data.predictions)) {
        setSearchResults(data.predictions);
      }
    } catch (error) {
      console.error("Search on map failed:", error);
    } finally {
      setSearching(false);
    }
  };

  // Location selection from list
  const selectLocation = async (placeName: string) => {
    setSearchResults([]);
    setSearchQuery("");
    setLoadingAddress(true);

    try {
      // Geolocate the chosen place name using Nominatim search
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName + ", Côte d'Ivoire")}&format=json&limit=1&accept-language=fr`,
        {
          headers: {
            "User-Agent": "EasyBySaverApp/1.0",
          },
        }
      );
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
          setSelectedAddress(placeName || display_name);
        }
      } else {
        // Fallback: search Photon
        const pResponse = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(placeName)}&limit=1&lang=fr`
        );
        const pData = await pResponse.json();
        if (pData && pData.features && pData.features.length > 0) {
          const coords = pData.features[0].geometry.coordinates;
          const [lon, lat] = coords;
          if (mapRef.current && markerRef.current) {
            mapRef.current.setView([lat, lon], 16);
            markerRef.current.setLatLng([lat, lon]);
            setSelectedAddress(placeName);
          }
        }
      }
    } catch (error) {
      console.error("Geocoding search query failed:", error);
    } finally {
      setLoadingAddress(false);
    }
  };

  // Get current user geolocation (if allowed)
  const locateUser = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
          geocodeCoordinates(latitude, longitude);
        }
      },
      (error) => {
        console.warn("Geolocation permission denied:", error);
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#0E0E14] border border-white-premium/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-white-premium/5 flex items-center justify-between bg-[#12121A]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#00C853]/15">
              <MapPin className="text-[#00C853]" size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Sélectionner sur la carte</h3>
              <p className="text-[11px] text-neutral-400">Déplacez le marqueur ou recherchez un lieu/quartier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar container inside map */}
        <div className="absolute top-16 left-4 right-4 z-[1000] max-w-lg">
          <div className="relative bg-[#14141C]/95 border border-white-premium/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="flex items-center px-3">
              <Search size={16} className="text-[#00C853] mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Rechercher un quartier, rue ou monument (ex: Angré Djibi)..."
                className="w-full py-3 bg-transparent text-sm text-white focus:outline-none placeholder-neutral-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                  className="p-1 text-neutral-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Live Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="border-t border-white-premium/5 max-h-60 overflow-y-auto divide-y divide-white-premium/5">
                {searchResults.map((res, idx) => (
                  <button
                    key={res.place_id || idx}
                    onClick={() => selectLocation(res.name)}
                    className="w-full text-left p-3 text-xs text-white hover:bg-[#00C853]/10 transition-colors flex items-center gap-2"
                  >
                    <MapPin size={12} className="text-[#00C853] shrink-0" />
                    <span className="truncate">{res.name}</span>
                  </button>
                ))}
              </div>
            )}

            {searching && (
              <div className="p-3 border-t border-white-premium/5 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                <Loader2 size={12} className="animate-spin text-[#00C853]" />
                Recherche de lieux...
              </div>
            )}
          </div>
        </div>

        {/* Map Canvas */}
        <div className="flex-1 w-full relative bg-[#07070a]">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Locate My Position Floating Button */}
          <button
            onClick={locateUser}
            className="absolute bottom-20 right-4 z-[1000] p-3 rounded-full bg-[#00C853] text-black hover:bg-[#00C853]/90 shadow-lg transition-transform active:scale-95"
            title="Me géolocaliser"
          >
            <Navigation size={18} className="fill-current" />
          </button>
        </div>

        {/* Address Footer Selection */}
        <div className="p-4 bg-[#12121A] border-t border-white-premium/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3 w-full sm:max-w-[70%]">
            <div className="p-2 rounded-lg bg-[#00C853]/10 text-[#00C853] shrink-0 mt-0.5">
              <MapPin size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-mono text-neutral-500">Adresse sélectionnée</span>
              <div className="text-sm font-medium text-white truncate">
                {loadingAddress ? (
                  <span className="text-neutral-500 italic flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-[#00C853]" />
                    Récupération de l'adresse...
                  </span>
                ) : (
                  selectedAddress || "Cliquez sur la carte"
                )}
              </div>
            </div>
          </div>

          <button
            disabled={!selectedAddress || loadingAddress}
            onClick={() => {
              if (selectedAddress) {
                onSelectAddress(selectedAddress);
                onClose();
              }
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#00C853] text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#00e35e] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Check size={16} />
            Confirmer l'adresse
          </button>
        </div>

      </div>
    </div>
  );
};
