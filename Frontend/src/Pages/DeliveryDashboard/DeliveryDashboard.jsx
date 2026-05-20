import React, { useContext, useState, useEffect, useRef } from "react";
import { toast } from 'react-toastify';
import { StoreContext } from "../../context/StoreContext";
import style from "./deliveryDashboard.module.css";
import axios from "axios";
import io from "socket.io-client";
import { toINR } from "../../utils/currency";

const DeliveryDashboard = () => {
  const { userData, token, URl } = useContext(StoreContext);
  const [onboarded, setOnboarded] = useState(false);
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [agentProfile, setAgentProfile] = useState(null);
  
  const [isOnline, setIsOnline] = useState(false);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [atRestaurant, setAtRestaurant] = useState(false);
  
  const [driverLat, setDriverLat] = useState(null);
  const [driverLng, setDriverLng] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  // OTP confirmation state (delivery agent side)
  const [otpPrompt, setOtpPrompt] = useState(false);     // server told agent to ask for OTP
  const [agentOtpInput, setAgentOtpInput] = useState(""); // digit OTP typed by agent
  const [otpError, setOtpError] = useState("");

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const socketRef = useRef(null);

  const restCoordsRef = useRef(null);
  const customerCoordsRef = useRef(null);
  const driverLatRef = useRef(null);
  const driverLngRef = useRef(null);

  useEffect(() => {
    driverLatRef.current = driverLat;
    driverLngRef.current = driverLng;
  }, [driverLat, driverLng]);

  useEffect(() => {
    if (!activeOrder) {
      restCoordsRef.current = null;
      customerCoordsRef.current = null;
      setAtRestaurant(false);
      setDriverLat(null);
      setDriverLng(null);
    }
  }, [activeOrder]);

  // Decodes JWT payload to identify user
  const decodeToken = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const fetchDriverProfile = async () => {
    if (!token) return;
    try {
      const decoded = decodeToken(token);
      if (!decoded) return;
      
      const response = await axios.post(`${URl}/api/delivery/profile`, {}, { headers: { token } });
      if (response.data.success) {
        setOnboarded(true);
        setAgentProfile(response.data.data);
        setIsOnline(response.data.data.isAvailable);
        if (response.data.data.activeOrderId) {
          setActiveOrder(response.data.data.activeOrderId);
          if (response.data.data.activeOrderId.deliveryOTP) {
            setOtpPrompt(true);
          }
        } else {
          setActiveOrder(null);
          setOtpPrompt(false);
        }
      } else {
        setOnboarded(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      toast.error("Unauthorized! Please log in as a Delivery Agent.");
      window.location.href = "/";
      return;
    }
    fetchDriverProfile();
  }, [token]);

  // Periodic polling for new orders when Online
  useEffect(() => {
    if (!token || !isOnline || activeOrder) return;

    const fetchQueue = async () => {
      try {
        const response = await axios.get(`${URl}/api/delivery/orders`, { 
          headers: { token },
          params: { lat: driverLat, lng: driverLng }
        });
        if (response.data.success) {
          setAvailableOrders(response.data.data);
        }
      } catch (err) {
        console.error("Queue poll failed", err);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 4000);
    return () => clearInterval(interval);
  }, [isOnline, activeOrder, token]);

  // GPS geolocation tracking (only track physical GPS when online and NOT in an active delivery simulation)
  useEffect(() => {
    if (!isOnline || activeOrder) return;

    const geoId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDriverLat(latitude);
        setDriverLng(longitude);
      },
      (err) => console.error("GPS Watch failed", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );

    return () => navigator.geolocation.clearWatch(geoId);
  }, [isOnline, activeOrder]);

  // Active delivery coordinates initialization (simulation mode)
  useEffect(() => {
    if (activeOrder && (driverLat === null || driverLng === null)) {
      const restCoords = activeOrder.items?.[0]?.restaurantId?.location?.coordinates;
      const rLat = restCoords?.[1] || 25.9061;
      const rLng = restCoords?.[0] || 93.7270;
      setDriverLat(rLat - 0.003); // Start slightly offset to allow "Go to Restaurant" simulation
      setDriverLng(rLng + 0.003);
    }
  }, [activeOrder, driverLat, driverLng]);

  // Connect socket on active delivery
  useEffect(() => {
    if (!activeOrder) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    socketRef.current = io("http://localhost:4000");
    socketRef.current.emit("join_order_room", activeOrder._id);

    // Agent is within 100m — server asks them to prompt customer for OTP
    socketRef.current.on("agent_otp_prompt", () => {
      setOtpPrompt(true);
      toast.info("You're within 100m! Ask the customer for their OTP. 📲", { autoClose: 6000 });
    });

    // Delivery confirmed by OTP — reset dashboard
    socketRef.current.on("delivery_confirmed", () => {
      setOtpPrompt(false);
      setAgentOtpInput("");
      fetchDriverProfile();
    });

    // Real-time status update from restaurant (e.g. "Out for delivery")
    socketRef.current.on("status_update", (data) => {
      if (data.orderId === activeOrder._id) {
        setActiveOrder(prev => ({ ...prev, status: data.status }));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [activeOrder]);

  // Load Leaflet map once activeOrder and driver coordinates are ready
  useEffect(() => {
    if (!activeOrder || !driverLat || !driverLng) return;
    if (mapInstance.current) return; // Already initialized

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const scriptId = "leaflet-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else if (window.L) {
      initMap();
    }
  }, [activeOrder, driverLat, driverLng]);

  // Clean up map when activeOrder changes or unmounts
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersRef.current = {};
      }
    };
  }, [activeOrder]);

  const initMap = () => {
    if (!mapRef.current || mapInstance.current) return;
    const L = window.L;

    const dLat = driverLatRef.current;
    const dLng = driverLngRef.current;

    // Center map around driver
    mapInstance.current = L.map(mapRef.current).setView([dLat, dLng], 14);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
    }).addTo(mapInstance.current);

    // Plot Driver Pin (Motorcycle Icon)
    const driverIcon = L.divIcon({
      html: `<div style="font-size: 26px; transform: scaleX(-1);">🏍️</div>`,
      className: "driver-marker-icon",
      iconSize: [30, 30]
    });
    markersRef.current.driver = L.marker([dLat, dLng], { icon: driverIcon }).addTo(mapInstance.current)
      .bindPopup("Your Position")
      .openPopup();

    // Plot Restaurant Pin
    if (!restCoordsRef.current) {
      const restCoords = activeOrder.items?.[0]?.restaurantId?.location?.coordinates;
      restCoordsRef.current = {
        lat: restCoords?.[1] || 25.9061,
        lng: restCoords?.[0] || 93.7270
      };
    }
    const { lat: restLat, lng: restLng } = restCoordsRef.current;
    
    const restIcon = L.divIcon({
      html: `<div style="font-size: 26px;">🏪</div>`,
      className: "rest-marker-icon",
      iconSize: [30, 30]
    });
    markersRef.current.restaurant = L.marker([restLat, restLng], { icon: restIcon }).addTo(mapInstance.current)
      .bindPopup(`Pickup: ${activeOrder.items?.[0]?.restaurantId?.name || "Kitchen"}`);

    // Plot Customer Pin
    if (!customerCoordsRef.current) {
      const customerLat = activeOrder.address?.latitude || restLat + 0.008;
      const customerLng = activeOrder.address?.longitude || restLng + 0.005;
      customerCoordsRef.current = {
        lat: customerLat,
        lng: customerLng
      };
    }
    const { lat: customerLat, lng: customerLng } = customerCoordsRef.current;
    
    const customerIcon = L.divIcon({
      html: `<div style="font-size: 26px;">🏠</div>`,
      className: "cust-marker-icon",
      iconSize: [30, 30]
    });
    markersRef.current.customer = L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(mapInstance.current)
      .bindPopup(`Drop-off Address: ${activeOrder.address?.street}`);

    // Zoom map to fit all three pins
    const group = new L.featureGroup([
      markersRef.current.driver,
      markersRef.current.restaurant,
      markersRef.current.customer
    ]);
    mapInstance.current.fitBounds(group.getBounds().pad(0.15));
  };

  // Keep driver marker synchronized when position updates
  useEffect(() => {
    if (mapInstance.current && markersRef.current.driver && driverLat && driverLng) {
      markersRef.current.driver.setLatLng([driverLat, driverLng]);
    }
  }, [driverLat, driverLng]);

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleDetails.trim()) return;
    setOnboardLoading(true);
    try {
      const response = await axios.post(`${URl}/api/delivery/onboard`, {
        vehicleDetails: vehicleDetails.trim()
      }, { headers: { token } });
      if (response.data.success) {
        toast.success("Registration complete!");
        fetchDriverProfile();
      } else {
        toast.error("Failed to register driver profile.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    setActionLoading(true);
    try {
      const response = await axios.post(`${URl}/api/delivery/status`, {}, { headers: { token } });
      if (response.data.success) {
        setIsOnline(response.data.isAvailable);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    setActionLoading(true);
    try {
      const response = await axios.post(`${URl}/api/delivery/accept`, { orderId }, { headers: { token } });
      if (response.data.success) {
        toast.success("Order successfully claimed! Navigate to the restaurant. 🗺️");
        fetchDriverProfile();
      } else {
        toast.warn(response.data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (agentOtpInput.trim().length !== 6) {
      toast.warn("Please enter the 6-digit OTP from the customer.");
      return;
    }
    setActionLoading(true);
    setOtpError("");
    try {
      const response = await axios.post(
        `${URl}/api/order/verify-delivery-otp`,
        { orderId: activeOrder._id, otp: agentOtpInput.trim() },
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success("Delivery confirmed! Payout credited. 🎉");
        setOtpPrompt(false);
        setAgentOtpInput("");
        fetchDriverProfile();
      } else {
        setOtpError(response.data.message);
        toast.error(response.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error confirming delivery.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={style.loadingBox}>
        <h2>🛵 Loading Driver Command Terminal...</h2>
      </div>
    );
  }

  // Render Onboarding Screen if profile does not exist
  if (!onboarded) {
    return (
      <div className={style.onboardContainer} style={{ maxWidth: "500px", margin: "60px auto", padding: "30px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "16px" }}>
        <h2>🏍️ Join the QuickBite Delivery Fleet</h2>
        <p style={{ color: "#a8a29e", marginTop: "8px", fontSize: "14px" }}>Register your motorcycle/scooter registration details to start accepting immediate local delivery gigs.</p>
        
        <form onSubmit={handleOnboardSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600" }}>Vehicle Description & License Plate</label>
            <input 
              type="text" 
              placeholder="e.g. Honda Activa - NL-07-H-1234" 
              value={vehicleDetails}
              onChange={(e) => setVehicleDetails(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#fff" }}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={onboardLoading}
            style={{ padding: "12px", background: "#f97316", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
          >
            {onboardLoading ? "Registering..." : "Start Delivery Onboarding →"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={style.dashboardContainer}>
      <div className={style.headerSection}>
        <div className={style.titleWrapper}>
          <span className={style.badge}>Delivery Partner Portal 🛵</span>
          <h1>Welcome Back, {userData?.name || "Driver"}!</h1>
          <p className={style.subtitle}>Manage your orders, track earnings, and navigate live deliveries.</p>
        </div>

        <div className={style.statusCard}>
          <div className={style.statusToggle}>
            <span className={activeOrder ? style.statusTextOnline : isOnline ? style.statusTextOnline : style.statusTextOffline}>
              {activeOrder ? "ON GIG 🏍️" : isOnline ? "YOU ARE ONLINE 🟢" : "YOU ARE OFFLINE 🔴"}
            </span>
            <button 
              onClick={handleStatusToggle} 
              disabled={actionLoading || activeOrder}
              className={isOnline ? style.toggleBtnOnline : style.toggleBtnOffline}
              style={activeOrder ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              {actionLoading ? "Saving..." : isOnline ? "Go Offline" : "Go Online"}
            </button>
          </div>
          {activeOrder && (
            <span style={{ fontSize: "11px", color: "#f87171", display: "block", marginTop: "6px", textAlign: "center" }}>
              Finish active delivery to toggle offline.
            </span>
          )}
        </div>
      </div>
 
      <div className={style.metricsGrid}>
        <div className={style.metricCard}>
          <h3>Platform Status</h3>
          <p className={style.metricValue} style={{ color: activeOrder ? "#f97316" : isOnline ? "#22c55e" : "#ef4444" }}>
            {activeOrder ? "Active" : isOnline ? "Online" : "Offline"}
          </p>
          <span className={style.metricSub}>{activeOrder ? "Busy with delivery" : "Ready for geofence offers"}</span>
        </div>
        <div className={style.metricCard}>
          <h3>Active Delivery</h3>
          <p className={style.metricValue}>{activeOrder ? "1 Order" : "None"}</p>
          <span className={style.metricSub}>{activeOrder ? "In transit" : "Awaiting gig"}</span>
        </div>
        {/* #23: Earnings stats */}
        <div className={style.metricCard}>
          <h3>Total Deliveries</h3>
          <p className={style.metricValue} style={{ color: "#f97316" }}>
            {agentProfile?.totalDeliveries ?? 0}
          </p>
          <span className={style.metricSub}>Since joining</span>
        </div>
        <div className={style.metricCard}>
          <h3>Est. Earnings</h3>
          <p className={style.metricValue} style={{ color: "#22c55e", fontSize: "1.2rem" }}>
            {toINR(agentProfile?.earnings ?? (agentProfile?.totalDeliveries ?? 0) * 45)}
          </p>
          <span className={style.metricSub}>@ ₹45 per delivery</span>
        </div>
        <div className={style.metricCard}>
          <h3>Registered Fleet</h3>
          <p className={style.metricValue} style={{ fontSize: "1.2rem", height: "42px", display: "flex", alignItems: "center" }}>
            {agentProfile?.vehicleDetails || "Scooter"}
          </p>
          <span className={style.metricSub}>License: Confirmed ✓</span>
        </div>
      </div>

      <div className={style.contentLayout}>
        <div className={style.queueSection}>
          <div className={style.sectionHeader}>
            <h2>Active Order Request Queue</h2>
            <span className={style.liveDot}>LIVE QUEUE</span>
          </div>

          {activeOrder ? (
            <div className={style.activeOrderPanel} style={{ background: "rgba(249, 115, 22, 0.05)", border: "1px solid rgba(249, 115, 22, 0.15)", padding: "20px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ background: "#f97316", color: "#fff", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "600" }}>ACTIVE TASK</span>
                <strong>Ref ID: #{activeOrder._id.slice(-8).toUpperCase()}</strong>
              </div>
              <hr style={{ borderColor: "rgba(255, 255, 255, 0.06)" }} />
              <div>
                <strong style={{ fontSize: "13px", color: "#a8a29e" }}>🏪 PICKUP RESTAURANT:</strong>
                <p style={{ fontWeight: "600", fontSize: "15px", marginTop: "4px" }}>{activeOrder.items?.[0]?.restaurantId?.name || "QuickBite Partner Kitchen"}</p>
              </div>
              <div>
                <strong style={{ fontSize: "13px", color: "#a8a29e" }}>🏠 CUSTOMER DROP-OFF:</strong>
                <p style={{ fontWeight: "600", fontSize: "15px", marginTop: "4px" }}>{activeOrder.address?.street}, {activeOrder.address?.city}</p>
                <p style={{ fontSize: "13px", color: "#a8a29e", marginTop: "2px" }}>Recipient: {activeOrder.address?.firstName} {activeOrder.address?.lastName} ({activeOrder.address?.phone})</p>
              </div>
              <div>
                <strong style={{ fontSize: "13px", color: "#a8a29e" }}>📦 ITEMS LIST:</strong>
                <ul style={{ paddingLeft: "20px", fontSize: "13px", marginTop: "4px" }}>
                  {activeOrder.items?.map((item, idx) => (
                    <li key={idx}>{item.name} x {item.quantity}</li>
                  ))}
                </ul>
              </div>
              {/* OTP Confirmation Panel - appears when agent is within 100m */}
              {otpPrompt ? (
                <div style={{
                  marginTop: "12px",
                  padding: "16px",
                  background: "rgba(249, 115, 22, 0.08)",
                  border: "1px solid rgba(249, 115, 22, 0.3)",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                  <p style={{ color: "#f97316", fontWeight: "700", fontSize: "14px", margin: 0 }}>
                    📲 You're at the drop-off! Ask customer for their OTP
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    value={agentOtpInput}
                    onChange={(e) => setAgentOtpInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP"
                    style={{
                      padding: "12px 16px",
                      fontSize: "20px",
                      letterSpacing: "0.3em",
                      textAlign: "center",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(249,115,22,0.4)",
                      borderRadius: "8px",
                      color: "#f97316",
                      fontWeight: "800",
                      fontFamily: "'Space Grotesk', monospace",
                      outline: "none"
                    }}
                  />
                  {otpError && (
                    <p style={{ color: "#f87171", fontSize: "12px", margin: 0 }}>⚠️ {otpError}</p>
                  )}
                  <button
                    onClick={handleCompleteOrder}
                    disabled={actionLoading || agentOtpInput.length !== 6}
                    style={{
                      padding: "12px",
                      background: agentOtpInput.length === 6 ? "#22c55e" : "rgba(34,197,94,0.3)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: agentOtpInput.length === 6 ? "pointer" : "not-allowed",
                      fontWeight: "bold",
                      fontSize: "14px",
                      transition: "all 0.2s"
                    }}
                  >
                    {actionLoading ? "Verifying..." : "✅ Confirm Delivery"}
                  </button>
                </div>
              ) : (
                <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", textAlign: "center", fontSize: "13px", color: "#57534e" }}>
                  🏍️ Drive to the customer's address. OTP will appear when you're within 100m.
                </div>
              )}
            </div>
          ) : !isOnline ? (
            <div className={style.emptyState}>
              <p>You must go **Online** to start receiving delivery requests.</p>
            </div>
          ) : availableOrders.length === 0 ? (
            <div className={style.emptyState}>
              <p>Scanning for nearby orders within your geofenced radius...</p>
              <div className={style.loader}></div>
            </div>
          ) : (
            <div className={style.orderList} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {availableOrders.map((order, idx) => (
                <div key={idx} className={style.orderOfferCard} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "16px", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <strong>Ref: #{order._id.slice(-6).toUpperCase()}</strong>
                    {(() => {
                      const restCoords = order.items?.[0]?.restaurantId?.location?.coordinates;
                      const rLat = restCoords?.[1];
                      const rLng = restCoords?.[0];
                      const cLat = order.address?.latitude;
                      const cLng = order.address?.longitude;
                      let distStr = "Unknown dist";
                      let payout = 25; // fallback
                      if (rLat && rLng && cLat && cLng) {
                        const R = 6371;
                        const dLat = (cLat - rLat) * (Math.PI/180);
                        const dLon = (cLng - rLng) * (Math.PI/180);
                        const a = Math.sin(dLat/2)**2 + Math.cos(rLat * Math.PI/180) * Math.cos(cLat * Math.PI/180) * Math.sin(dLon/2)**2;
                        const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
                        distStr = `${dist.toFixed(1)} km`;
                        payout = Math.max(10, Math.round(dist * 5)); // 5rs per km, min 10
                      }
                      return (
                        <div style={{ textAlign: "right" }}>
                          <span style={{ color: "#22c55e", fontWeight: "bold" }}>{toINR(payout)} Payout</span>
                          <div style={{ fontSize: "11px", color: "#a8a29e", marginTop: "2px" }}>({distStr})</div>
                        </div>
                      );
                    })()}
                  </div>
                  <p style={{ fontSize: "13px", color: "#a8a29e" }}>🏪 From: {order.items?.[0]?.restaurantId?.name || "Partner Restaurant"}</p>
                  <p style={{ fontSize: "13px", color: "#a8a29e", marginTop: "2px" }}>🏠 To: {order.address?.street}, {order.address?.city}</p>
                  <button 
                    onClick={() => handleAcceptOrder(order._id)}
                    disabled={actionLoading}
                    style={{ width: "100%", marginTop: "12px", padding: "8px 12px", background: "#f97316", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontWeight: "600" }}
                  >
                    Accept Delivery GIG 🏍️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={style.mapSection}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Live Navigation Guidance</h2>
            {activeOrder && (
              <div style={{ display: "flex", gap: "10px" }}>
                {!atRestaurant && (
                  <button
                    onClick={() => {
                      if (restCoordsRef.current) {
                        const { lat: rLat, lng: rLng } = restCoordsRef.current;
                        setDriverLat(rLat);
                        setDriverLng(rLng);
                        setAtRestaurant(true);
                        if (socketRef.current) socketRef.current.emit("update_location", { orderId: activeOrder._id, lat: rLat, lng: rLng });
                        toast.success("Arrived at Restaurant!");
                      } else {
                        toast.error("Map not fully loaded yet!");
                      }
                    }}
                    style={{ padding: "8px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                  >
                    🚀 Go to Restaurant
                  </button>
                )}
                {atRestaurant && (
                  <button
                    onClick={() => {
                      if (activeOrder.status !== "Out for delivery") {
                        toast.warn("Wait for Restaurant to mark order 'Out for delivery'!");
                        return;
                      }
                      if (customerCoordsRef.current) {
                        const { lat: destLat, lng: destLng } = customerCoordsRef.current;
                        
                        // 1km is approximately 0.009 degrees
                        const step = 0.009;
                        const currentLat = driverLat;
                        const currentLng = driverLng;
                        
                        const latDiff = destLat - currentLat;
                        const lngDiff = destLng - currentLng;
                        const distanceDegrees = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
                        
                        let newLat, newLng;
                        if (distanceDegrees <= step) {
                          newLat = destLat;
                          newLng = destLng;
                          toast.success("Arrived at Customer drop-off!");
                        } else {
                          const ratio = step / distanceDegrees;
                          newLat = currentLat + latDiff * ratio;
                          newLng = currentLng + lngDiff * ratio;
                          
                          // Estimate remaining distance
                          const remainingKm = ((distanceDegrees - step) * 111).toFixed(1);
                          toast.info(`Moving closer to customer... ~${remainingKm} km remaining.`);
                        }
                        
                        setDriverLat(newLat);
                        setDriverLng(newLng);
                        if (socketRef.current) socketRef.current.emit("update_location", { orderId: activeOrder._id, lat: newLat, lng: newLng });
                      } else {
                        toast.error("Map not fully loaded yet!");
                      }
                    }}
                    style={{ padding: "8px 12px", background: activeOrder.status === "Out for delivery" ? "#22c55e" : "rgba(34,197,94,0.3)", color: "#fff", border: "none", borderRadius: "6px", cursor: activeOrder.status === "Out for delivery" ? "pointer" : "not-allowed", fontSize: "12px", fontWeight: "bold" }}
                  >
                    🛵 Deliver Food
                  </button>
                )}
              </div>
            )}
          </div>
          {activeOrder && driverLat && driverLng ? (
            <div ref={mapRef} style={{ width: "100%", height: "400px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.05)", marginTop: "15px", position: "relative", zIndex: "1" }} />
          ) : (
            <div className={style.mapPlaceholder} style={{ marginTop: "15px", height: "400px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px stroke rgba(255,255,255,0.05)", borderRadius: "12px", padding: "30px", background: "rgba(255,255,255,0.01)" }}>
              <p style={{ color: "#a8a29e", textAlign: "center" }}>Go online and accept an order request to activate real-time GPS tracking maps.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
