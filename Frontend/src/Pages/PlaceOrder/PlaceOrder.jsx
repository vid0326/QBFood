import { useContext, useEffect, useState } from 'react'
import style from './placeorder.module.css'
import style1 from '../Cart/cart.module.css'
import { StoreContext } from '../../context/StoreContext'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import AddressSelector from '../../components/AddressSelector/AddressSelector'
import { toast } from 'react-toastify'
import { toINR } from '../../utils/currency'

const PlaceOrder = () => {
  const { getTotalCartAmount, token, food_list, cartItem, URl, userData, discountAmount, appliedCouponCode } = useContext(StoreContext)
  const navigate = useNavigate()

  const [selectedAddress, setSelectedAddress] = useState(null)
  const [recipientName, setRecipientName] = useState(userData?.name || "")
  const [phone, setPhone] = useState("")

  // Set default active address if available on mount
  useEffect(() => {
    if (userData?.addresses && userData.addresses.length > 0) {
      setSelectedAddress(userData.addresses[0])
    }
  }, [userData])

  const placeOrder = async (event) => {
    event.preventDefault();

    // --- P1 #18: Client-side form validation ---
    if (!recipientName || recipientName.trim().length < 2) {
      toast.error("Please enter a valid recipient name (at least 2 characters).");
      return;
    }
    if (!phone || !/^[6-9]\d{9}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Enter a valid 10-digit Indian mobile number starting with 6-9. 📞");
      return;
    }
    if (!selectedAddress) {
      toast.warn("Please select or add a delivery address! 📍");
      return;
    }
    if (!selectedAddress.street || !selectedAddress.city || !selectedAddress.state) {
      toast.warn("Selected address is incomplete. Please add street, city and state.");
      return;
    }

    let orderItems = [];
    food_list.map((item) => {
      if (cartItem[item._id] > 0) {
        let itemInfo = { ...item };
        itemInfo["quantity"] = cartItem[item._id]
        orderItems.push(itemInfo)
      }
    })
    
    // Package address parameters matching what the orderModel accepts
    const addressData = {
      firstName: recipientName.split(" ")[0] || "Customer",
      lastName: recipientName.split(" ").slice(1).join(" ") || "User",
      email: userData?.email || "customer@quickbite.com",
      street: selectedAddress.street,
      city: selectedAddress.city,
      state: selectedAddress.state,
      zipcode: selectedAddress.zipCode,
      country: selectedAddress.country,
      phone: phone
    };

    let orderData = {
      address: addressData,
      items: orderItems,
      amount: Math.max(0, getTotalCartAmount() + 5 - discountAmount),
      couponCode: appliedCouponCode || null
    }

    try {
      let response = await axios.post(URl + "/api/order/place", orderData, { headers: { token } })
      if (response.data.success) {
        const { session_url } = response.data;
        // If backend returns a Stripe hosted URL, use it; otherwise navigate to our embedded checkout
        if (session_url && session_url.startsWith("https://checkout.stripe.com")) {
          window.location.replace(session_url);
        } else {
          // Extract orderId from the sandbox URL params if backend returned /stripe-sandbox
          const urlParams = new URL(session_url, window.location.origin);
          const orderId = urlParams.searchParams.get("orderId");
          const amount = Math.max(0, getTotalCartAmount() + 5 - discountAmount);
          navigate(`/stripe-sandbox?orderId=${orderId}&amount=${amount}`);
        }
      } else {
        console.log(response.data.message)
        toast.error("Failed to place order. Please try again.")
      }
    } catch (err) {
      console.error(err);
      toast.error("Error placing order. Please try again.");
    }
  }

  useEffect(() => {
    if (!token) {
      navigate('/cart')
    } else if (getTotalCartAmount() === 0) {
      navigate("/cart")
    } 
  }, [token])

  return (
    <form onSubmit={placeOrder} className={style.placeOrder}>
      <div className={style.placeOrderLeft}>
        <p className={style.title}>Checkout Details 💳</p>
        
        {/* Recipient Details */}
        <div className={style.contactSection}>
          <h3>Recipient Contact Info</h3>
          <div className={style.multiInputs}>
            <div className={style.inputGroup}>
              <label>Full Name</label>
              <input 
                type="text" 
                value={recipientName} 
                onChange={(e) => setRecipientName(e.target.value)} 
                placeholder="Recipient Name" 
                required 
              />
            </div>
            <div className={style.inputGroup}>
              <label>Contact Phone</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="Phone Number" 
                required 
              />
            </div>
          </div>
        </div>

        {/* Modular, geolocated Address Selector */}
        <AddressSelector 
          onSelectAddress={setSelectedAddress} 
          selectedAddress={selectedAddress} 
        />
      </div>

      <div className={style.placeOrderRight}>
        <div className={style1.CartTotal}>
          <h2>Cart Total</h2>
          <div>
            <div className={style1.CartTotalDetails}>
              <p>Subtotal</p>
              <p>{toINR(getTotalCartAmount())}</p>
            </div>
            <hr />
            <div className={style1.CartTotalDetails}>
              <p>Delivery Fee</p>
              <p>{toINR(getTotalCartAmount() === 0 ? 0 : 5)}</p>
            </div>
            <hr />
            {discountAmount > 0 && (
              <>
                <div className={style1.CartTotalDetails} style={{ color: "#22c55e", fontWeight: "600" }}>
                  <p>Discount ({appliedCouponCode})</p>
                  <p>-{toINR(discountAmount)}</p>
                </div>
                <hr />
              </>
            )}
            <div className={style1.CartTotalDetails}>
              <b>Total</b>
              <b>{toINR(getTotalCartAmount() === 0 ? 0 : Math.max(0, getTotalCartAmount() + 5 - discountAmount))}</b>
            </div>
          </div>
          <button type='submit'>Proceed To Payment</button>
        </div>
      </div>
    </form>
  )
}

export default PlaceOrder