import { useContext, useState, useEffect } from "react";
import style from "../Navbar/navbar.module.css";
import { assets } from "../../assets/assets";
import { Link, useNavigate } from "react-router-dom";
import { StoreContext } from "../../context/StoreContext";
import { toast } from "react-toastify";
import NotificationBell from "../NotificationBell/NotificationBell";

const Navbar = ({ setShowLogin, setShowProfile }) => {
  const [menu, setMenu] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);

  const { 
    getTotalCartAmount, 
    token, 
    setToken, 
    userData, 
    URl, 
    role,
    setSearchQuery,
    dietaryFilter,
    setDietaryFilter,
    maxDistance,
    setMaxDistance,
    priceRange,
    setPriceRange
  } = useContext(StoreContext);
  
  const navigate = useNavigate();

  const [localSearch, setLocalSearch] = useState("");
  const [showDrawer, setShowDrawer] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');

  // #27: Dark/Light toggle
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Debounce search keystrokes by 300ms
  useEffect(() => {
    const delay = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(delay);
  }, [localSearch]);



  // Simpler: bounce when getTotalCartAmount changes
  const cartTotal = getTotalCartAmount();
  const prevCartRef = useState(cartTotal);
  useEffect(() => {
    if (cartTotal > 0) {
      setCartBounce(true);
      const t = setTimeout(() => setCartBounce(false), 500);
      return () => clearTimeout(t);
    }
  }, [cartTotal]);

  const handleCartClick = (e) => {
    if (!token) {
      e.preventDefault();
      toast.warn("Login first to access your cart! 🍔", { icon: "🔒" });
      setShowLogin(true);
    }
  };

  const Logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userData");
    localStorage.removeItem("refreshToken");
    setToken("");
    navigate("/");
  };

  const handleNavClick = (name) => {
    setMenu(name);
    setMobileOpen(false);
  };

  return (
    <header className={style.Navbar}>
      <Link to="/" className={style.logoLink}>
        <img src={assets.logo} className={style.logo} alt="QuickBite logo" />
      </Link>

      {/* Desktop Navigation */}
      <nav className={style.navbarMenu}>
        <Link to="/" className={menu === "home" ? style.active : ""} onClick={() => handleNavClick("home")}>Home</Link>
        <a href="#ExploreMenu" className={menu === "menu" ? style.active : ""} onClick={() => handleNavClick("menu")}>Menu</a>
        <Link to="/search" className={menu === "search" ? style.active : ""} onClick={() => handleNavClick("search")}>🔍 Explore</Link>
        <a href="#Footer" className={menu === "contact-us" ? style.active : ""} onClick={() => handleNavClick("contact-us")}>Contact</a>
        {token && role === "customer" && (
          <Link
            to="/myorders"
            className={menu === "orders" ? style.active : ""}
            onClick={() => handleNavClick("orders")}
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            My Orders
          </Link>
        )}
      </nav>

      <div className={style.navbarRight}>
        {/* Debounced Expandable Search Input with Focus Glow */}
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            background: "rgba(255, 255, 255, 0.04)", 
            padding: "6px 14px", 
            borderRadius: "20px", 
            border: searchFocused ? "1px solid rgba(249, 115, 22, 0.6)" : "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: searchFocused ? "0 0 10px rgba(249, 115, 22, 0.15)" : "none",
            transition: "all 0.3s ease"
          }}
        >
          <input 
            type="text" 
            placeholder="Search dishes..." 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' && localSearch.trim()) navigate(`/search?q=${encodeURIComponent(localSearch.trim())}`); }}
            style={{ 
              background: "transparent", 
              border: "none", 
              outline: "none", 
              color: "#fff", 
              fontSize: "13px", 
              width: searchFocused || localSearch ? "150px" : "90px",
              transition: "width 0.3s ease"
            }}
          />
          <img
            src={assets.search_icon}
            className={style.iconBtn}
            alt="search"
            style={{ cursor: "pointer", width: "16px", opacity: searchFocused ? 1 : 0.6 }}
            onClick={() => { if (localSearch.trim()) navigate(`/search?q=${encodeURIComponent(localSearch.trim())}`); }}
          />
        </div>

        {/* Filters Drawer Trigger */}
        <button 
          onClick={() => setShowDrawer(true)}
          style={{ 
            background: "rgba(249, 115, 22, 0.1)", 
            border: "1px solid rgba(249, 115, 22, 0.2)", 
            borderRadius: "20px", 
            color: "#f97316", 
            padding: "6px 12px", 
            cursor: "pointer", 
            fontSize: "13px", 
            display: "flex", 
            alignItems: "center", 
            gap: "5px",
            fontWeight: "500",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(249, 115, 22, 0.18)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(249, 115, 22, 0.1)"}
        >
          ⚙️ Filters
        </button>

        <div className={`${style.searchIcon} ${cartBounce ? style.cartBounce : ''}`}>
          <Link to="/cart" aria-label="Cart" onClick={handleCartClick}>
            <img src={assets.basket_icon} className={style.iconBtn} alt="cart" />
          </Link>
          {getTotalCartAmount() > 0 && <span className={style.dot}></span>}
        </div>

        {/* #26: Notification Bell */}
        <NotificationBell />

        {/* #27: Dark/Light Toggle */}
        <button
          onClick={() => setIsDark(d => !d)}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '17px',
            transition: 'all 0.2s'
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {!token ? (
          <button className={style.signInBtn} onClick={() => setShowLogin(true)}>
            Sign in
          </button>
        ) : (
          <div className={style.navbarProfile}>
            <img 
              src={
                userData?.profilePic 
                  ? URl + "/images/" + userData.profilePic 
                  : assets.profile_icon
              } 
              alt="profile" 
              className={style.profileAvatar}
              onClick={() => setShowProfile(true)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(249, 115, 22, 0.3)",
                cursor: "pointer",
                transition: "border-color 0.2s"
              }}
            />
            <ul className={style.navProfileDropdown}>
              <li onClick={() => setShowProfile(true)}>
                <img src={assets.profile_icon} alt="" style={{filter: "brightness(0) invert(1)"}} />
                <p>Profile Settings</p>
              </li>
              <hr />
              {role === "restaurant_owner" ? (
                <>
                  <li onClick={() => navigate("/vendor/dashboard")}>
                    <img src={assets.bag_icon} alt="" />
                    <p>Vendor Dashboard</p>
                  </li>
                  <hr />
                </>
              ) : role === "delivery" ? (
                <>
                  <li onClick={() => navigate("/delivery/dashboard")}>
                    <img src={assets.bag_icon} alt="" style={{ transform: "rotate(-10deg)" }} />
                    <p>Driver Dashboard</p>
                  </li>
                  <hr />
                </>
              ) : (
                <>
                  <li onClick={() => navigate("/myorders")}>
                    <img src={assets.bag_icon} alt="" />
                    <p>Orders</p>
                  </li>
                  <hr />
                </>
              )}
              <li onClick={Logout}>
                <img src={assets.logout_icon} alt="" />
                <p>Logout</p>
              </li>
            </ul>
          </div>
        )}

        {/* Hamburger toggle */}
        <button
          className={style.hamburger}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={mobileOpen ? style.hamLineTop + " " + style.hamOpen : style.hamLineTop}></span>
          <span className={mobileOpen ? style.hamLineMid + " " + style.hamOpen : style.hamLineMid}></span>
          <span className={mobileOpen ? style.hamLineBot + " " + style.hamOpen : style.hamLineBot}></span>
        </button>
      </div>

      {/* Mobile Drawer */}
      <nav className={`${style.mobileMenu} ${mobileOpen ? style.mobileOpen : ""}`}>
        <Link to="/" className={menu === "home" ? style.active : ""} onClick={() => handleNavClick("home")}>Home</Link>
        <a href="#ExploreMenu" onClick={() => handleNavClick("menu")}>Menu</a>
        <a href="#Footer" onClick={() => handleNavClick("contact-us")}>Contact</a>
        {!token && (
          <button className={style.signInBtn} onClick={() => { setShowLogin(true); setMobileOpen(false); }}>
            Sign in
          </button>
        )}
      </nav>

      {/* Geofenced Sliding Filters Drawer Container */}
      {showDrawer && (
        <>
          {/* Backdrop Blur Dismissal Overlay */}
          <div 
            onClick={() => setShowDrawer(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(5px)",
              zIndex: 99998,
              animation: "fadeIn 0.2s ease"
            }}
          />

          <div 
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "320px",
              height: "100%",
              background: "linear-gradient(180deg, rgba(20, 20, 25, 0.98) 0%, rgba(10, 10, 15, 0.98) 100%)",
              backdropFilter: "blur(30px)",
              zIndex: 99999,
              boxShadow: "-15px 0 45px rgba(0,0,0,0.7)",
              padding: "35px 30px",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
              borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
              animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              color: "#fff"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#f97316", fontWeight: "700", letterSpacing: "-0.01em" }}>⚙️ Geofenced Filter Hub</h3>
              <span 
                onClick={() => setShowDrawer(false)}
                style={{ fontSize: "22px", cursor: "pointer", color: "#a8a29e", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#a8a29e"}
              >
                ✕
              </span>
            </div>
            
            <hr style={{ borderColor: "rgba(255,255,255,0.06)", margin: 0 }} />

            {/* Dietary selection badges */}
            <div>
              <h4 style={{ margin: "0 0 14px 0", fontSize: "11px", color: "#fb923c", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "700" }}>Dietary Specifications</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {["All", "Veg", "Vegan", "Gluten-Free"].map((diet) => {
                  const isActive = dietaryFilter === diet;
                  return (
                    <button
                      key={diet}
                      onClick={() => setDietaryFilter(diet)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: "1px solid",
                        borderColor: isActive ? "#f97316" : "rgba(255,255,255,0.08)",
                        background: isActive ? "linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.05) 100%)" : "rgba(255,255,255,0.02)",
                        color: isActive ? "#f97316" : "#d6d3d1",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        boxShadow: isActive ? "0 4px 12px rgba(249, 115, 22, 0.15)" : "none",
                        transition: "all 0.25s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      }}
                    >
                      {diet}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Geospatial Geofence Slider */}
            <div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "11px", color: "#fb923c", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "700" }}>Geospatial Geofence</h4>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#e7e5e4", marginBottom: "10px" }}>
                <span>Delivery Range Limit:</span>
                <strong style={{ color: "#f97316", fontSize: "14px" }}>{maxDistance} km</strong>
              </div>
              <input 
                type="range"
                min="2"
                max="30"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="custom-range-slider"
                style={{ width: "100%", cursor: "pointer" }}
              />
              <p style={{ fontSize: "12px", color: "#d6d3d1", marginTop: "12px", lineHeight: "1.5" }}>
                QuickBite's geofencing engine filters the available menus dynamically, showcasing only restaurants operating within {maxDistance}km of your address coordinates pin.
              </p>
            </div>

            {/* Price Range Filter */}
            <div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "11px", color: "#fb923c", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "700" }}>💸 Price Range</h4>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#e7e5e4", marginBottom: "10px" }}>
                <span>Up to:</span>
                <strong style={{ color: "#f97316", fontSize: "14px" }}>₹{(priceRange[1] * 95).toLocaleString('en-IN')}</strong>
              </div>
              <input 
                type="range"
                min="0"
                max="500"
                step="5"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="custom-range-slider"
                style={{ width: "100%", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#57534e", marginTop: "6px" }}>
                <span>₹0</span><span>₹{(500 * 95).toLocaleString('en-IN')}</span>
              </div>
              {priceRange[1] < 500 && (
                <button
                  onClick={() => setPriceRange([0, 500])}
                  style={{ marginTop: "8px", fontSize: "11px", background: "none", border: "none", color: "#f97316", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  Reset price filter
                </button>
              )}
            </div>

            <button
              onClick={() => setShowDrawer(false)}
              style={{
                marginTop: "auto",
                padding: "12px 24px",
                background: "linear-gradient(90deg, #f97316, #ea580c)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                boxShadow: "0 4px 18px rgba(249, 115, 22, 0.35)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              Apply Filters ✓
            </button>
          </div>

          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .custom-range-slider {
              -webkit-appearance: none;
              width: 100%;
              height: 6px;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.1);
              outline: none;
              transition: background 0.3s;
            }
            .custom-range-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #f97316;
              box-shadow: 0 0 10px rgba(249, 115, 22, 0.6);
              cursor: pointer;
              transition: transform 0.1s, background-color 0.2s;
            }
            .custom-range-slider::-webkit-slider-thumb:hover {
              transform: scale(1.25);
              background: #fb923c;
            }
          `}</style>
        </>
      )}
    </header>
  );
};

export default Navbar;
