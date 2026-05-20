import React, { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import { assets } from '../../assets/assets';
import style from './foodDetail.module.css';
import { toINR } from '../../utils/currency';
import { toast } from 'react-toastify';

const FoodDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { food_list, cartItem, addToCart, removeFromCart, URl, token } = useContext(StoreContext);

  const [food, setFood] = useState(null);
  const [activeImage, setActiveImage] = useState("");

  useEffect(() => {
    if (food_list && food_list.length > 0) {
      const found = food_list.find(item => item._id === id);
      if (found) {
        setFood(found);
        setActiveImage(found.image);
      }
    }
  }, [id, food_list]);

  if (!food) {
    return (
      <div className={style.loadingContainer}>
        <h2>🍽️ Fetching Dish Gallery...</h2>
      </div>
    );
  }

  // Get all photos array safely
  const galleryPhotos = [food.image, ...(food.images || [])].filter(Boolean);
  const restaurant = food.restaurantId && typeof food.restaurantId === 'object' ? food.restaurantId : null;

  return (
    <div className={style.detailPage}>
      <button className={style.backBtn} onClick={() => navigate(-1)}>
        ← Back to Menu
      </button>

      <div className={style.detailContainer}>
        {/* Left Side: Photo Gallery */}
        <div className={style.gallerySection}>
          <div className={style.mainImageContainer}>
            <img 
              src={`${URl}/images/${activeImage}`} 
              alt={food.name} 
              className={style.mainImage}
            />
          </div>
          {galleryPhotos.length > 1 && (
            <div className={style.thumbnailsGrid}>
              {galleryPhotos.map((photo, index) => (
                <div 
                  key={index} 
                  className={`${style.thumbnailCard} ${activeImage === photo ? style.activeThumb : ""}`}
                  onClick={() => setActiveImage(photo)}
                >
                  <img src={`${URl}/images/${photo}`} alt={`Thumbnail ${index}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Details & Cart Controls */}
        <div className={style.infoSection}>
          <span className={style.categoryBadge}>{food.category}</span>
          <h1 className={style.dishTitle}>{food.name}</h1>
          
          <div className={style.ratingRow}>
            <img src={assets.rating_starts} alt="Stars" />
            <span>(4.8 / 5 Customer Rating)</span>
          </div>

          <div className={style.priceBlock}>
            <span className={style.priceLabel}>Price:</span>
            <span className={style.priceValue}>{toINR(food.price)}</span>
          </div>

          <p className={style.descriptionText}>{food.description}</p>

          {/* Cart Quantity Action Bar */}
          <div className={style.cartActionBox}>
            {!cartItem[food._id] ? (
              <button className={style.addToCartBtn} onClick={() => { addToCart(food._id); if (token) toast.success(`${food.name} added to cart! 🛒`, { autoClose: 1500 }); }}>
                Add to Cart 🛒
              </button>
            ) : (
              <div className={style.quantitySelector}>
                <span className={style.quantityLabel}>In Your Basket:</span>
                <div className={style.counterRow}>
                  <button className={style.counterBtn} onClick={() => removeFromCart(food._id)}>−</button>
                  <span className={style.quantityNum}>{cartItem[food._id]}</span>
                  <button className={style.counterBtn} onClick={() => addToCart(food._id)}>+</button>
                </div>
              </div>
            )}
          </div>

          {/* Selling Restaurant Section */}
          {restaurant && (
            <div className={style.restaurantSection}>
              <h4>🏪 Sold & Prepared By</h4>
              <div className={style.restaurantCard}>
                {restaurant.bannerImage && (
                  <img 
                    src={`${URl}/images/${restaurant.bannerImage}`} 
                    alt={restaurant.name} 
                    className={style.restaurantBanner}
                  />
                )}
                <div className={style.restaurantBody}>
                  <h5>{restaurant.name}</h5>
                  <p className={style.restaurantDescription}>{restaurant.description}</p>
                  
                  {restaurant.cuisineTypes && restaurant.cuisineTypes.length > 0 && (
                    <div className={style.cuisines}>
                      {restaurant.cuisineTypes.map((cuisine, idx) => (
                        <span key={idx} className={style.cuisineTag}>{cuisine}</span>
                      ))}
                    </div>
                  )}

                  {restaurant.address && (
                    <div className={style.address}>
                      📍 {restaurant.address.street}, {restaurant.address.city}, {restaurant.address.state}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodDetail;
