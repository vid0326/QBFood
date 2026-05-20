import React, { useContext, useEffect, useState } from 'react';
import styles from './verify.module.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import axios from 'axios';

const Verify = () => {
    const [searchParams] = useSearchParams();
    const success = searchParams.get("success");
    const orderId = searchParams.get("orderId");
    const { URl, clearCart, setDiscountAmount, setAppliedCouponCode } = useContext(StoreContext);
    const navigate = useNavigate();

    // States: 'verifying', 'success', 'failed'
    const [paymentStatus, setPaymentStatus] = useState('verifying');
    const [statusMessage, setStatusMessage] = useState('Verifying your Stripe session signature...');

    const verifyPayment = async () => {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const response = await axios.post(URl + "/api/order/verify", { success, orderId });
            if (response.data.success) {
                // P0 #6: wipe cart + coupon on successful payment
                await clearCart();
                setDiscountAmount(0);
                setAppliedCouponCode("");
                setPaymentStatus('success');
                // Auto-navigate to order tracking after 2.5s so the user sees the success screen
                setTimeout(() => navigate('/myorders'), 2500);
            } else {
                setPaymentStatus('failed');
            }
        } catch (error) {
            console.error("Payment verification failed", error);
            setPaymentStatus('failed');
        }
    };

    useEffect(() => {
        verifyPayment();
    }, []);

    if (paymentStatus === 'verifying') {
        return (
            <div className={styles.verifyContainer}>
                <div className={styles.loaderCard}>
                    <div className={styles.spinner}></div>
                    <h2>Securing Payment Hash</h2>
                    <p>{statusMessage}</p>
                    <span className={styles.secureBadge}>🔒 Secure SSL Connection</span>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'success') {
        return (
            <div className={styles.verifyContainer}>
                <div className={`${styles.statusCard} ${styles.successCard}`}>
                    <div className={styles.iconCircleSuccess}>
                        <span className={styles.checkmark}>✓</span>
                    </div>
                    <h1>Order Confirmed! 🎉</h1>
                    <p className={styles.orderIdLabel}>Stripe Transaction: <span>#{orderId?.slice(-8).toUpperCase()}</span></p>
                    <div className={styles.divider}></div>
                    <p className={styles.statusDescription}>
                        Your local Stripe sandbox payment was successfully authorized. The restaurant is preparing your culinary order, and a delivery agent has been matched to your geofence drop-off sector.
                    </p>
                    
                    <div className={styles.buttonContainer}>
                        <button 
                            className={styles.trackBtn} 
                            onClick={() => navigate("/myorders")}
                        >
                            🛵 Track Order Live
                        </button>
                        <button 
                            className={styles.homeBtn} 
                            onClick={() => navigate("/")}
                        >
                            🍔 Order More Food
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Failed State
    return (
        <div className={styles.verifyContainer}>
            <div className={`${styles.statusCard} ${styles.failedCard}`}>
                <div className={styles.iconCircleFailed}>
                    <span className={styles.crossmark}>✕</span>
                </div>
                <h1>Transaction Rejected</h1>
                <p className={styles.orderIdLabel}>Session Reference: <span>#{orderId?.slice(-8).toUpperCase()}</span></p>
                <div className={styles.divider}></div>
                <p className={styles.statusDescription}>
                    Stripe local sandbox nodes returned a checkout authorization failure. Don't worry, your payment has not been processed and your cart items remain completely preserved.
                </p>
                
                <div className={styles.buttonContainer}>
                    <button 
                        className={styles.retryBtn} 
                        onClick={() => navigate("/cart")}
                    >
                        🔄 Retry Payment (Back to Cart)
                    </button>
                    <button 
                        className={styles.homeBtn} 
                        onClick={() => navigate("/")}
                    >
                        🏠 Return to Homepage
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Verify;
