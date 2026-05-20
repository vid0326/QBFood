import React, { useContext } from 'react'
import style from './fooditem.module.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { toINR } from '../../utils/currency'

const FoodItem = ({ id, name, price, description, image, category, restaurantId }) => {
  const { cartItem, addToCart, removeFromCart, URl, token } = useContext(StoreContext)
  const navigate = useNavigate();

  const handleNavigateDetail = () => {
    navigate(`/food-detail/${id}`);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(id);
    if (token) toast.success(`${name} added to cart! 🛒`, { autoClose: 1500 });
  };

  const restaurantName = restaurantId && typeof restaurantId === 'object' ? restaurantId.name : null;

  // Deterministic "hot" badge based on ID hash (simulates popularity)
  const isHot = id && parseInt(id.slice(-1), 16) > 10;

  return (
    <div className={style.FoodItem}>
      <div className={style.FoodItemImageContainer}>
        <img 
          className={style.FoodItemImage} 
          src={URl + "/images/" + image} 
          alt={name} 
          onClick={handleNavigateDetail}
          style={{ cursor: 'pointer' }}
        />
        {category && <span className={style.category}>{category}</span>}
        {isHot && <span className={style.hotBadge}>🔥 hot</span>}
        {!cartItem[id]
          ? <img className={style.add} onClick={handleAddToCart} src={assets.add_icon_white} alt="Add to cart" />
          : <div className={style.FoodItemCount}>
              <img src={assets.remove_icon_red} onClick={(e) => { e.stopPropagation(); removeFromCart(id); }} alt="Remove" />
              <p>{cartItem[id]}</p>
              <img src={assets.add_icon_green} onClick={(e) => { e.stopPropagation(); addToCart(id); }} alt="Add more" />
            </div>
        }
      </div>
      <div className={style.FoodItemInfo} onClick={handleNavigateDetail} style={{ cursor: 'pointer' }}>
        <div className={style.FoodItemName}>
          <p>{name}</p>
          <img src={assets.rating_starts} alt="rating" />
        </div>
        {restaurantName && (
          <div className={style.vendorBadge}>
            🏪 {restaurantName}
          </div>
        )}
        <p className={style.FoodItemDescription}>{description}</p>
        <div className={style.FoodItemFooter}>
          <p className={style.FoodItemPrice}>{toINR(price)}</p>
          {cartItem[id] > 0 && (
            <span className={style.inCartBadge}>{cartItem[id]} in cart</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default FoodItem