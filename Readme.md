# QuickBite — Full-Stack Food Delivery (Multi-Vendor + Real-Time OTP)

## Team

**Ayush · Khairaj · Vidhut**

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **DB:** MongoDB (Mongoose)
- **Realtime:** Socket.io
- **Payments:** Stripe (with sandbox fallback)
- **Auth:** JWT (access + refresh rotation in UI)

---

## 1) System Overview

QuickBite is a multi-portal delivery platform:

```mermaid
flowchart LR
  A[Customer Browser + Order + Pay] -->|HTTP (REST) / WebSockets| B[Express API Server]
  C[Vendor (Restaurant Owner)] -->|HTTP + DB updates| B
  D[Delivery Agent] -->|HTTP (accept/complete) + WebSockets| B
  E[(MongoDB)] <-->|Models| B
  B -->|Socket.io events| A
  B -->|Socket.io events| D
```

### Main Portal Roles

- **Customer:** browse → cart → checkout (Stripe) → live tracking → OTP delivery confirmation → chat
- **Vendor (restaurant_owner):** manages menu + order status updates
- **Delivery agent (delivery):** accepts orders → navigates → enters OTP within geofence

---

## 2) Architecture (Request + Event Flow)

### REST APIs (HTTP)

```mermaid
sequenceDiagram
  autonumber
  participant Client as Browser (React/Vite)
  participant API as Express API
  participant DB as MongoDB

  Client->>API: Place order (POST /api/order/...)
  API->>DB: Create order doc
  API->>API: Stripe checkout session
  API-->>Client: session URL (or sandbox URL)
  Client->>API: Verify payment (POST /api/order/...)
  API->>DB: Update order.payment
```

### Realtime Updates (Socket.io)

```mermaid
sequenceDiagram
  autonumber
  participant Cust as Customer
  participant Vend as Vendor
  participant Agent as Delivery Agent
  participant Socket as Socket.io

  Cust->>Socket: join order room
  Vend->>Socket: updateStatus emits
  Socket->>Cust: status_update

  Agent->>Socket: update_location loop
  Socket->>Cust: location_update + otp_ready when within geofence
  Cust->>Socket: read otp
  Agent->>Socket: submit otp via API
  Socket->>Cust: delivery_confirmed + Delivered status
```

---

## 3) Key Domain Models (Mongoose Schemas)

> **Note:** These are the core schema concepts used across the system.

### User (`userModel.js`)

```js
{
  name: String,
  email: String,
  password: String,                 // bcrypt hash
  role: 'customer'|'admin'|'restaurant_owner'|'delivery',

  cartData: Object,                // server-side cart backup
  addresses: [{
    label, street, city, state, zipCode, country
  }],

  currentLocation: {
    type: 'Point',
    coordinates: [lng, lat]
  },

  favorites: [foodId],

  activeToken: String|null,
  refreshToken: String|null,
  tokenVersion: Number,

  vehicleDetails: String,         // for delivery agents
  licensePlate: String,
  phone: String,
  profilePic: String,

  loyaltyPoints: Number,
  isAvailable: Boolean,
  totalDeliveries: Number
}
```

### Restaurant (`restaurantModel.js`)

```js
{
  name: String,
  description: String,
  ownerId: ObjectId -> user,

  address: { street, city, state, zipCode, country },
  location: {
    type: 'Point',
    coordinates: [lng, lat]
  },

  rating: Number,
  cuisineTypes: [String],
  bannerImage: String,
  images: [String],
  isActive: Boolean
}
```

### Food (`foodModel.js`)

```js
{
  name: String,
  description: String,
  price: Number,

  image: String,
  images: [String],

  category: String,
  restaurantId: ObjectId -> restaurant,

  dietaryTags: [String],
  isAvailable: Boolean
}
```

### Order (`orderModel.js`)

```js
{
  userId: String,
  items: [
    {
      // snapshot of cart item data
    }
  ],

  amount: Number,
  address: Object,

  status: String,                 // e.g., "Food is Getting Ready!", "Out for delivery", "Delivered"
  date: Date,

  payment: Boolean,

  restaurantId: ObjectId -> restaurant,
  deliveryAgentId: ObjectId -> user,

  deliveryOTP: String|null,      // 6-digit OTP
  otpVerified: Boolean,
  otpGeneratedAt: Date|null
}
```

### Delivery Agent (`deliveryAgentModel.js`)

