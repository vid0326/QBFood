import React, { useState, useEffect, useContext } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import styles from './stripeSandbox.module.css';

// ─── Stripe publishable key ────────────────────────────────────────────────
// Replace with your own from https://dashboard.stripe.com/test/apikeys
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_YOUR_PUBLISHABLE_KEY";
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// ─── Inner checkout form (uses Stripe hooks, must be inside <Elements>) ────
const CheckoutForm = ({ orderId, amount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMsg('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL for redirect-based payment methods (3D Secure, etc.)
        return_url: `${window.location.origin}/verify?success=true&orderId=${orderId}`,
      },
      redirect: 'if_required', // Only redirect when necessary (e.g. 3DS)
    });

    if (error) {
      setErrorMsg(error.message);
      toast.error(error.message);
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast.success('Payment authorized! Confirming your order... 🎉');
      navigate(`/verify?success=true&orderId=${orderId}`);
    } else {
      setErrorMsg('Payment failed. Please try again.');
      toast.error('Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.paymentForm}>
      <h2>Complete Payment</h2>
      <p className={styles.description}>
        Order <strong>#{orderId?.slice(-6).toUpperCase()}</strong> · Total: <strong>₹{parseFloat(amount).toFixed(0)}</strong>
        <span className={styles.testHint}> (Test mode: use card 4242 4242 4242 4242)</span>
      </p>

      <div className={styles.stripeElementWrapper}>
        <PaymentElement
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: { address: { country: 'IN' } }
            }
          }}
        />
      </div>

      {errorMsg && (
        <div className={styles.errorBanner}>
          ⚠️ {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className={styles.payBtn}
      >
        {processing ? (
          <><span className={styles.btnSpinner}></span> Processing...</>
        ) : (
          <>💳 Pay ₹{parseFloat(amount).toFixed(0)}</>
        )}
      </button>

      <button
        type="button"
        className={styles.cancelBtn}
        onClick={() => navigate('/cart')}
        disabled={processing}
      >
        ← Cancel & Return to Cart
      </button>
    </form>
  );
};

// ─── Outer wrapper: fetches clientSecret, renders Elements provider ─────────
const StripeSandbox = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const amount = parseFloat(searchParams.get("amount") || "0");

  const { URl, token } = useContext(StoreContext);
  const navigate = useNavigate();

  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (!orderId || !amount) {
      setFetchError('Missing order details. Please go back and try again.');
      setLoading(false);
      return;
    }

    // Request a PaymentIntent from the backend
    axios.post(
      `${URl}/api/order/create-payment-intent`,
      { orderId, amount: amount }, // Use direct rupee value
      { headers: { token } }
    ).then(res => {
      if (res.data.success) {
        setClientSecret(res.data.clientSecret);
      } else {
        setFetchError(res.data.message || 'Failed to initialize payment.');
        toast.error(res.data.message || 'Payment init failed. Check your Stripe key.');
      }
    }).catch(err => {
      console.error(err);
      setFetchError('Could not connect to payment server.');
    }).finally(() => setLoading(false));
  }, [orderId, amount]);

  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#f97316',
      colorBackground: '#16161f',
      colorText: '#f1f5f9',
      colorDanger: '#ef4444',
      fontFamily: '"Inter", sans-serif',
      borderRadius: '10px',
      spacingUnit: '4px',
    },
  };

  return (
    <div className={styles.container}>
      <div className={styles.stripeCard}>
        {/* Header */}
        <div className={styles.stripeHeader}>
          <div className={styles.stripeLogo}>
            <span className={styles.stripeIcon}>S</span>
            <span className={styles.stripeText}>stripe <span className={styles.sandboxBadge}>TEST MODE</span></span>
          </div>
          <div className={styles.orderSummary}>
            <span className={styles.orderLabel}>Order Total</span>
            <span className={styles.orderAmount}>₹{parseFloat(amount).toFixed(0)}</span>
          </div>
        </div>

        {loading ? (
          <div className={styles.processingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.processingMsg}>Initializing Stripe secure session...</p>
            <span className={styles.processingSub}>🔒 End-to-end encrypted</span>
          </div>
        ) : fetchError ? (
          <div className={styles.paymentForm}>
            <div className={styles.errorBanner} style={{ marginBottom: '20px' }}>
              ⚠️ {fetchError}
            </div>
            <p className={styles.description}>
              Make sure <code>STRIPE_SECRET_KEY</code> in your backend <code>.env</code> is set to a real Stripe test key from{' '}
              <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noreferrer" style={{ color: '#f97316' }}>
                dashboard.stripe.com/test/apikeys
              </a>
            </p>
            <button className={styles.cancelBtn} onClick={() => navigate('/cart')}>
              ← Back to Cart
            </button>
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
            <CheckoutForm orderId={orderId} amount={amount} />
          </Elements>
        ) : null}
      </div>
    </div>
  );
};

export default StripeSandbox;
