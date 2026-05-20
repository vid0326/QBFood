import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { StoreContext } from '../../context/StoreContext';
import { toINR } from '../../utils/currency';
import { toast } from 'react-toastify';
import styles from './RestaurantPage.module.css';

const CATEGORIES = ['All', 'Salad', 'Rolls', 'Dessert', 'Sandwich', 'Cake', 'Pure Veg', 'Pasta', 'Noodles'];

const RestaurantPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { URl, cartItem, addToCart, removeFromCart, token } = useContext(StoreContext);

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('menu'); // menu | info | reviews
  const [activeImg, setActiveImg] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [restRes, menuRes] = await Promise.all([
          axios.get(`${URl}/api/restaurant/${id}`),
          axios.get(`${URl}/api/food/list`, { params: { restaurantId: id } })
        ]);
        if (restRes.data.success) {
          setRestaurant(restRes.data.data);
          setActiveImg(restRes.data.data.bannerImage);
        }
        if (menuRes.data.success) setMenu(menuRes.data.data);

        // Try to load reviews
        try {
          const revRes = await axios.get(`${URl}/api/review/restaurant/${id}`);
          if (revRes.data.success) setReviews(revRes.data.data);
        } catch { /* reviews optional */ }
      } catch (e) {
        toast.error('Failed to load restaurant');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch();
  }, [id, URl]);

  const filteredMenu = activeCategory === 'All'
    ? menu
    : menu.filter(item => item.category === activeCategory);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
          <p>Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) return null;

  const allPhotos = [restaurant.bannerImage, ...(restaurant.images || [])].filter(Boolean);

  return (
    <div className={styles.page}>
      {/* Hero Banner */}
      <div className={styles.hero}>
        {activeImg ? (
          <img src={`${URl}/images/${activeImg}`} alt={restaurant.name} className={styles.heroImg} />
        ) : (
          <div className={styles.heroBg} />
        )}
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>
          <h1 className={styles.restName}>{restaurant.name}</h1>
          <div className={styles.heroBadges}>
            {restaurant.cuisineTypes?.map((c, i) => (
              <span key={i} className={styles.cuisineBadge}>{c}</span>
            ))}
          </div>
          <div className={styles.heroMeta}>
            {avgRating && (
              <span className={styles.ratingBadge}>⭐ {avgRating} ({reviews.length} reviews)</span>
            )}
            {restaurant.address?.city && (
              <span className={styles.locationBadge}>📍 {restaurant.address.city}, {restaurant.address.state}</span>
            )}
            <span className={`${styles.openBadge} ${styles.openGreen}`}>🟢 Open Now</span>
          </div>
        </div>
      </div>

      {/* Photo thumbnails */}
      {allPhotos.length > 1 && (
        <div className={styles.photoStrip}>
          {allPhotos.map((photo, i) => (
            <div
              key={i}
              className={`${styles.photoThumb} ${activeImg === photo ? styles.photoThumbActive : ''}`}
              onClick={() => setActiveImg(photo)}
            >
              <img src={`${URl}/images/${photo}`} alt={`Photo ${i + 1}`} />
            </div>
          ))}
        </div>
      )}

      {/* Tab nav */}
      <div className={styles.tabNav}>
        {[['menu', '🍽️ Menu'], ['info', 'ℹ️ Info'], ['reviews', `⭐ Reviews (${reviews.length})`]].map(([tab, label]) => (
          <button
            key={tab}
            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.body}>

        {/* ── MENU TAB ── */}
        {activeTab === 'menu' && (
          <div>
            {/* Category filter chips */}
            <div className={styles.catChips}>
              {CATEGORIES.filter(cat => cat === 'All' || menu.some(m => m.category === cat)).map(cat => (
                <button
                  key={cat}
                  className={`${styles.chip} ${activeCategory === cat ? styles.chipActive : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredMenu.length === 0 ? (
              <div className={styles.emptyMenu}>
                <p>🍽️ No items in this category yet.</p>
              </div>
            ) : (
              <div className={styles.menuGrid}>
                {filteredMenu.map(item => (
                  <div key={item._id} className={styles.menuCard} onClick={() => navigate(`/food-detail/${item._id}`)}>
                    <div className={styles.menuImgWrap}>
                      <img src={`${URl}/images/${item.image}`} alt={item.name} className={styles.menuImg} />
                      <span className={styles.menuCatBadge}>{item.category}</span>
                    </div>
                    <div className={styles.menuInfo}>
                      <div>
                        <h4 className={styles.menuItemName}>{item.name}</h4>
                        <p className={styles.menuItemDesc}>{item.description?.slice(0, 80)}{item.description?.length > 80 ? '…' : ''}</p>
                      </div>
                      <div className={styles.menuFooter}>
                        <span className={styles.menuPrice}>{toINR(item.price)}</span>
                        {!cartItem[item._id] ? (
                          <button
                            className={styles.addBtn}
                            onClick={e => { e.stopPropagation(); addToCart(item._id); if (token) toast.success(`${item.name} added! 🛒`, { autoClose: 1000 }); }}
                          >+ Add</button>
                        ) : (
                          <div className={styles.qty} onClick={e => e.stopPropagation()}>
                            <button onClick={() => removeFromCart(item._id)}>−</button>
                            <span>{cartItem[item._id]}</span>
                            <button onClick={() => addToCart(item._id)}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INFO TAB ── */}
        {activeTab === 'info' && (
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <h3>📍 Address</h3>
              <p>{restaurant.address?.street}</p>
              <p>{restaurant.address?.city}, {restaurant.address?.state} {restaurant.address?.zipCode}</p>
              <p>{restaurant.address?.country}</p>
            </div>
            <div className={styles.infoCard}>
              <h3>🍜 Cuisine Types</h3>
              <div className={styles.cuisineList}>
                {restaurant.cuisineTypes?.map((c, i) => (
                  <span key={i} className={styles.cuisineTag}>{c}</span>
                ))}
              </div>
            </div>
            <div className={styles.infoCard}>
              <h3>📊 Stats</h3>
              <div className={styles.statRow}><span>Menu Items</span><strong>{menu.length}</strong></div>
              <div className={styles.statRow}><span>Total Reviews</span><strong>{reviews.length}</strong></div>
              {avgRating && <div className={styles.statRow}><span>Avg Rating</span><strong>⭐ {avgRating}/5</strong></div>}
            </div>
            {restaurant.description && (
              <div className={styles.infoCard} style={{ gridColumn: '1 / -1' }}>
                <h3>📝 About</h3>
                <p style={{ lineHeight: '1.7', color: '#a8a29e' }}>{restaurant.description}</p>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === 'reviews' && (
          <div>
            {reviews.length === 0 ? (
              <div className={styles.emptyMenu}>
                <p>⭐ No reviews yet. Be the first to order and review!</p>
              </div>
            ) : (
              <div className={styles.reviewsList}>
                {reviews.map((rev, i) => (
                  <div key={i} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewAvatar}>
                        {(rev.userId?.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className={styles.reviewName}>{rev.userId?.name || 'Anonymous'}</p>
                        <p className={styles.reviewDate}>{new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className={styles.reviewRating}>
                        {'⭐'.repeat(Math.min(5, Math.round(rev.rating || 0)))}
                        <span style={{ fontSize: '12px', color: '#a8a29e', marginLeft: '4px' }}>{rev.rating}/5</span>
                      </div>
                    </div>
                    {rev.comment && <p className={styles.reviewComment}>{rev.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantPage;
