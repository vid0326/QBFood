import React, { useContext, useState, useEffect } from "react";
import style from "./cart.module.css";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import { toast } from "react-toastify";
import { toINR, USD_TO_INR } from "../../utils/currency";

const Cart = () => {
  const { cartItem, food_list, removeFromCart, getTotalCartAmount, URl, token, discountAmount, setDiscountAmount, appliedCouponCode, setAppliedCouponCode, userData } = useContext(StoreContext);
  const navigate = useNavigate();

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoFeedback, setPromoFeedback] = useState({ success: null, message: "" });
  const [promoLoading, setPromoLoading] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  // Haversine distance calculator
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  };

  // Consistent fallback distance generator based on ID hash (for offline/blocked GPS)
  const getFallbackDistance = (id) => {
    if (!id) return "2.5";
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const distance = (Math.abs(hash) % 45) / 10 + 0.8; // range between 0.8 and 5.3 km
    return distance.toFixed(1);
  };

  // Resolve active distance
  const getRestaurantDistance = (restaurant) => {
    if (!restaurant) return "";
    const restCoords = restaurant.location?.coordinates;
    if (!restCoords || restCoords.length < 2) {
      return `${getFallbackDistance(restaurant._id)} km`;
    }
    const [restLng, restLat] = restCoords;
    if (userCoords && userCoords.lat && userCoords.lng) {
      const dist = calculateDistance(userCoords.lat, userCoords.lng, restLat, restLng);
      return `${dist.toFixed(1)} km`;
    }
    return `${getFallbackDistance(restaurant._id)} km`;
  };

  // Fetch coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.log("HTML5 Geolocation denied/failed, checking profile", err);
          if (userData?.currentLocation?.coordinates) {
            const [lng, lat] = userData.currentLocation.coordinates;
            if (lat !== 0 || lng !== 0) {
              setUserCoords({ lat, lng });
            }
          }
        }
      );
    } else if (userData?.currentLocation?.coordinates) {
      const [lng, lat] = userData.currentLocation.coordinates;
      if (lat !== 0 || lng !== 0) {
        setUserCoords({ lat, lng });
      }
    }
  }, [userData]);

  const handleApplyPromo = async () => {
    if (!token) {
      toast.warn("Please login first to apply a promo code! 🍔");
      return;
    }
    if (!promoCodeInput.trim()) {
      setPromoFeedback({ success: false, message: "Please enter a coupon code." });
      return;
    }
    setPromoLoading(true);
    setPromoFeedback({ success: null, message: "" });

    try {
      const response = await axios.post(
        URl + "/api/coupon/apply",
        { code: promoCodeInput.trim().toUpperCase(), cartTotal: getTotalCartAmount() },
        { headers: { token } }
      );
      if (response.data.success) {
        setDiscountAmount(response.data.discountAmount);
        setAppliedCouponCode(promoCodeInput.trim().toUpperCase());
        toast.success(`Coupon applied! Saved ${toINR(response.data.discountAmount)} 🎉`);
        setPromoFeedback({
          success: true,
          message: `Coupon applied! Saved ${toINR(response.data.discountAmount)} 🎉`
        });
      } else {
        setDiscountAmount(0);
        setAppliedCouponCode("");
        setPromoFeedback({
          success: false,
          message: response.data.message || "Failed to apply coupon."
        });
      }
    } catch (error) {
      console.error(error);
      setPromoFeedback({ success: false, message: "Error validating coupon. Try again." });
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <div className={style.Cart}>
      <h2>Your Cart 🛒</h2>
      <div className={style.CartItems}>
        <div className={style.CartItemsTitle}>
          <p>Image</p>
          <p>Name</p>
          <p>Price</p>
          <p>Quantity</p>
          <p>Total</p>
          <p>Remove</p>
        </div>
        <hr />
        {food_list.map((item, index) => {
          if (cartItem[item._id] > 0) {
            return (
              <div key={index}>
                <div className={`${style.CartItemsTitle} ${style.CartItemsItem}`}>
                  <img src={URl + "/images/" + item.image} alt={item.name} />
                  <div>
                    <p style={{ fontWeight: "600" }}>{item.name}</p>
                    {item.restaurantId && typeof item.restaurantId === 'object' && (
                      <span style={{ fontSize: "11.5px", color: "#a8a29e", display: "block", marginTop: "4px" }}>
                        🏪 {item.restaurantId.name} <span style={{ color: "#f97316", fontWeight: "600", marginLeft: "4px" }}>• {getRestaurantDistance(item.restaurantId)} away</span>
                      </span>
                    )}
                  </div>
                  <p>{toINR(item.price)}</p>
                  <p>{cartItem[item._id]}</p>
                  <p>{toINR(item.price * cartItem[item._id])}</p>
                  <p className={style.Cross} onClick={() => removeFromCart(item._id)}>✕</p>
                </div>
                <hr />
              </div>
            );
          }
        })}
      </div>

      <div className={style.CartBottom}>
        <div className={style.CartTotal}>
          <h2>Order Summary</h2>
          <div className={style.CartTotalDetails}>
            <p>Subtotal</p>
            <p>{toINR(getTotalCartAmount())}</p>
          </div>
          <hr />
          <div className={style.CartTotalDetails}>
            <p>Delivery Fee</p>
            <p>{toINR(getTotalCartAmount() === 0 ? 0 : 5)}</p>
          </div>
          <hr />
          
          {discountAmount > 0 && (
            <>
              <div className={style.CartTotalDetails} style={{ color: "#22c55e", fontWeight: "600" }}>
                <p>Discount ({appliedCouponCode})</p>
                <p>-{toINR(discountAmount)}</p>
              </div>
              <hr />
            </>
          )}

          <div className={style.CartTotalDetails}>
            <b>Total</b>
            <b>{toINR(getTotalCartAmount() === 0 ? 0 : Math.max(0, getTotalCartAmount() + 5 - discountAmount))}</b>
          </div>
          <button onClick={() => navigate('/placeorder')}>
            Proceed to Checkout →
          </button>
        </div>

        <div className={style.CartPromoCode}>
          <h3>🏷️ Promo Code</h3>
          <p>Have a discount code? Enter it below to save on your order.</p>
          <div className={style.CartPromoCodeInput}>
            <input 
              type="text" 
              placeholder="e.g. WELCOME20" 
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value)}
              disabled={appliedCouponCode !== ""}
            />
            <button 
              onClick={handleApplyPromo}
              disabled={promoLoading || appliedCouponCode !== ""}
            >
              {promoLoading ? "Checking..." : "Apply"}
            </button>
          </div>
          {appliedCouponCode && (
            <button 
              className={style.removePromoBtn}
              onClick={() => {
                setDiscountAmount(0);
                setAppliedCouponCode("");
                setPromoCodeInput("");
                setPromoFeedback({ success: null, message: "" });
              }}
              style={{
                marginTop: "10px",
                background: "transparent",
                color: "#ef4444",
                border: "1px solid #ef4444",
                padding: "6px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "12px",
                width: "fit-content"
              }}
            >
              Remove Promo Code ✕
            </button>
          )}
          {promoFeedback.message && (
            <p 
              className={style.promoMessage}
              style={{
                marginTop: "10px",
                fontSize: "13px",
                fontWeight: "500",
                color: promoFeedback.success ? "#22c55e" : "#ef4444"
              }}
            >
              {promoFeedback.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;
