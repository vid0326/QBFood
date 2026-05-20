import { createContext, useEffect, useState } from "react";
import { toast } from 'react-toastify';
export const StoreContext = createContext(null);
import axios from "axios";

const StoreContextProvider = (props) => {
  const [cartItem, setCartItems] = useState({});
  const URl = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const [token , setToken] = useState("")
  const [role, setRole] = useState(localStorage.getItem("role") || "customer")
  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem("userData")) || null)
  const [food_list,setFoodList] = useState([])
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState("All");
  const [maxDistance, setMaxDistance] = useState(10);
  const [priceRange, setPriceRange] = useState([0, 500]); // [min, max] in $

  // Clear coupon if cart goes to 0
  useEffect(() => {
    if (getTotalCartAmount() === 0) {
      setDiscountAmount(0);
      setAppliedCouponCode("");
    }
  }, [cartItem]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userData");
    localStorage.removeItem("refreshToken");
    setToken("");
    setRole("customer");
    setUserData(null);
  };

  const isTokenExpired = (tokenString) => {
    if (!tokenString) return true;
    try {
      const base64Url = tokenString.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(jsonPayload);
      if (!decoded.exp) return false;
      return (decoded.exp * 1000) < (Date.now() + 30000); // 30s buffer before exact expiry
    } catch (e) {
      return true;
    }
  };

  const refreshSession = async () => {
    const currentRefreshToken = localStorage.getItem("refreshToken");
    if (!currentRefreshToken) return false;
    try {
      const response = await axios.post(URl + "/api/user/refresh", { refreshToken: currentRefreshToken });
      if (response.data.success) {
        const newToken = response.data.token;
        const newRefreshToken = response.data.refreshToken;
        setToken(newToken);
        localStorage.setItem("token", newToken);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }
        return newToken;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      logout();
      return false;
    }
  };

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(async (config) => {
      // Prevent infinite recursion loop on token refresh requests
      if (config.url && config.url.includes("/api/user/refresh")) {
        return config;
      }
      let activeToken = localStorage.getItem("token");
      if (activeToken && isTokenExpired(activeToken)) {
        const refreshed = await refreshSession();
        if (refreshed) {
          config.headers.token = refreshed;
        }
      } else if (activeToken) {
        config.headers.token = activeToken;
      }
      return config;
    }, (error) => {
      return Promise.reject(error);
    });

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  const addToCart =  async (itemId) => {
    if (!token) {
      toast.error("Please sign in to add items to your cart! 🍕");
      return;
    }

    if (!cartItem[itemId]) {
      setCartItems((prev) => ({ ...prev, [itemId]: 1 }));
    } else {
      setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
    }

    await axios.post(URl+"/api/cart/add", {itemId}, {headers: {token}})
  };

  const removeFromCart = async (itemId) => {
    if (!token) return;

    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));
    await axios.post(URl+"/api/cart/remove", {itemId}, {headers: {token}})
  };

  const getTotalCartAmount = () => {
    let totalAmount = 0;
    for (const item in cartItem) {
      if (cartItem[item] > 0) {
        let itemInfo = food_list.find((product) => product._id === item);
        if (itemInfo) {
          totalAmount += itemInfo.price * cartItem[item];
        }
      }
    }
    return totalAmount;
  };

  // P0 #6: Clear cart after successful payment
  const clearCart = async () => {
    setCartItems({});
    if (token) {
      try {
        await axios.post(URl + "/api/cart/clear", {}, { headers: { token } });
      } catch (e) { console.error("Cart clear failed", e); }
    }
  };

  const fetchFoodList = async ()=>{
    const response = await axios.get(URl+"/api/food/list")
    setFoodList(response.data.data)
  }

  const loadcartData = async (token) => {
    try {
      const response = await axios.post(URl+"/api/cart/get",{}, {headers: {token}})
      if (response.data.success) {
        setCartItems(response.data.cartData)
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userData");
        setToken("");
        setRole("customer");
        setUserData(null);
      }
    } catch (error) {
      console.log("Error loading cart data, clearing token", error);
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userData");
      setToken("");
      setRole("customer");
      setUserData(null);
    }
  }

  // To not logout When refreshed
  useEffect(()=>{
    async function loaddata () {
      await fetchFoodList()
      if(localStorage.getItem("token")){
        setToken(localStorage.getItem("token"))
        await loadcartData(localStorage.getItem("token"));
      }
    }
    loaddata()
  },[])

  const contextValue = {
    food_list,
    cartItem,
    setCartItems,
    addToCart,
    removeFromCart,
    getTotalCartAmount,
    URl,
    token,
    setToken,
    role,
    setRole,
    userData,
    setUserData,
    logout,
    clearCart,
    discountAmount,
    setDiscountAmount,
    appliedCouponCode,
    setAppliedCouponCode,
    searchQuery,
    setSearchQuery,
    dietaryFilter,
    setDietaryFilter,
    maxDistance,
    setMaxDistance,
    priceRange,
    setPriceRange
  };



  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
