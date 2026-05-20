import { useState, useContext, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { StoreContext } from '../../context/StoreContext';
import { toINR } from '../../utils/currency';
import { toast } from 'react-toastify';
import styles from './SearchPage.module.css';

const CATEGORIES = ['All', 'Salad', 'Rolls', 'Dessert', 'Sandwich', 'Cake', 'Pure Veg', 'Pasta', 'Noodles'];
const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Name A → Z', value: 'name_asc' },
];

const SearchPage = () => {
  const { URl, cartItem, addToCart, removeFromCart, token } = useContext(StoreContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('cat') || 'All');
  const [sort, setSort] = useState('relevance');
  const [priceMax, setPriceMax] = useState(Number(searchParams.get('maxPrice')) || 500);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const doSearch = useCallback(async (q, cat, maxP) => {
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (q) params.search = q;
      if (cat && cat !== 'All') params.category = cat;
      if (maxP < 500) params.price_max = maxP;
      const res = await axios.get(URl + '/api/food/list', { params });
      if (res.data.success) {
        setResults(res.data.data || []);
        setTotalCount(res.data.data?.length || 0);
      }
    } catch (e) { toast.error('Search failed'); }
    finally { setLoading(false); }
  }, [URl]);

  // Run search on mount or when params change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('cat') || 'All';
    const maxP = Number(searchParams.get('maxPrice')) || 500;
    setQuery(q); setCategory(cat); setPriceMax(maxP);
    if (q || cat !== 'All' || maxP < 500) doSearch(q, cat, maxP);
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = {};
    if (query) params.q = query;
    if (category !== 'All') params.cat = category;
    if (priceMax < 500) params.maxPrice = priceMax;
    setSearchParams(params);
    doSearch(query, category, priceMax);
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sort === 'price_asc') return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    if (sort === 'name_asc') return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className={styles.page}>
      {/* Header + Search bar */}
      <div className={styles.header}>
        <h1 className={styles.title}>🔍 Discover Food</h1>
        <p className={styles.subtitle}>Search across thousands of dishes from all QuickBite restaurants</p>

        <form onSubmit={handleSubmit} className={styles.searchBar}>
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Butter Chicken, Pasta, Rolls..."
            className={styles.searchInput}
            autoFocus
          />
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            {loading ? '⏳' : '🔍'} Search
          </button>
        </form>

        {/* Filter chips */}
        <div className={styles.filterRow}>
          <div className={styles.catChips}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`${styles.chip} ${category === cat ? styles.chipActive : ''}`}
                onClick={() => { setCategory(cat); }}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.filterRight}>
            <label className={styles.priceLabel}>
              Max: <span>{toINR(priceMax)}</span>
              <input
                type="range" min={5} max={500} step={5}
                value={priceMax} onChange={e => setPriceMax(Number(e.target.value))}
                className={styles.priceSlider}
              />
            </label>

            <select value={sort} onChange={e => setSort(e.target.value)} className={styles.sortSelect}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className={styles.body}>
        {searched && !loading && (
          <p className={styles.resultCount}>
            {totalCount === 0 ? 'No results found' : `${totalCount} dish${totalCount !== 1 ? 'es' : ''} found`}
            {query && <span> for "<strong>{query}</strong>"</span>}
          </p>
        )}

        {loading ? (
          <div className={styles.skeletonGrid}>
            {[...Array(8)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : (
          <div className={styles.resultsGrid}>
            {sortedResults.map(item => (
              <div key={item._id} className={styles.foodCard} onClick={() => navigate(`/food-detail/${item._id}`)}>
                <div className={styles.imgWrap}>
                  <img src={`${URl}/images/${item.image}`} alt={item.name} className={styles.foodImg} />
                  <span className={styles.catBadge}>{item.category}</span>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.foodName}>{item.name}</h3>
                  {item.restaurantId?.name && (
                    <p className={styles.restaurantName}>
                      🏪 <Link
                        to={`/restaurant/${item.restaurantId._id}`}
                        onClick={e => e.stopPropagation()}
                        className={styles.restLink}
                      >
                        {item.restaurantId.name}
                      </Link>
                    </p>
                  )}
                  <p className={styles.foodDesc}>{item.description?.slice(0, 70)}{item.description?.length > 70 ? '…' : ''}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.price}>{toINR(item.price)}</span>
                    {!cartItem[item._id] ? (
                      <button
                        className={styles.addBtn}
                        onClick={e => { e.stopPropagation(); addToCart(item._id); if (token) toast.success(`${item.name} added! 🛒`, { autoClose: 1000 }); }}
                      >
                        + Add
                      </button>
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

            {searched && sortedResults.length === 0 && !loading && (
              <div className={styles.empty}>
                <p>🍽️ No dishes found matching your search.</p>
                <p>Try broader terms or clear the category filter.</p>
                <button className={styles.clearBtn} onClick={() => { setQuery(''); setCategory('All'); setPriceMax(500); setResults([]); setSearched(false); setSearchParams({}); }}>
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
