import React, { useContext, useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import styles from "./myOrder.module.css";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { assets } from "../../assets/assets";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { toINR, USD_TO_INR } from "../../utils/currency";
import { downloadInvoice } from "../../utils/invoice";


// ── Status pipeline config ──────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: "Food is Getting Ready!", label: "Confirmed", icon: "✅" },
  { key: "Preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "Out for delivery", label: "On the way", icon: "🏍️" },
  { key: "Delivered", label: "Delivered", icon: "🎉" },
];

const getStepIndex = (status) => {
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
};

const statusColor = (status) => {
  if (status === "Delivered") return "#22c55e";
  if (status === "Out for delivery") return "#f97316";
  return "#f59e0b";
};

// ── OrderCard component ─────────────────────────────────────────────────────
const OrderCard = ({
  order, isExpanded, onToggle,
  trackingOrder, setTrackingOrder,
  driverPos,
  deliveryOTP, otpDismissed, setOtpDismissed,
  reviewOrder, setReviewOrder,
  reviewedOrders,
  rating, setRating, comment, setComment,
  reviewLoading, handleReviewSubmit,
  fetchOrders, mapRef,
  onCancel, onReorder,
}) => {
  const isDelivered = order.status === "Delivered";
  const isOutForDelivery = order.status === "Out for delivery";
  const isTracking = trackingOrder?._id === order._id;
  const hasReviewed = reviewedOrders.includes(order._id);
  const stepIdx = getStepIndex(order.status);
  const buildName = (addr) => {
    return [addr?.firstName, addr?.lastName]
      .filter(n => n && n.trim() && n.trim().toLowerCase() !== 'user')
      .join(' ') || addr?.firstName || 'Customer';
  };

  const restaurant = order.items[0]?.restaurantId?.name || "QuickBite Partner";
  const orderDate = new Date(order.date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  return (
    <div className={`${styles.orderCard} ${isExpanded ? styles.orderCardOpen : ""}`}>

      {/* ── Clickable Header Row ── */}
      <div className={styles.orderHeader} onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}>

        {/* Left: icon + details */}
        <div className={styles.orderLeft}>
          <div className={styles.orderIcon}>
            {isDelivered ? "🎉" : isOutForDelivery ? "🏍️" : "🍳"}
          </div>
          <div className={styles.orderMeta}>
            <p className={styles.orderTitle}>
              {order.items.slice(0, 2).map((item, i) => (
                <span key={i}>{item.name} ×{item.quantity}{i < Math.min(order.items.length, 2) - 1 ? ", " : ""}</span>
              ))}
              {order.items.length > 2 && <span className={styles.moreItems}> +{order.items.length - 2} more</span>}
            </p>
            <p className={styles.orderSub}>🏪 {restaurant}</p>
            <p className={styles.orderDate}>{orderDate}</p>
          </div>
        </div>

        {/* Right: amount + status + chevron */}
        <div className={styles.orderRight}>
          <span className={styles.orderAmount}>{toINR(order.amount)}</span>
          <span className={styles.statusBadge} style={{ background: `${statusColor(order.status)}18`, color: statusColor(order.status), borderColor: `${statusColor(order.status)}30` }}>
            <span className={styles.statusDot} style={{ background: statusColor(order.status) }}></span>
            {order.status}
          </span>
          <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}>›</span>
        </div>
      </div>

      {/* ── Expandable Detail Panel ── */}
      {isExpanded && (
        <div className={styles.orderDetail}>

          {/* Status Timeline */}
          <div className={styles.timeline}>
            {STATUS_STEPS.map((step, i) => {
              const done = i <= stepIdx;
              const current = i === stepIdx;
              return (
                <div key={step.key} className={styles.timelineStep}>
                  <div className={styles.timelineLeft}>
                    <div className={`${styles.timelineDot} ${done ? styles.timelineDotDone : ""} ${current ? styles.timelineDotCurrent : ""}`}>
                      {done ? step.icon : ""}
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`${styles.timelineLine} ${done ? styles.timelineLineDone : ""}`} />
                    )}
                  </div>
                  <div className={styles.timelineContent}>
                    <p className={`${styles.timelineLabel} ${current ? styles.timelineLabelCurrent : ""}`}>{step.label}</p>
                    {current && <p className={styles.timelineSub}>In progress</p>}
                    {done && !current && <p className={styles.timelineSub}>Done ✓</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className={styles.detailGrid}>
            <div className={styles.detailSection}>
              <h4>📦 Items Ordered</h4>
              <div className={styles.itemsList}>
                {order.items.map((item, i) => (
                  <div key={i} className={styles.itemRow}>
                    <span>{item.name}</span>
                    <span className={styles.itemQty}>×{item.quantity}</span>
                    <span className={styles.itemPrice}>{toINR(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className={`${styles.itemRow} ${styles.itemTotal}`}>
                  <span>Total</span>
                  <span></span>
                  <span>{toINR(order.amount)}</span>
                </div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h4>📍 Delivery Address</h4>
              <p style={{ fontWeight: '600', color: '#f1f5f9' }}>{buildName(order.address)}</p>
              <p>{order.address?.street}</p>
              <p>{order.address?.city}, {order.address?.state} {order.address?.zipcode}</p>
              <p>{order.address?.country}</p>
              {order.address?.phone && <p>📞 {order.address.phone}</p>}
            </div>
          </div>

          {/* Live Tracking Map (Out for delivery) */}
          {isOutForDelivery && (
            <div className={styles.trackSection}>

              {/* ── Delivery Agent Info Card ── */}
              {order.deliveryAgentId && (
                <div className={styles.agentCard}>
                  <div className={styles.agentAvatar}>
                    {order.deliveryAgentId.profilePic
                      ? <img src={order.deliveryAgentId.profilePic} alt="agent" className={styles.agentAvatarImg} />
                      : <span>{(order.deliveryAgentId.name || 'A')[0].toUpperCase()}</span>
                    }
                  </div>
                  <div className={styles.agentInfo}>
                    <p className={styles.agentName}>{order.deliveryAgentId.name || 'Delivery Agent'}</p>
                    <p className={styles.agentDetail}>
                      🛵 {order.deliveryAgentId.vehicleDetails || 'Scooter'}
                      {order.deliveryAgentId.licensePlate ? ` · ${order.deliveryAgentId.licensePlate}` : ''}
                    </p>
                    {order.deliveryAgentId.phone && (
                      <a href={`tel:${order.deliveryAgentId.phone}`} className={styles.agentContact}>
                        📞 {order.deliveryAgentId.phone}
                      </a>
                    )}
                    {!order.deliveryAgentId.phone && order.deliveryAgentId.email && (
                      <a href={`mailto:${order.deliveryAgentId.email}`} className={styles.agentContact}>
                        ✉️ {order.deliveryAgentId.email}
                      </a>
                    )}
                  </div>
                  <span className={styles.agentBadge}>🏍️ On the way</span>
                </div>
              )}

              <div className={styles.trackHeader}>
                <div>
                  <h4>🗺️ Live GPS Tracking</h4>
                  <p className={styles.trackSub}>Your courier is on the way — watch them in real-time</p>
                </div>
                <button
                  className={styles.trackBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTrackingOrder(isTracking ? null : order);
                  }}
                >
                  {isTracking ? "Hide Map ✕" : "Open Live Map 🗺️"}
                </button>
              </div>
              {isTracking && (
                <div className={styles.mapContainer}>
                  <div ref={mapRef} className={styles.leafletMap} />
                  {driverPos && (
                    <div className={styles.coordBadge}>
                      🏍️ {driverPos.lat?.toFixed(4)}, {driverPos.lng?.toFixed(4)}
                    </div>
                  )}
                </div>
              )}

              {/* OTP Banner if agent is near */}
              {deliveryOTP && (
                <div className={styles.otpBanner}>
                  <div className={styles.otpLeft}>
                    <span className={styles.otpPulse}>🛵</span>
                    <div>
                      <p className={styles.otpTitle}>Agent is at your door!</p>
                      <p className={styles.otpSub}>Show this OTP to confirm delivery</p>
                    </div>
                  </div>
                  <div className={styles.otpCode}>{deliveryOTP}</div>
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className={styles.actionRow}>
            <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); fetchOrders(true); }}>
              ↻ Refresh Status
            </button>
            {/* P1 #12: Cancel order if still preparing and no agent assigned */}
            {['Food is Getting Ready!', 'Preparing'].includes(order.status) && !order.deliveryAgentId && (
              <button
                className={`${styles.actionBtn} ${styles.actionBtnCancel}`}
                onClick={(e) => { e.stopPropagation(); onCancel(order._id); }}
              >
                ✕ Cancel Order
              </button>
            )}
            {/* P2 #35: Reorder */}
            {order.status === 'Delivered' && (
              <button
                className={`${styles.actionBtn} ${styles.actionBtnReorder}`}
                onClick={(e) => { e.stopPropagation(); onReorder(order); }}
              >
                🔁 Reorder
              </button>
            )}
            {/* #33: Invoice Download */}
            {order.status === 'Delivered' && order.payment && (
              <button
                className={`${styles.actionBtn} ${styles.actionBtnInvoice}`}
                onClick={(e) => { e.stopPropagation(); downloadInvoice(order); }}
              >
                📲 Invoice
              </button>
            )}
            {isDelivered && !hasReviewed && (
              <button
                className={`${styles.actionBtn} ${styles.actionBtnGreen}`}
                onClick={(e) => { e.stopPropagation(); setReviewOrder(reviewOrder?._id === order._id ? null : order); }}
              >
                ⭐ Rate This Order
              </button>
            )}
          </div>

          {/* Review Form */}
          {isDelivered && reviewOrder?._id === order._id && (
            <div className={styles.reviewPanel}>
              <h4>⭐ Rate Your Experience</h4>
              <p className={styles.reviewSub}>Help others find the best food!</p>
              <form onSubmit={handleReviewSubmit} className={styles.reviewForm}>
                <div className={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`${styles.star} ${star <= rating ? styles.starActive : ""}`}
                      onClick={() => setRating(star)}>★</span>
                  ))}
                </div>
                <textarea
                  rows={3}
                  placeholder="e.g. Amazing food, super fast delivery! 🔥"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className={styles.reviewTextarea}
                />
                <button type="submit" disabled={reviewLoading} className={styles.reviewSubmit}>
                  {reviewLoading ? "Submitting..." : "Submit Review 🌟"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main MyOrders page ──────────────────────────────────────────────────────
const MyOrders = () => {
  const { URl, token } = useContext(StoreContext);
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [expandedId, setExpandedId] = useState(null);   // which order is open
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewedOrders, setReviewedOrders] = useState([]);
  const [deliveryOTP, setDeliveryOTP] = useState(null);
  const [otpOrderId, setOtpOrderId] = useState(null);
  const [otpDismissed, setOtpDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarkerRef = useRef(null);
  const socketRef = useRef(null);

  const fetchOrders = async (showToast = false) => {
    if (!token) return;
    try {
      const res = await axios.post(URl + "/api/order/userorders", {}, { headers: { token } });
      const ordersList = res.data.data || [];
      setData(ordersList);

      // Auto-restore OTP banner if an active order already has a generated OTP in the database
      const activeWithOTP = ordersList.find(o => o.status === "Out for delivery" && o.deliveryOTP);
      if (activeWithOTP) {
        setDeliveryOTP(activeWithOTP.deliveryOTP);
        setOtpOrderId(activeWithOTP._id);
      } else {
        setDeliveryOTP(null);
        setOtpOrderId(null);
      }

      if (showToast) toast.success("Status refreshed! ↻", { autoClose: 1500 });
    } catch (err) {
      console.error(err);
      if (showToast) toast.error("Refresh failed. Try again.");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchOrders(); }, [token]);

  // Toggle expand
  const handleToggle = (orderId) => {
    setExpandedId(prev => prev === orderId ? null : orderId);
  };

  // Socket: live tracking + OTP events
  useEffect(() => {
    if (!trackingOrder || trackingOrder.status !== "Out for delivery") {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      return;
    }
    socketRef.current = io("http://localhost:4000");
    socketRef.current.emit("join_order_room", trackingOrder._id);

    socketRef.current.on("location_update", (coords) => setDriverPos(coords));
    socketRef.current.on("status_update", ({ status }) => {
      if (status) {
        fetchOrders();
        setTrackingOrder(prev => prev ? { ...prev, status } : null);
        toast.info(`Order status updated: ${status}`);
      }
    });
    socketRef.current.on("otp_ready", ({ otp, orderId }) => {
      setDeliveryOTP(otp); setOtpOrderId(orderId); setOtpDismissed(false);
      toast.success("🛵 Your agent is here! Check the OTP.");
    });
    socketRef.current.on("delivery_confirmed", () => {
      setDeliveryOTP(null); setOtpOrderId(null);
      fetchOrders();
      toast.success("🎉 Order delivered successfully!");
    });

    return () => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; } };
  }, [trackingOrder]);

  // Leaflet map init / destroy
  useEffect(() => {
    if (!trackingOrder || trackingOrder.status !== "Out for delivery") return;
    if (!mapRef.current) return;

    const loadLeaflet = () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
      } else if (window.L) { initMap(); }
    };

    loadLeaflet();
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; driverMarkerRef.current = null; }
    };
  }, [trackingOrder?._id, mapRef.current]);

  const initMap = () => {
    if (!mapRef.current || mapInstance.current || !window.L) return;
    const L = window.L;

    const restCoords = trackingOrder?.items?.[0]?.restaurantId?.location?.coordinates;
    const restLat = restCoords?.[1] || 25.9061;
    const restLng = restCoords?.[0] || 93.7270;
    const custLat = trackingOrder?.address?.latitude || restLat + 0.008;
    const custLng = trackingOrder?.address?.longitude || restLng + 0.005;
    const startLat = driverPos?.lat || restLat;
    const startLng = driverPos?.lng || restLng;

    mapInstance.current = L.map(mapRef.current).setView([startLat, startLng], 14);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO"
    }).addTo(mapInstance.current);

    const pin = (emoji, size = 28) => L.divIcon({
      html: `<div style="font-size:${size}px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6))">${emoji}</div>`,
      className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2]
    });

    L.marker([restLat, restLng], { icon: pin("🏪") }).addTo(mapInstance.current).bindPopup("🏪 Restaurant");
    L.marker([custLat, custLng], { icon: pin("🏠") }).addTo(mapInstance.current).bindPopup("🏠 Your location");
    driverMarkerRef.current = L.marker([startLat, startLng], { icon: pin("🏍️", 32) })
      .addTo(mapInstance.current).bindPopup("🏍️ Your courier").openPopup();

    const group = L.featureGroup([
      L.marker([restLat, restLng]), L.marker([custLat, custLng]), driverMarkerRef.current
    ]);
    mapInstance.current.fitBounds(group.getBounds().pad(0.25));
  };

  // Smoothly slide driver marker
  useEffect(() => {
    if (mapInstance.current && driverMarkerRef.current && driverPos) {
      driverMarkerRef.current.setLatLng([driverPos.lat, driverPos.lng]);
    }
  }, [driverPos]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token || !reviewOrder) return;
    setReviewLoading(true);
    try {
      const res = await axios.post(
        URl + "/api/review/add",
        {
          restaurantId: reviewOrder.items[0]?.restaurantId?._id || reviewOrder.restaurantId,
          orderId: reviewOrder._id, rating: Number(rating), comment: comment.trim()
        },
        { headers: { token } }
      );
      if (res.data.success) {
        toast.success("Review submitted! 🌟");
        setReviewedOrders(prev => [...prev, reviewOrder._id]);
        setReviewOrder(null); setComment(""); setRating(5);
      } else { toast.warn(res.data.message || "Failed to submit."); }
    } catch { toast.error("Error posting review."); }
    finally { setReviewLoading(false); }
  };

  // P1 #12: Cancel order
  const handleCancelOrder = async (orderId) => {
    try {
      const res = await axios.post(URl + "/api/order/cancel", { orderId }, { headers: { token } });
      if (res.data.success) {
        toast.success("Order cancelled.");
        fetchOrders();
      } else {
        toast.error(res.data.message || "Cannot cancel this order.");
      }
    } catch { toast.error("Error cancelling order."); }
  };

  // P2 #35: Reorder — re-add all items from an old order to cart
  const handleReorder = async (order) => {
    if (!token) { toast.error("Please login first!"); return; }
    try {
      for (const item of order.items) {
        for (let i = 0; i < item.quantity; i++) {
          await axios.post(URl + "/api/cart/add", { itemId: item._id }, { headers: { token } });
        }
      }
      toast.success(`${order.items.length} item(s) added back to cart! 🛒`);
      navigate("/cart");
    } catch { toast.error("Failed to reorder. Try again."); }
  };

  return (
    <>
    <div className={styles.page}>

      {/* ── Global OTP Modal (full-screen) ── */}
      {deliveryOTP && !otpDismissed && (
        <div className={styles.otpOverlay}>
          <div className={styles.otpModal}>
            <div className={styles.otpModalEmoji}>🛵</div>
            <h2>Your agent is here!</h2>
            <p>Share this OTP to confirm delivery</p>
            <div className={styles.otpModalCode}>{deliveryOTP}</div>
            <p className={styles.otpExpiry}>⏱ Expires in 10 minutes</p>
            <button className={styles.otpDismissBtn} onClick={() => setOtpDismissed(true)}>
              Keep in background
            </button>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1>My Orders</h1>
          <p className={styles.pageSubtitle}>{data.length} order{data.length !== 1 ? "s" : ""} placed</p>
        </div>
        <button className={styles.tryMoreBtn} onClick={() => navigate("/")}>
          🍔 Try More
        </button>
      </div>

      {/* P2 #28: Order History Analytics */}
      {!loading && data.length > 0 && (() => {
        const totalSpent = data.reduce((s, o) => s + (o.payment ? o.amount : 0), 0);
        const paidCount = data.filter(o => o.payment).length;
        const activeCount = data.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length;
        const restMap = {};
        data.forEach(o => {
          const rname = o.items?.[0]?.restaurantId?.name || 'QuickBite Partner';
          restMap[rname] = (restMap[rname] || 0) + 1;
        });
        const fav = Object.entries(restMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        return (
          <div className={styles.analyticsBar}>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsIcon}>💰</span>
              <div>
                <p className={styles.analyticsLabel}>Total Spent</p>
                <p className={styles.analyticsValue}>{toINR(totalSpent)}</p>
              </div>
            </div>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsIcon}>📦</span>
              <div>
                <p className={styles.analyticsLabel}>Orders Placed</p>
                <p className={styles.analyticsValue}>{paidCount}</p>
              </div>
            </div>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsIcon}>🏍️</span>
              <div>
                <p className={styles.analyticsLabel}>Active</p>
                <p className={styles.analyticsValue}>{activeCount}</p>
              </div>
            </div>
            <div className={styles.analyticsCard}>
              <span className={styles.analyticsIcon}>🏪</span>
              <div>
                <p className={styles.analyticsLabel}>Fav Restaurant</p>
                <p className={styles.analyticsValue} style={{ fontSize: '12px', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Order List ── */}
      {loading ? (
        <div className={styles.skeletonList}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonRow}>
                <div className={styles.skeletonLine} style={{ width: '60px', height: '60px', borderRadius: '12px' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className={styles.skeletonLine} style={{ width: '40%', height: '16px' }} />
                  <div className={styles.skeletonLine} style={{ width: '25%', height: '12px' }} />
                  <div className={styles.skeletonLine} style={{ width: '55%', height: '12px' }} />
                </div>
                <div className={styles.skeletonLine} style={{ width: '80px', height: '28px', borderRadius: '9999px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className={styles.emptyState}>
          <span>🍽️</span>
          <p>No orders yet. Your first delicious bite is a tap away!</p>
          <button className={styles.browseBtn} onClick={() => navigate("/")}>Browse Menu →</button>
        </div>
      ) : (
        <div className={styles.orderList}>
          {data.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              isExpanded={expandedId === order._id}
              onToggle={() => handleToggle(order._id)}
              trackingOrder={trackingOrder}
              setTrackingOrder={setTrackingOrder}
              driverPos={driverPos}
              deliveryOTP={otpOrderId === order._id ? deliveryOTP : null}
              otpDismissed={otpDismissed}
              setOtpDismissed={setOtpDismissed}
              reviewOrder={reviewOrder}
              setReviewOrder={setReviewOrder}
              reviewedOrders={reviewedOrders}
              rating={rating}
              setRating={setRating}
              comment={comment}
              setComment={setComment}
              reviewLoading={reviewLoading}
              handleReviewSubmit={handleReviewSubmit}
              fetchOrders={fetchOrders}
              mapRef={mapRef}
              onCancel={handleCancelOrder}
              onReorder={handleReorder}
            />
          ))}

        </div>
      )}
    </div>
  </>
  );
};

export default MyOrders;
