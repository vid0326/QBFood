import { useState, useContext } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Navbar from './components/Navbar/Navbar'
import { Route, Routes, Navigate } from 'react-router-dom'
import Home from './Pages/Home/Home'
import Cart from './Pages/Cart/Cart'
import PlaceOrder from './Pages/PlaceOrder/PlaceOrder'
import Footer from './components/Footer/Footer'
import LoginPopUp from './components/Login/LoginPopUp'
import Verify from './Pages/Verify/Verify'
import MyOrders from './Pages/Orders/MyOrders'
import DeliveryDashboard from './Pages/DeliveryDashboard/DeliveryDashboard'
import VendorDashboard from './Pages/VendorDashboard/VendorDashboard'
import FoodDetail from './Pages/FoodDetail/FoodDetail'
import ProfilePopup from './components/ProfilePopup/ProfilePopup'
import StripeSandbox from './Pages/StripeSandbox/StripeSandbox'
import NotFound from './Pages/NotFound/NotFound'
import SearchPage from './Pages/SearchPage/SearchPage'
import RestaurantPage from './Pages/RestaurantPage/RestaurantPage'
import { StoreContext } from './context/StoreContext'
import { assets } from './assets/assets'

const App = () => {
  const [showLogin, setShowLogin] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const { token, role, setToken, setRole } = useContext(StoreContext)

  // Enforce exclusive vendor space bypassing customer portal
  if (token && role === "restaurant_owner") {
    return (
      <div style={{ background: "#0c0c14", minHeight: "100vh", color: "#f1f5f9" }}>
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.01)",
          backdropFilter: "blur(10px)"
        }}>
          <img 
            src={assets.logo} 
            style={{ height: "40px", cursor: "pointer" }} 
            onClick={() => window.location.href = "/"} 
            alt="QuickBite Logo" 
          />
          <button 
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("role");
              localStorage.removeItem("userData");
              localStorage.removeItem("refreshToken");
              setToken("");
              setRole("customer");
              window.location.href = "/";
            }}
            style={{
              padding: "10px 20px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              borderRadius: "10px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Logout Session 🚪
          </button>
        </header>
        <VendorDashboard />
      </div>
    )
  }

  // Enforce exclusive delivery agent space bypassing customer portal
  if (token && role === "delivery") {
    return (
      <div style={{ background: "#0c0c14", minHeight: "100vh", color: "#f1f5f9" }}>
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.01)",
          backdropFilter: "blur(10px)"
        }}>
          <img 
            src={assets.logo} 
            style={{ height: "40px", cursor: "pointer" }} 
            onClick={() => window.location.href = "/"} 
            alt="QuickBite Logo" 
          />
          <button 
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("role");
              localStorage.removeItem("userData");
              localStorage.removeItem("refreshToken");
              setToken("");
              setRole("customer");
              window.location.href = "/";
            }}
            style={{
              padding: "10px 20px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              borderRadius: "10px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Logout Session 🚪
          </button>
        </header>
        <DeliveryDashboard />
      </div>
    )
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="dark"
        toastStyle={{ fontFamily: "'Inter', sans-serif", background: "#16161f", border: "1px solid rgba(255,255,255,0.08)" }}
      />
      {showLogin && <LoginPopUp setShowLogin={setShowLogin} />}
      {showProfile && <ProfilePopup setShowProfile={setShowProfile} />}
      <Navbar setShowLogin={setShowLogin} setShowProfile={setShowProfile} />
      <main className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          
          {/* #30: Advanced Search */}
          <Route path="/search" element={<SearchPage />} />
          {/* #34: Restaurant Profile */}
          <Route path="/restaurant/:id" element={<RestaurantPage />} />

          {/* Protected Client Portal Routes */}
          <Route path="/cart" element={token ? <Cart /> : <Navigate to="/" replace />} />
          <Route path="/placeorder" element={token ? <PlaceOrder /> : <Navigate to="/" replace />} />
          <Route path='/verify' element={token ? <Verify /> : <Navigate to="/" replace />} />
          <Route path="/myorders" element={token ? <MyOrders /> : <Navigate to="/" replace />} />
          <Route path="/delivery/dashboard" element={token ? <DeliveryDashboard /> : <Navigate to="/" replace />} />
          <Route path="/vendor/dashboard" element={token ? <VendorDashboard /> : <Navigate to="/" replace />} />
          <Route path="/stripe-sandbox" element={token ? <StripeSandbox /> : <Navigate to="/" replace />} />
          <Route path="/food-detail/:id" element={<FoodDetail />} />
          
          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}

export default App