```js
{
  userId: ObjectId -> user,

  vehicleDetails: String,
  currentLocation: {
    type: 'Point',
    coordinates: [lng, lat]
  },

  isAvailable: Boolean,
  activeOrderId: ObjectId -> order|null,

  totalDeliveries: Number,
  earnings: Number
}
```

### Coupon (`couponModel.js`)

```js
{
  code: String,                   // uppercase
  discountPercentage: Number,
  maxDiscountAmount: Number,
  minOrderValue: Number,

  restaurantId: ObjectId|null,
  usedBy: [userId],             // single-use per user

  expiryDate: Date,
  isActive: Boolean
}
```

### Review (`reviewModel.js`)

```js
{
  userId: ObjectId -> user,
  restaurantId: ObjectId,
  foodId: ObjectId|null,
  orderId: ObjectId,

  rating: Number,               // 1..5
  comment: String,
  timestamps: true
}
```

### Chat (`chatModel.js`)

```js
{
  orderId: ObjectId,
  senderId: ObjectId,
  senderName: String,
  role: 'customer'|'delivery',

  text: String,                 // capped length
  timestamps: true
}
```

### Notification (`notificationModel.js`)

```js
{
  userId: ObjectId,
  type: 'order'|'promo'|'system',

  title: String,
  message: String,

  orderId: ObjectId|null,
  isRead: Boolean,
  timestamps: true
}
```

---

## 4) Geofenced Delivery + OTP Confirmation

Delivery confirmation is gated by a **distance check** between the agent and the customer.

### Geofence Logic (concept)

```mermaid
graph TD
  A[Agent sends update_location (lat,lng)] --> B[Server computes distance to customer]
  B --> C{distance <= 100m?}
  C -- yes --> D[Generate OTP (if not already generated)]
  D --> E[Emit otp_ready to customer]
  C -- no --> F[Keep tracking]
  E --> G[Agent submits otp via API]
  G --> H[Server verifies otp + expiry]
  H --> I[Mark order Delivered + emit delivery_confirmed]
```

### OTP Expiry

- OTP becomes invalid after the configured expiry window (10 minutes)

---

## 5) Socket Rooms Pattern

Each order has a dedicated room:

- Room: `order_{orderId}`
- Customer and delivery agent join for the specific order.

```mermaid
flowchart LR
  X[Customer UI] --> R[Socket Room: order_{orderId}]
  Y[Vendor updates via REST] --> Z[Server emits status_update]
  Z --> R
  W[Delivery agent UI] --> R
```

---

## 6) Recommendations (Personalized + Nearby)

The recommendation engine combines:

- user order history (category counts)
- restaurant proximity (MongoDB `$near` using geo index)

```mermaid
flowchart TD
  A[User request personalized] --> B[Fetch user's past orders]
  B --> C[Extract top categories]
  C --> D[Geo query nearby restaurants]
  D --> E[Query food items by categories]
  E --> F[Backfill with generic nearby items if needed]
  F --> G[Return up to 10 items]
```

---

## 7) Payment Flow (Stripe + Fallback)

```mermaid
sequenceDiagram
  autonumber
  participant Client as Customer
  participant API as Express
  participant Stripe as Stripe

  Client->>API: Place order
  API->>API: Create order doc
  API->>Stripe: checkout.sessions.create()
  Stripe-->>API: session URL
  API-->>Client: Redirect to Stripe session

  alt Stripe key invalid / sandbox fallback
    API-->>Client: Redirect to /stripe-sandbox
  end

  Client->>API: Verify (success=true/false)
  API->>API: Update order.payment + award loyalty points
```

---

## 8) Demo Checklist (Quick Walkthrough)

1. Start **Backend**
2. Start **Frontend**
3. Register / login as **Customer**
4. Place an order (Stripe session / sandbox)
5. Vendor updates status
6. Delivery agent accepts
7. Agent approaches customer → OTP emitted
8. Delivery agent submits OTP → Delivered confirmation + earnings update
9. Customer sees realtime tracking + notifications

---

## 9) Setup Notes

- Configure `.env` for:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `STRIPE_SECRET_KEY` (and optionally webhook/URLs depending on your setup)
- Start Backend then Frontend.

---

## Project Summary

QuickBite delivers a full-stack experience with:

- multi-vendor food platform
- real-time order tracking
- geofenced OTP delivery confirmation
- Stripe payments (with sandbox fallback)
- role-based portals (customer/vendor/delivery)
- loyalty points + notifications
- chat per order
