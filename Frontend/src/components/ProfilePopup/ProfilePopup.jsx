import React, { useContext, useState, useEffect } from "react";
import { toast } from 'react-toastify';
import style from "./profilePopup.module.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";

const ProfilePopup = ({ setShowProfile }) => {
  const { URl, token, userData, setUserData, setToken } = useContext(StoreContext);

  // Address helper extraction
  const initialAddress = userData?.addresses?.[0] || {
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: ""
  };

  const [name, setName] = useState(userData?.name || "");
  const [phone, setPhone] = useState(userData?.phone || ""); // #20: phone field
  const [street, setStreet] = useState(initialAddress.street || "");
  const [city, setCity] = useState(initialAddress.city || "");
  const [state, setState] = useState(initialAddress.state || "");
  const [zipCode, setZipCode] = useState(initialAddress.zipCode || "");
  const [country, setCountry] = useState(initialAddress.country || "");
  
  const [image, setImage] = useState(false); // Stores selected file object
  const [loading, setLoading] = useState(false);

  // Fallback / last delivered address placeholder state
  const [lastAddressPlaceholder, setLastAddressPlaceholder] = useState({
    street: "123 Main St, Apt 4B",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "United States"
  });

  useEffect(() => {
    const fetchLastDeliveredAddress = async () => {
      try {
        const response = await axios.post(
          URl + "/api/order/userorders", 
          {}, 
          { headers: { token } }
        );
        if (response.data.success && response.data.data.length > 0) {
          const orders = response.data.data;
          const lastOrder = orders[orders.length - 1];
          if (lastOrder && lastOrder.address) {
            const addr = lastOrder.address;
            setLastAddressPlaceholder({
              street: addr.street || "123 Main St, Apt 4B",
              city: addr.city || "New York",
              state: addr.state || "NY",
              zipCode: addr.zipcode || "10001",
              country: addr.country || "United States"
            });
          }
        }
      } catch (err) {
        console.error("Error fetching user orders for address placeholder:", err);
      }
    };

    if (token) {
      fetchLastDeliveredAddress();
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userData");
    setToken("");
    setShowProfile(false);
    window.location.href = "/";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone); // #20: persist phone
      formData.append("street", street);
      formData.append("city", city);
      formData.append("state", state);
      formData.append("zipCode", zipCode);
      formData.append("country", country);
      if (image) {
        formData.append("image", image);
      }

      const response = await axios.post(
        URl + "/api/user/update-profile", 
        formData, 
        { headers: { token } }
      );

      if (response.data.success) {
        setUserData(response.data.user);
        localStorage.setItem("userData", JSON.stringify(response.data.user));
        toast.success("Profile updated successfully! ✨");
        setShowProfile(false);
      } else {
        toast.warn(response.data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={style.ProfilePopup}>
      <form onSubmit={handleSubmit} className={style.ProfilePopupContainer}>
        <div className={style.ProfilePopupTitle}>
          <h2>Profile Settings 👤</h2>
          <div className={style.closeBtn} onClick={() => setShowProfile(false)}>
            <img src={assets.cross_icon} alt="Close" />
          </div>
        </div>

        {/* Profile Picture Uploader */}
        <div className={style.picSection}>
          <div className={style.picContainer}>
            <img 
              src={
                image 
                  ? URL.createObjectURL(image) 
                  : userData?.profilePic 
                    ? URl + "/images/" + userData.profilePic 
                    : assets.profile_icon
              } 
              alt="Profile Pic" 
              className={style.profilePreview}
            />
            <label htmlFor="profile-pic-file" className={style.uploadOverlay}>
              <p>Change Photo 📷</p>
            </label>
            <input 
              type="file" 
              id="profile-pic-file" 
              onChange={(e) => setImage(e.target.files[0])} 
              style={{ display: "none" }} 
              accept="image/*"
            />
          </div>
          <span className={style.emailText}>{userData?.email}</span>
          {/* #29: Loyalty XP badge */}
          {(userData?.loyaltyPoints ?? 0) > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
              borderRadius: '9999px', padding: '4px 12px', marginTop: '6px',
              fontSize: '12px', fontWeight: '700', color: '#f97316'
            }}>
              🏆 {userData.loyaltyPoints} QuickBite XP
            </div>
          )}
        </div>

        <div className={style.formFields}>
          {/* Name Field */}
          <div className={style.inputGroup}>
            <label>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" required />
          </div>

          {/* #20: Phone field */}
          <div className={style.inputGroup}>
            <label>Phone Number 📞</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              maxLength={10}
            />
          </div>

          {/* Address Subsections */}
          <div className={style.addressHeader}>
            <h3>Delivery Address 📍</h3>
          </div>

          <div className={style.inputGroup}>
            <label>Street Address</label>
            <input 
              type="text" 
              value={street} 
              onChange={(e) => setStreet(e.target.value)} 
              placeholder={lastAddressPlaceholder.street} 
            />
          </div>

          <div className={style.gridGroup}>
            <div className={style.inputGroup}>
              <label>City</label>
              <input 
                type="text" 
                value={city} 
                onChange={(e) => setCity(e.target.value)} 
                placeholder={lastAddressPlaceholder.city} 
              />
            </div>
            <div className={style.inputGroup}>
              <label>State</label>
              <input 
                type="text" 
                value={state} 
                onChange={(e) => setState(e.target.value)} 
                placeholder={lastAddressPlaceholder.state} 
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
                placeholder={lastAddressPlaceholder.zipCode} 
              />
            </div>
            <div className={style.inputGroup}>
              <label>Country</label>
              <input 
                type="text" 
                value={country} 
                onChange={(e) => setCountry(e.target.value)} 
                placeholder={lastAddressPlaceholder.country} 
              />
            </div>
          </div>
        </div>

        <div className={style.actionButtons}>
          <button type="submit" className={style.saveBtn} disabled={loading}>
            {loading ? "Saving Changes..." : "Save Changes"}
          </button>
          
          <button type="button" onClick={handleLogout} className={style.logoutBtn}>
            Logout Session 🚪
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePopup;
