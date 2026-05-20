import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { toINR } from '../../utils/currency';
import { StoreContext } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import style from './vendorDashboard.module.css';

const VendorDashboard = () => {
  const { URl, token, role, userData } = useContext(StoreContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("profile"); // profile, add, list, orders
  const [restaurant, setRestaurant] = useState(null);
  const [onboarded, setOnboarded] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile fields state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [cuisines, setCuisines] = useState("");
  const [banner, setBanner] = useState(null);
  const [gallery, setGallery] = useState([]);
  
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Food Item States
  const [foodImage, setFoodImage] = useState(null);
  const [foodGallery, setFoodGallery] = useState([]);
  const [foodData, setFoodData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Salad"
  });
  const [foodList, setFoodList] = useState([]);
  // #22: Inline menu edit
  const [editItem, setEditItem] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [ordersList, setOrdersList] = useState([]);
  const [couponsList, setCouponsList] = useState([]);
  const [couponData, setCouponData] = useState({
    code: "",
    discountPercentage: "",
    maxDiscountAmount: "",
    minOrderValue: "",
    expiryDate: ""
  });

  const fetchVendorCoupons = async () => {
    if (!restaurant) return;
    try {
      const response = await axios.get(`${URl}/api/coupon/list`, {
        params: { restaurantId: restaurant._id }
      });
      if (response.data.success) {
        setCouponsList(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await axios.post(`${URl}/api/coupon/add`, {
        ...couponData,
        discountPercentage: Number(couponData.discountPercentage),
        maxDiscountAmount: Number(couponData.maxDiscountAmount),
        minOrderValue: Number(couponData.minOrderValue),
        restaurantId: restaurant._id
      });
      if (response.data.success) {
        toast.success("Promo coupon created successfully! 🏷️");
        setCouponData({
          code: "",
          discountPercentage: "",
          maxDiscountAmount: "",
          minOrderValue: "",
          expiryDate: ""
        });
        fetchVendorCoupons();
      } else {
        toast.warn(response.data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm("Delete this promo coupon? 🗑️")) return;
    try {
      const response = await axios.delete(`${URl}/api/coupon/delete/${id}`);
      if (response.data.success) {
        toast.success("Coupon deleted successfully!");
        fetchVendorCoupons();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // #22: Update food item inline
  const handleUpdateFood = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setEditLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', editItem._id);
      formData.append('name', editItem.name);
      formData.append('description', editItem.description);
      formData.append('price', editItem.price);
      formData.append('category', editItem.category);
      formData.append('isAvailable', String(editItem.isAvailable !== false));
      const response = await axios.post(`${URl}/api/food/update`, formData, { headers: { token } });
      if (response.data.success) {
        toast.success('Menu item updated! ✅');
        setEditItem(null);
        fetchFoodList();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('Failed to update item');
    } finally {
      setEditLoading(false);
    }
  };

  const [actionLoading, setActionLoading] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  // Decodes JWT payload
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

  const checkOnboardingStatus = async () => {
    if (!token) {
      setLoadingProfile(false);
      return;
    }
    try {
      const decoded = decodeToken(token);
      if (decoded && decoded.id) {
        const response = await axios.get(`${URl}/api/restaurant/owner/${decoded.id}`);
        if (response.data.success) {
          const rest = response.data.data;
          setRestaurant(rest);
          setOnboarded(true);
          
          // Pre-populate fields
          setName(rest.name || "");
          setDescription(rest.description || "");
          setStreet(rest.address?.street || "");
          setCity(rest.address?.city || "");
          setStateName(rest.address?.state || "");
          setZipCode(rest.address?.zipCode || "");
          setCountry(rest.address?.country || "");
          setLat(rest.location?.coordinates?.[1]?.toFixed(6) || "");
          setLng(rest.location?.coordinates?.[0]?.toFixed(6) || "");
          setCuisines(rest.cuisineTypes?.join(', ') || "");
        } else {
          setOnboarded(false);
        }
      }
    } catch (err) {
      console.error("Error checking vendor profile status:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (!token || role !== "restaurant_owner") {
      navigate("/");
      return;
    }
    checkOnboardingStatus();
  }, [token, role]);

  // Load interactive map only if Tab is Profile
  useEffect(() => {
    if (activeTab !== "profile" || loadingProfile) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else if (window.L) {
      initMap();
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [activeTab, loadingProfile, onboarded]);

  const initMap = () => {
    if (!mapRef.current || mapInstance.current) return;

    const initialLat = parseFloat(lat) || 25.9061;
    const initialLng = parseFloat(lng) || 93.7270;

    const L = window.L;
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([initialLat, initialLng], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(mapInstance.current);

    markerInstance.current = L.marker([initialLat, initialLng], {
      draggable: true
    }).addTo(mapInstance.current);

    markerInstance.current.on('dragend', () => {
      const position = markerInstance.current.getLatLng();
      setLat(position.lat.toFixed(6));
      setLng(position.lng.toFixed(6));
      reverseGeocode(position.lat, position.lng);
    });

    mapInstance.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      markerInstance.current.setLatLng([lat, lng]);
      setLat(lat.toFixed(6));
      setLng(lng.toFixed(6));
      reverseGeocode(lat, lng);
    });
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        setStreet(addr.road || addr.suburb || addr.neighbourhood || "");
        setCity(addr.city || addr.town || addr.village || addr.county || "");
        setStateName(addr.state || "");
        setZipCode(addr.postcode || "");
        setCountry(addr.country || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast.error("GPS not supported!");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        setGpsLoading(false);
        if (mapInstance.current && markerInstance.current) {
          mapInstance.current.setView([latitude, longitude], 15);
          markerInstance.current.setLatLng([latitude, longitude]);
        }
        reverseGeocode(latitude, longitude);
      },
      () => {
        toast.error("Failed to acquire live GPS.");
        setGpsLoading(false);
      }
    );
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setOnboardLoading(true);

    try {
      const decoded = decodeToken(token);
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("ownerId", decoded.id);
      formData.append("lat", lat);
      formData.append("lng", lng);

      const addressData = { street, city, state: stateName, zipCode, country };
      formData.append("address", JSON.stringify(addressData));

      const cuisineList = cuisines ? cuisines.split(',').map(c => c.trim()) : [];
      formData.append("cuisineTypes", JSON.stringify(cuisineList));

      if (banner) {
        formData.append("bannerImage", banner);
      }
      gallery.forEach((file) => {
        formData.append("images", file);
      });

      const response = await axios.post(`${URl}/api/restaurant/onboard`, formData, { headers: { token } });
      if (response.data.success) {
        toast.warn(response.data.message);
        checkOnboardingStatus();
      } else {
        toast.warn(response.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving restaurant profile.");
    } finally {
      setOnboardLoading(false);
    }
  };

  // Fetch foods for List Tab
  const fetchVendorFoods = async () => {
    if (!restaurant) return;
    try {
      const response = await axios.get(`${URl}/api/food/list`, {
        params: { restaurantId: restaurant._id }
      });
      if (response.data.success) {
        setFoodList(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch orders for Orders Tab
  const fetchVendorOrders = async () => {
    if (!restaurant) return;
    try {
      const response = await axios.get(`${URl}/api/order/list`, {
        params: { restaurantId: restaurant._id }
      });
      if (response.data.success) {
        setOrdersList(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "list") {
      fetchVendorFoods();
    } else if (activeTab === "orders" || activeTab === "revenue") {
      fetchVendorOrders();
    } else if (activeTab === "coupons") {
      fetchVendorCoupons();
    }
  }, [activeTab, restaurant]);

  // Remove menu item
  const handleRemoveFood = async (id) => {
    if (!window.confirm("Are you sure you want to delete this menu item? 🗑️")) return;
    try {
      const response = await axios.post(`${URl}/api/food/remove`, { id });
      if (response.data.success) {
        toast.warn("Dish deleted!");
        fetchVendorFoods();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add menu item
  const handleAddFoodSubmit = async (e) => {
    e.preventDefault();
    if (!foodImage) {
      toast.error("Please upload a dish photo!");
      return;
    }
    setActionLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", foodData.name);
      formData.append("description", foodData.description);
      formData.append("price", Number(foodData.price));
      formData.append("category", foodData.category);
      formData.append("image", foodImage);
      
      foodGallery.forEach((file) => {
        formData.append("images", file);
      });

      formData.append("restaurantId", restaurant._id);

      const response = await axios.post(`${URl}/api/food/add`, formData);
      if (response.data.success) {
        toast.success("Dish added successfully! 🍽️");
        setFoodImage(null);
        setFoodGallery([]);
        setFoodData({ name: "", description: "", price: "", category: "Salad" });
        setActiveTab("list");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Order status update
  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      const response = await axios.post(`${URl}/api/order/status`, { orderId, status: newStatus });
      if (response.data.success) {
        fetchVendorOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingProfile) {
    return (
      <div className={style.loadingBox}>
        <h2>🏪 Fetching Restaurant Profile...</h2>
      </div>
    );
  }

  return (
    <div className={style.dashboardContainer}>
      {/* Sidebar Nav */}
      <div className={style.sidebar}>
        <div className={style.vendorBadge}>
          <div className={style.avatarCircle}>🏪</div>
          <div>
            <h4>{restaurant ? restaurant.name : "New Vendor"}</h4>
            <span>{restaurant ? "Active Partner" : "Onboarding"}</span>
          </div>
        </div>

        <ul className={style.menuList}>
          <li 
            className={activeTab === "profile" ? style.activeTabItem : ""} 
            onClick={() => setActiveTab("profile")}
          >
            🖼️ Profile & Gallery
          </li>
          {onboarded && (
            <>
              <li 
                className={activeTab === "add" ? style.activeTabItem : ""} 
                onClick={() => setActiveTab("add")}
              >
                ➕ Add Menu Item
              </li>
              <li 
                className={activeTab === "list" ? style.activeTabItem : ""} 
                onClick={() => setActiveTab("list")}
              >
                📋 List Menu Items
              </li>
              <li 
                className={activeTab === "orders" ? style.activeTabItem : ""} 
                onClick={() => setActiveTab("orders")}
              >
                🛍️ Restaurant Orders
              </li>
              <li 
                className={activeTab === "coupons" ? style.activeTabItem : ""} 
                onClick={() => setActiveTab("coupons")}
              >
                🏷️ Promo Configurator
              </li>
              <li 
                className={activeTab === "revenue" ? style.activeTabItem : ""} 
                onClick={() => setActiveTab("revenue")}
              >
                📊 Revenue & Analytics
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Main Content Area */}
      <div className={style.content}>
        
        {/* Tab 1: Profile & Gallery */}
        {activeTab === "profile" && (
          <div className={style.card}>
            <h3>🏪 Restaurant Profile & Gallery</h3>
            <p className={style.subText}>Configure details, banner image, and up to 5 aesthetic photos showcasing your dine-in experience.</p>
            
            <form onSubmit={handleOnboardSubmit} className={style.onboardForm}>
              <div className={style.formGrid}>
                {/* General Info */}
                <div className={style.formCard}>
                  <h4>General Info</h4>
                  <div className={style.inputGroup}>
                    <label>Restaurant Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g. Naga Kitchen Traditional" 
                      required 
                    />
                  </div>
                  <div className={style.inputGroup}>
                    <label>Cuisine Specialties</label>
                    <input 
                      type="text" 
                      value={cuisines} 
                      onChange={(e) => setCuisines(e.target.value)} 
                      placeholder="e.g. Naga, Spicy, Grills" 
                      required 
                    />
                  </div>
                  <div className={style.inputGroup}>
                    <label>Description</label>
                    <textarea 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="Describe your dishes, service details, and kitchen..." 
                      rows="4" 
                      required 
                    />
                  </div>

                  <h4 style={{ marginTop: '24px' }}>Photos Gallery</h4>
                  <div className={style.inputGroup}>
                    <label>Primary Banner Image</label>
                    <input 
                      type="file" 
                      onChange={(e) => setBanner(e.target.files[0])} 
                      accept="image/*" 
                    />
                    {restaurant?.bannerImage && (
                      <div className={style.thumbnail}>
                        <img src={`${URl}/images/${restaurant.bannerImage}`} alt="Banner Preview" />
                      </div>
                    )}
                  </div>
                  <div className={style.inputGroup}>
                    <label>Gallery Photos (Max 5)</label>
                    <input 
                      type="file" 
                      multiple 
                      onChange={(e) => setGallery(Array.from(e.target.files))} 
                      accept="image/*" 
                    />
                    <span className={style.helperText}>{gallery.length} files selected (Up to 5)</span>
                    {restaurant?.images && restaurant.images.length > 0 && (
                      <div className={style.galleryGrid}>
                        {restaurant.images.map((img, idx) => (
                          <div key={idx} className={style.galleryThumbnail}>
                            <img src={`${URl}/images/${img}`} alt={`Gallery ${idx}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Map & Address Info */}
                <div className={style.formCard}>
                  <div className={style.flexRow}>
                    <h4>Location & GPS</h4>
                    <button 
                      type="button" 
                      onClick={handleGPS} 
                      disabled={gpsLoading}
                      className={style.gpsBtn}
                    >
                      {gpsLoading ? "Acquiring..." : "📍 Get GPS Location"}
                    </button>
                  </div>

                  <div className={style.mapContainer}>
                    <div ref={mapRef} style={{ height: '220px', width: '100%', borderRadius: '12px' }} />
                  </div>

                  <div className={style.coordsRow}>
                    <div className={style.inputGroup}>
                      <label>Latitude</label>
                      <input type="text" value={lat} readOnly />
                    </div>
                    <div className={style.inputGroup}>
                      <label>Longitude</label>
                      <input type="text" value={lng} readOnly />
                    </div>
                  </div>

                  <div className={style.inputGroup}>
                    <label>Street Address</label>
                    <input 
                      type="text" 
                      value={street} 
                      onChange={(e) => setStreet(e.target.value)} 
                      placeholder="e.g. Circular Road" 
                      required 
                    />
                  </div>
                  <div className={style.grid2}>
                    <div className={style.inputGroup}>
                      <label>City</label>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required />
                    </div>
                    <div className={style.inputGroup}>
                      <label>State</label>
                      <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} required />
                    </div>
                  </div>
                  <div className={style.grid2}>
                    <div className={style.inputGroup}>
                      <label>Zip Code</label>
                      <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} required />
                    </div>
                    <div className={style.inputGroup}>
                      <label>Country</label>
                      <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} required />
                    </div>
                  </div>
                </div>
              </div>

              <div className={style.centerBtn}>
                <button type="submit" disabled={onboardLoading} className={style.submitBtn}>
                  {onboardLoading ? "Saving Restaurant..." : "🚀 Save & Onboard Profile"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Add Menu Item */}
        {activeTab === "add" && onboarded && (
          <div className={style.card}>
            <h3>➕ Add Food Item to Restaurant</h3>
            <form onSubmit={handleAddFoodSubmit} className={style.formContainer}>
              <div className={style.inputGroup}>
                <label>Dish Photo (Primary)</label>
                <input 
                  type="file" 
                  onChange={(e) => setFoodImage(e.target.files[0])} 
                  accept="image/*" 
                  required 
                />
              </div>
              <div className={style.inputGroup}>
                <label>Additional Gallery Photos (Max 5)</label>
                <input 
                  type="file" 
                  multiple
                  onChange={(e) => setFoodGallery(Array.from(e.target.files))} 
                  accept="image/*" 
                />
                <span className={style.helperText}>{foodGallery.length} files selected (Up to 5 photos)</span>
              </div>
              <div className={style.inputGroup}>
                <label>Dish Name</label>
                <input 
                  type="text" 
                  value={foodData.name} 
                  onChange={(e) => setFoodData({ ...foodData, name: e.target.value })} 
                  placeholder="e.g. Smoked Pork Ribs" 
                  required 
                />
              </div>
              <div className={style.inputGroup}>
                <label>Description</label>
                <textarea 
                  value={foodData.description} 
                  onChange={(e) => setFoodData({ ...foodData, description: e.target.value })} 
                  placeholder="Describe your dish details..." 
                  rows="4" 
                  required 
                />
              </div>
              <div className={style.grid2}>
                <div className={style.inputGroup}>
                  <label>Price (₹)</label>
                  <input 
                    type="number" 
                    value={foodData.price} 
                    onChange={(e) => setFoodData({ ...foodData, price: e.target.value })} 
                    placeholder="20" 
                    required 
                  />
                </div>
                <div className={style.inputGroup}>
                  <label>Category</label>
                  <select 
                    value={foodData.category} 
                    onChange={(e) => setFoodData({ ...foodData, category: e.target.value })}
                  >
                    <option value="Salad">Salad</option>
                    <option value="Rolls">Rolls</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Sandwich">Sandwich</option>
                    <option value="Cake">Cake</option>
                    <option value="Pure Veg">Pure Veg</option>
                    <option value="Pasta">Pasta</option>
                    <option value="Noodles">Noodles</option>
                  </select>
                </div>
              </div>
              <div className={style.centerBtn}>
                <button type="submit" disabled={actionLoading} className={style.submitBtn}>
                  {actionLoading ? "Adding Dish..." : "🍽️ Add Dish to Menu"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: List Menu Items */}
        {activeTab === "list" && onboarded && (
          <div className={style.card}>
            <h3>📋 Restaurant Menu Directory</h3>

            {/* #22: Inline Edit Modal */}
            {editItem && (
              <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 16px', color: '#f97316' }}>✏️ Editing: {editItem.name}</h4>
                <form onSubmit={handleUpdateFood} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className={style.grid2}>
                    <div className={style.inputGroup}>
                      <label>Dish Name</label>
                      <input type="text" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} required />
                    </div>
                    <div className={style.inputGroup}>
                      <label>Price (₹)</label>
                      <input type="number" value={editItem.price} onChange={e => setEditItem({...editItem, price: e.target.value})} required />
                    </div>
                  </div>
                  <div className={style.inputGroup}>
                    <label>Description</label>
                    <textarea rows="2" value={editItem.description} onChange={e => setEditItem({...editItem, description: e.target.value})} />
                  </div>
                  <div className={style.grid2}>
                    <div className={style.inputGroup}>
                      <label>Category</label>
                      <select value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})}>
                        {['Salad','Rolls','Dessert','Sandwich','Cake','Pure Veg','Pasta','Noodles'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className={style.inputGroup}>
                      <label>Availability</label>
                      <select value={editItem.isAvailable !== false ? 'true' : 'false'} onChange={e => setEditItem({...editItem, isAvailable: e.target.value === 'true'})}>
                        <option value="true">🟢 Available</option>
                        <option value="false">🔴 Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className={style.saveBtn} disabled={editLoading}>{editLoading ? 'Saving...' : '✅ Save Changes'}</button>
                    <button type="button" className={style.deleteBtn} onClick={() => setEditItem(null)}>✕ Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className={style.tableContainer}>
              <table className={style.table}>
                <thead>
                  <tr>
                    <th>Dish Photo</th>
                    <th>Dish Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Available</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {foodList.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <img 
                          src={`${URl}/images/${item.image}`} 
                          alt={item.name} 
                          className={style.tableThumb} 
                        />
                      </td>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>{toINR(item.price)}</td>
                      <td>
                        <span style={{ color: item.isAvailable !== false ? '#22c55e' : '#ef4444', fontWeight: '700', fontSize: '12px' }}>
                          {item.isAvailable !== false ? '🟢 Yes' : '🔴 No'}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setEditItem({ ...item })}
                          style={{ padding: '5px 12px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleRemoveFood(item._id)} 
                          className={style.deleteBtn}
                        >
                          Delete 🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {foodList.length === 0 && (
                    <tr>
                      <td colSpan="6" className={style.emptyCell}>
                        No dishes listed yet. Click "Add Menu Item" to start your kitchen!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Restaurant Orders */}
        {activeTab === "orders" && onboarded && (
          <div className={style.card}>
            <h3>🛍️ Manage Incoming Customer Orders</h3>
            <div className={style.ordersGrid}>
              {ordersList.map((order, index) => (
                <div key={index} className={style.orderCard}>
                  <div className={style.orderHeader}>
                    <h5>Order ID: {order._id.slice(-6)}</h5>
                    <span className={style.orderAmount}>{toINR(order.amount)}</span>
                  </div>
                  <div className={style.orderItems}>
                    <strong>Items Ordered:</strong>
                    <ul>
                      {order.items.map((item, itemIdx) => (
                        <li key={itemIdx}>{item.name} x {item.quantity} ({item.category})</li>
                      ))}
                    </ul>
                  </div>
                  <div className={style.customerInfo}>
                    <strong>Customer:</strong> {order.address.firstName} {order.address.lastName}
                    <br />
                    <strong>Phone:</strong> {order.address.phone}
                    <br />
                    <strong>Delivery Address:</strong> {order.address.street}, {order.address.city}, {order.address.state}
                  </div>
                  <div className={style.orderStatusBlock}>
                    <strong>Status:</strong>
                    {['Food is Getting Ready!', 'Preparing'].includes(order.status) ? (
                      <select 
                        value={order.status} 
                        onChange={(e) => handleOrderStatusChange(order._id, e.target.value)}
                        className={style.statusSelect}
                      >
                        <option value={order.status}>{order.status}</option>
                        <option value="Out for delivery">Out for delivery 🏍️</option>
                      </select>
                    ) : (
                      <span className={style.statusBadge} style={{ 
                        marginLeft: "10px", 
                        background: order.status === "Delivered" ? "rgba(34, 197, 94, 0.15)" : order.status === "Cancelled" ? "rgba(239, 68, 68, 0.15)" : "rgba(249, 115, 22, 0.15)", 
                        color: order.status === "Delivered" ? "#22c55e" : order.status === "Cancelled" ? "#ef4444" : "#f97316", 
                        padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "600",
                        display: "inline-block"
                      }}>
                        {order.status} {order.status === "Delivered" ? "✓" : order.status === "Out for delivery" ? "🏍️" : order.status === "Cancelled" ? "✕" : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {ordersList.length === 0 && (
                <div className={style.noOrders}>
                  No active orders found for your restaurant.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Promo Configurator */}
        {activeTab === "coupons" && onboarded && (
          <div className={style.card}>
            <h3>🏷️ Scoped Restaurant Promo Configurator</h3>
            <p className={style.subText}>Create and manage custom single-use discount coupon campaigns scoped to your restaurant.</p>
            
            <div className={style.promoFlexLayout} style={{ display: "flex", gap: "30px", marginTop: "20px", flexWrap: "wrap" }}>
              {/* Left Column: Create Form */}
              <div className={style.promoFormSection} style={{ flex: "1", minWidth: "300px", background: "rgba(255, 255, 255, 0.03)", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <h4>Create Promo Campaign</h4>
                <form onSubmit={handleCreateCoupon} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
                  <div className={style.inputGroup}>
                    <label>Coupon Code (Alphanumeric)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. MONSTER50" 
                      value={couponData.code} 
                      onChange={(e) => setCouponData({ ...couponData, code: e.target.value.toUpperCase() })} 
                      required 
                    />
                  </div>
                  <div className={style.inputGroup}>
                    <label>Discount Percentage (%)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="100" 
                      placeholder="e.g. 20" 
                      value={couponData.discountPercentage} 
                      onChange={(e) => setCouponData({ ...couponData, discountPercentage: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className={style.inputGroup}>
                    <label>Maximum Discount Cap (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 10" 
                      value={couponData.maxDiscountAmount} 
                      onChange={(e) => setCouponData({ ...couponData, maxDiscountAmount: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className={style.inputGroup}>
                    <label>Minimum Order Subtotal Required (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 25" 
                      value={couponData.minOrderValue} 
                      onChange={(e) => setCouponData({ ...couponData, minOrderValue: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className={style.inputGroup}>
                    <label>Expiry Date</label>
                    <input 
                      type="date" 
                      value={couponData.expiryDate} 
                      onChange={(e) => setCouponData({ ...couponData, expiryDate: e.target.value })} 
                      required 
                    />
                  </div>
                  <button type="submit" className={style.saveBtn} disabled={actionLoading} style={{ marginTop: "10px" }}>
                    {actionLoading ? "Creating..." : "🚀 Launch Campaign"}
                  </button>
                </form>
              </div>

              {/* Right Column: Listing Table */}
              <div className={style.promoListSection} style={{ flex: "1.8", minWidth: "400px" }}>
                <h4>Active Campaigns</h4>
                <div className={style.tableWrapper} style={{ marginTop: "15px" }}>
                  <table className={style.menuTable}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Discount</th>
                        <th>Max Cap</th>
                        <th>Min Order</th>
                        <th>Expiry</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {couponsList.map((coupon, idx) => (
                        <tr key={idx}>
                          <td><strong style={{ color: "#f97316" }}>{coupon.code}</strong></td>
                          <td>{coupon.discountPercentage}% OFF</td>
                          <td>{toINR(coupon.maxDiscountAmount)}</td>
                          <td>{toINR(coupon.minOrderValue)}</td>
                          <td>{new Date(coupon.expiryDate).toLocaleDateString()}</td>
                          <td>
                            <button 
                              className={style.deleteBtn} 
                              onClick={() => handleDeleteCoupon(coupon._id)}
                            >
                              End 🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                      {couponsList.length === 0 && (
                        <tr>
                          <td colSpan="6" className={style.emptyCell} style={{ textAlign: "center", padding: "30px 10px" }}>
                            No active coupons. Create one to drive restaurant sales!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Revenue & Analytics */}
        {activeTab === "revenue" && onboarded && (
          <div className={style.card}>
            <h3>📊 Restaurant Revenue & Analytics</h3>
            <p className={style.subText}>Monitor Gross Sales, track commission breakdowns, and evaluate overall financial performance.</p>
            
            {/* Metrics cards grid */}
            {(() => {
              const paidOrders = ordersList.filter(o => o.payment || o.status === 'Delivered');
              const grossSales = paidOrders.reduce((sum, o) => sum + o.amount, 0);
              const commission = grossSales * 0.15;
              const netEarnings = grossSales - commission;

              return (
                <>
                  <div className={style.metricsGrid} style={{ display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
                    <div className={style.metricCard} style={{ flex: "1", minWidth: "200px", background: "linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(234, 88, 12, 0.15))", border: "1px solid rgba(249, 115, 22, 0.2)", padding: "20px", borderRadius: "14px" }}>
                      <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#a8a29e", letterSpacing: "0.05em", fontWeight: "600" }}>Total Transactions</span>
                      <h2 style={{ fontSize: "2rem", margin: "10px 0 5px 0", color: "#f97316" }}>{paidOrders.length} Paid</h2>
                      <span style={{ fontSize: "12px", color: "#a8a29e" }}>From {ordersList.length} orders total</span>
                    </div>

                    <div className={style.metricCard} style={{ flex: "1", minWidth: "200px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "20px", borderRadius: "14px" }}>
                      <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#a8a29e", letterSpacing: "0.05em", fontWeight: "600" }}>Gross Sales</span>
                      <h2 style={{ fontSize: "2rem", margin: "10px 0 5px 0" }}>{toINR(grossSales)}</h2>
                      <span style={{ fontSize: "12px", color: "#22c55e" }}>🟢 100% Secure via Stripe</span>
                    </div>

                    <div className={style.metricCard} style={{ flex: "1", minWidth: "200px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "20px", borderRadius: "14px" }}>
                      <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#ef4444", letterSpacing: "0.05em", fontWeight: "600" }}>Platform Fee (15%)</span>
                      <h2 style={{ fontSize: "2rem", margin: "10px 0 5px 0", color: "#f87171" }}>-{toINR(commission)}</h2>
                      <span style={{ fontSize: "12px", color: "#a8a29e" }}>Flat service charge</span>
                    </div>

                    <div className={style.metricCard} style={{ flex: "1", minWidth: "200px", background: "linear-gradient(135deg, rgba(34, 197, 94, 0.06), rgba(34, 197, 94, 0.12))", border: "1px solid rgba(34, 197, 94, 0.15)", padding: "20px", borderRadius: "14px" }}>
                      <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#4ade80", letterSpacing: "0.05em", fontWeight: "600" }}>Net Kitchen Earnings</span>
                      <h2 style={{ fontSize: "2rem", margin: "10px 0 5px 0", color: "#22c55e" }}>{toINR(netEarnings)}</h2>
                      <span style={{ fontSize: "12px", color: "#4ade80" }}>Direct payout balance</span>
                    </div>
                  </div>

                  {/* Graphical sales trend using elegant self-scaling SVG */}
                  <div style={{ marginTop: "35px", background: "rgba(255, 255, 255, 0.02)", padding: "24px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <h4>📈 Sales Trend (Last 5 Payouts)</h4>
                    {paidOrders.length === 0 ? (
                      <p style={{ color: "#a8a29e", textAlign: "center", padding: "40px 10px", fontSize: "14px" }}>No paid sales recorded yet to render analytics trends.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
                        <svg width="100%" height="220" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                          {/* Grid Lines */}
                          <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 4" />
                          <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 4" />
                          <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 4" />
                          <line x1="0" y1="190" x2="500" y2="190" stroke="rgba(255, 255, 255, 0.2)" />

                          {(() => {
                            const lastFive = paidOrders.slice(-5);
                            const maxVal = Math.max(...lastFive.map(o => o.amount), 50);
                            const spacing = 500 / (lastFive.length || 1);

                            return lastFive.map((order, index) => {
                              const barHeight = (order.amount / maxVal) * 150;
                              const x = index * spacing + spacing / 2 - 20;
                              const y = 190 - barHeight;

                              return (
                                <g key={index}>
                                  {/* Bar with gradient accent */}
                                  <rect 
                                    x={x} 
                                    y={y} 
                                    width="40" 
                                    height={barHeight} 
                                    fill="url(#barGradient)" 
                                    rx="6" 
                                    style={{ transition: "all 0.3s" }}
                                  />
                                  {/* Tooltip Label */}
                                  <text x={x + 20} y={y - 8} fill="#f97316" fontSize="10.5px" textAnchor="middle" fontWeight="bold">
                                    {toINR(order.amount)}
                                  </text>
                                  {/* Date Label */}
                                  <text x={x + 20} y="205" fill="#a8a29e" fontSize="9.5px" textAnchor="middle">
                                    {order._id.slice(-6).toUpperCase()}
                                  </text>
                                </g>
                              );
                            });
                          })()}

                          {/* Define SVG Gradient */}
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f97316" stopOpacity="0.85" />
                              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.3" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Transaction history log */}
                  <div style={{ marginTop: "35px" }}>
                    <h4>🧾 Payout & Transaction History Ledger</h4>
                    <div className={style.tableWrapper} style={{ marginTop: "15px" }}>
                      <table className={style.menuTable}>
                        <thead>
                          <tr>
                            <th>Order Reference</th>
                            <th>Date Captured</th>
                            <th>Gross Sales</th>
                            <th>QuickBite Fee (15%)</th>
                            <th>Your Net Earnings</th>
                            <th>Stripe Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paidOrders.map((order, idx) => (
                            <tr key={idx}>
                              <td><strong>#{order._id.slice(-8)}</strong></td>
                              <td>{new Date(order.date).toLocaleDateString()} {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                              <td>{toINR(order.amount)}</td>
                              <td style={{ color: "#f87171" }}>-{toINR(order.amount * 0.15)}</td>
                              <td style={{ color: "#22c55e", fontWeight: "600" }}>+{toINR(order.amount * 0.85)}</td>
                              <td><span className={style.statusBadge} style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", padding: "4px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "600" }}>SETTLED ✓</span></td>
                            </tr>
                          ))}
                          {paidOrders.length === 0 && (
                            <tr>
                              <td colSpan="6" className={style.emptyCell} style={{ textAlign: "center", padding: "30px 10px" }}>
                                No transactions settled. Payout statistics will generate dynamically as Stripe invoices are confirmed.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
};

export default VendorDashboard;
