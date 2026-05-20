import React, { useContext, useState } from "react";
import style from "./loginPopUp.module.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { toast } from "react-toastify";

const LoginPopUp = ({ setShowLogin }) => {
  const [currState, setCurrState] = useState("Login");
  const [role, setRole] = useState("customer"); // 'customer', 'restaurant_owner', 'delivery'
  const { URl, setToken, setRole: setContextRole, setUserData } = useContext(StoreContext);

  const [data, setData] = useState({ 
    name: "", 
    email: "", 
    password: "",
    vehicleDetails: "Scooter", // default
    licensePlate: ""
  });

  const onChangehandler = (event) => {
    const { name, value } = event.target;
    setData(d => ({ ...d, [name]: value }));
  };

  const onLogin = async (event) => {
    event.preventDefault();
    const endpoint = currState === "Login" ? "/api/user/login" : "/api/user/register";
    
    // Package payload with selected role
    const payload = { 
      ...data, 
      role 
    };

    const response = await axios.post(URl + endpoint, payload);
    if (response.data.success) {
      const userToken = response.data.token;
      const userRole = response.data.user.role;
      const userObj = response.data.user;

      setToken(userToken);
      setContextRole(userRole);
      setUserData(userObj);

      localStorage.setItem("token", userToken);
      localStorage.setItem("role", userRole);
      localStorage.setItem("userData", JSON.stringify(userObj));
      if (response.data.refreshToken) {
        localStorage.setItem("refreshToken", response.data.refreshToken);
      }
      
      // Perform redirect based on role
      if (userRole === "restaurant_owner") {
        setShowLogin(false);
        // Redirect directly to the integrated Vendor Dashboard inside Frontend
        window.location.href = "/vendor/dashboard";
      } else if (userRole === "delivery") {
        setShowLogin(false);
        // Redirect to specialized delivery dashboard inside current app
        window.location.href = "/delivery/dashboard";
      } else {
        setShowLogin(false);
      }
    } else {
      toast.error(response.data.message || "Authentication failed. Try again.");
    }
  };

  return (
    <div className={style.LoginPopUp}>
      <form onSubmit={onLogin} className={style.LoginPopUpContainer}>
        <div className={style.LoginPopUpTitle}>
          <h2>{currState === "Login" ? "Welcome back 👋" : "Create account"}</h2>
          <div className={style.closeBtn} onClick={() => setShowLogin(false)}>
            <img src={assets.cross_icon} alt="Close" />
          </div>
        </div>

        {/* Premium 3-Option Role Selector Slider */}
        <div className={style.roleSelector}>
          <div 
            className={`${style.roleTab} ${role === "customer" ? style.roleTabActiveCustomer : ""}`}
            onClick={() => setRole("customer")}
          >
            Customer
          </div>
          <div 
            className={`${style.roleTab} ${role === "restaurant_owner" ? style.roleTabActiveOwner : ""}`}
            onClick={() => setRole("restaurant_owner")}
          >
            Restaurant Owner
          </div>
          <div 
            className={`${style.roleTab} ${role === "delivery" ? style.roleTabActiveDelivery : ""}`}
            onClick={() => setRole("delivery")}
          >
            Delivery Agent
          </div>
        </div>

        <div className={style.LoginPopUpInputs}>
          {currState !== "Login" && (
            <input type="text" name="name" onChange={onChangehandler} value={data.name} placeholder="Your full name" required />
          )}
          <input type="email" name="email" onChange={onChangehandler} value={data.email} placeholder="Email address" required />
          <input type="password" name="password" onChange={onChangehandler} value={data.password} placeholder="Password" required />

          {/* Dynamic Inputs specifically for Delivery Agent signup */}
          {currState !== "Login" && role === "delivery" && (
            <>
              <div className={style.inputGroup}>
                <label>Vehicle Type</label>
                <select 
                  name="vehicleDetails" 
                  onChange={onChangehandler} 
                  value={data.vehicleDetails}
                  style={{
                    padding: "13px 16px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "#f1f5f9",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    outline: "none",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "15px"
                  }}
                >
                  <option value="Scooter" style={{background: "#13131c"}}>Scooter</option>
                  <option value="Motorcycle" style={{background: "#13131c"}}>Motorcycle</option>
                  <option value="Bicycle" style={{background: "#13131c"}}>Bicycle</option>
                  <option value="Car" style={{background: "#13131c"}}>Car</option>
                </select>
              </div>
              <input 
                type="text" 
                name="licensePlate" 
                onChange={onChangehandler} 
                value={data.licensePlate} 
                placeholder="License Plate Number" 
                required 
              />
            </>
          )}
        </div>

        <button type="submit">
          {currState === "Login" ? "Sign In" : "Create Account"}
        </button>

        <div className={style.LoginPopUpConditon}>
          <input type="checkbox" id="terms" required />
          <p>I agree to the <span>terms & conditions</span></p>
        </div>

        {currState === "Login"
          ? <p>New here? <span onClick={() => setCurrState("Sign Up")}>Create an account</span></p>
          : <p>Already have an account? <span onClick={() => setCurrState("Login")}>Sign in</span></p>
        }
      </form>
    </div>
  );
};

export default LoginPopUp;
