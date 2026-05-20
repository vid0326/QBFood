import React, { useContext, useState, useEffect, useRef } from "react";
import { toast } from 'react-toastify';
import style from "./addressSelector.module.css";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";

const AddressSelector = ({ onSelectAddress, selectedAddress }) => {
  const { URl, token, userData, setUserData } = useContext(StoreContext);

  const [view, setView] = useState("list"); // "list" or "add"
  const [addMode, setAddMode] = useState("manual"); // "manual", "gps", "map"
  
  // New Address Form States
  const [label, setLabel] = useState("Home");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);

  // Map States & Refs
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [coords, setCoords] = useState([28.6139, 77.2090]); // Default Delhi coordinates

  // 1. Dynamic Leaflet CDN Loader
  useEffect(() => {
    if (addMode !== "map" || view !== "add") return;

    const loadLeaflet = () => {
      if (window.L) {
        initMap();
        return;
      }

      // Add CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.id = "leaflet-css";
      document.head.appendChild(link);

      // Add JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.id = "leaflet-js";
      script.onload = initMap;
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current || mapInstance.current) return;

      // Instantiate Leaflet Map
      const L = window.L;
      
      // Fix default Leaflet icon assets from CDN path
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current).setView(coords, 13);
      mapInstance.current = map;

      // Add dark tiles mapping for premium dark-theme styling
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20
      }).addTo(map);

      // Create draggable marker
      const marker = L.marker(coords, { draggable: true }).addTo(map);
      markerInstance.current = marker;

      // Update geocode info on dragend
      marker.on("dragend", async () => {
        const position = marker.getLatLng();
        const lat = position.lat;
        const lng = position.lng;
        setCoords([lat, lng]);
        await reverseGeocode(lat, lng);
      });

      // Handle map clicks
      map.on("click", async (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        marker.setLatLng(e.latlng);
        setCoords([lat, lng]);
        await reverseGeocode(lat, lng);
      });

      setMapLoaded(true);
      
      // Auto Geolocate to center map
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const userLatLng = [lat, lng];
          setCoords(userLatLng);
          map.setView(userLatLng, 15);
          marker.setLatLng(userLatLng);
          reverseGeocode(lat, lng);
        },
        () => console.log("User rejected geolocation standard lookup")
      );
    };

    loadLeaflet();

    return () => {
      // Clean up map instance on mode close
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerInstance.current = null;
      }
    };
  }, [addMode, view]);

  // 2. OpenStreetMap Reverse Geocoding nominatim
  const reverseGeocode = async (lat, lon) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      if (res.data && res.data.address) {
        const addr = res.data.address;
        setStreet(addr.road || addr.suburb || addr.neighbourhood || addr.amenity || "");
        setCity(addr.city || addr.town || addr.village || addr.county || "");
        setState(addr.state || "");
        setZipCode(addr.postcode || "");
        setCountry(addr.country || "");
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Locate Me HTML5 Action
  const handleGPSLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords([lat, lng]);
        await reverseGeocode(lat, lng);
        toast.success("📍 Location captured via GPS and reverse-geocoded successfully!");
      },
      (err) => {
        toast.error("Failed to access GPS. Please ensure location permissions are enabled.");
        setLoading(false);
      }
    );
  };

  // 4. Save Address to Backend
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Please log in first!");
      return;
    }
    setLoading(true);

    try {
      const response = await axios.post(
        URl + "/api/user/add-address",
        { label, street, city, state, zipCode, country },
        { headers: { token } }
      );

      if (response.data.success) {
        setUserData(response.data.user);
        localStorage.setItem("userData", JSON.stringify(response.data.user));
        
        // Select newly added address instantly
        const newAddr = response.data.addresses[response.data.addresses.length - 1];
        if (onSelectAddress) {
          onSelectAddress(newAddr);
        }
        
        // Reset states and return to list
        setView("list");
        setStreet("");
        setCity("");
        setState("");
        setZipCode("");
        setCountry("");
        setLabel("Home");
      } else {
        toast.warn(response.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={style.addressBox}>
      {view === "list" ? (
        <div className={style.listView}>
          <div className={style.headerRow}>
            <h2>Select Delivery Address 📍</h2>
            <button 
              type="button" 
              onClick={() => setView("add")} 
              className={style.addBtn}
            >
              ➕ Add New Address
            </button>
          </div>

          {(!userData?.addresses || userData.addresses.length === 0) ? (
            <div className={style.emptyState}>
              <p>No saved addresses found. Please add an address to proceed!</p>
              <button 
                type="button" 
                onClick={() => setView("add")} 
                className={style.addBtnCenter}
              >
                Add Your First Address
              </button>
            </div>
          ) : (
            <div className={style.addressGrid}>
              {userData.addresses.map((addr, idx) => {
                const isSelected = selectedAddress?._id === addr._id || (selectedAddress?.street === addr.street && selectedAddress?.city === addr.city);
                return (
                  <div 
                    key={addr._id || idx} 
                    className={`${style.addressCard} ${isSelected ? style.cardSelected : ""}`}
                    onClick={() => onSelectAddress && onSelectAddress(addr)}
                  >
                    <div className={style.cardHeader}>
                      <span className={style.badge}>{addr.label || "Home"}</span>
                      {isSelected && <span className={style.selectedTick}>✓ Selected</span>}
                    </div>
                    <p className={style.streetText}>{addr.street}</p>
                    <p className={style.cityText}>{addr.city}, {addr.state} - {addr.zipCode}</p>
                    <p className={style.countryText}>{addr.country}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className={style.addView}>
          <div className={style.headerRow}>
            <h2>Add New Address 🏡</h2>
            <button 
              type="button" 
              onClick={() => setView("list")} 
              className={style.backBtn}
            >
              ⬅ Back to Saved Addresses
            </button>
          </div>

          {/* Onboarding Mode Selector */}
          <div className={style.modeSelector}>
            <div 
              className={`${style.modeTab} ${addMode === "manual" ? style.modeTabActive : ""}`}
              onClick={() => setAddMode("manual")}
            >
              ✍️ Manual Entry
            </div>
            <div 
              className={`${style.modeTab} ${addMode === "gps" ? style.modeTabActive : ""}`}
              onClick={() => {
                setAddMode("gps");
                handleGPSLocation();
              }}
            >
              🛰️ Use Live GPS
            </div>
            <div 
              className={`${style.modeTab} ${addMode === "map" ? style.modeTabActive : ""}`}
              onClick={() => setAddMode("map")}
            >
              🗺️ Select on Map
            </div>
          </div>

          <div className={style.addLayout}>
            {addMode === "map" && (
              <div className={style.mapWrapper}>
                <div ref={mapRef} className={style.leafletMap}></div>
                <p className={style.mapHint}>🖱️ Drag the red pin or click anywhere on the map to autofill address coordinates.</p>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className={style.addressForm}>
              <div className={style.gridGroup}>
                <div className={style.inputGroup}>
                  <label>Address Label</label>
                  <select 
                    value={label} 
                    onChange={(e) => setLabel(e.target.value)}
                    className={style.formSelect}
                  >
                    <option value="Home">Home 🏠</option>
                    <option value="Work">Work 💼</option>
                    <option value="Office">Office 🏢</option>
                    <option value="Other">Other 📍</option>
                  </select>
                </div>
                <div className={style.inputGroup}>
                  <label>Label Tag Name</label>
                  <input 
                    type="text" 
                    value={label} 
                    onChange={(e) => setLabel(e.target.value)} 
                    placeholder="e.g. My Gym, Friend's house" 
                  />
                </div>
              </div>

              <div className={style.inputGroup}>
                <label>Street Address</label>
                <input 
                  type="text" 
                  value={street} 
                  onChange={(e) => setStreet(e.target.value)} 
                  placeholder="123 Foodie Lane" 
                  required 
                />
              </div>

              <div className={style.gridGroup}>
                <div className={style.inputGroup}>
                  <label>City</label>
                  <input 
                    type="text" 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                    placeholder="City" 
                    required 
                  />
                </div>
                <div className={style.inputGroup}>
                  <label>State</label>
                  <input 
                    type="text" 
                    value={state} 
                    onChange={(e) => setState(e.target.value)} 
                    placeholder="State" 
                    required 
                  />
                </div>
              </div>

              <div className={style.gridGroup}>
                <div className={style.inputGroup}>
                  <label>Zip Code</label>
                  <input 
                    type="text" 
                    value={zipCode} 
                    onChange={(e) => setZipCode(e.target.value)} 
                    placeholder="Zip Code" 
                    required 
                  />
                </div>
                <div className={style.inputGroup}>
                  <label>Country</label>
                  <input 
                    type="text" 
                    value={country} 
                    onChange={(e) => setCountry(e.target.value)} 
                    placeholder="Country" 
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className={style.submitBtn} 
                disabled={loading}
              >
                {loading ? "Capturing Address..." : "💾 Save Address & Set Active"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressSelector;
