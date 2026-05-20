import React, { useContext, useState, useEffect, useRef } from "react";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import FoodItem from "../FoodItem/FoodItem";

const RecommendationCarousel = () => {
  const { token, URl, food_list } = useContext(StoreContext);
  const [recommendedItems, setRecommendedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        let response;
        if (token) {
          // Attempt to load personalized recommendations
          response = await axios.get(`${URl}/api/recommendation/personalized`, {
            headers: { token }
          });
        }
        
        // If not authenticated, or personalized list is empty, fall back to trending
        if (!response?.data?.success || !response?.data?.data || response.data.data.length === 0) {
          response = await axios.get(`${URl}/api/recommendation/trending`);
        }

        if (response.data.success && response.data.data.length > 0) {
          setRecommendedItems(response.data.data);
        } else {
          // Fall back to first 5 items from local list if both API queries return nothing (e.g. fresh DB)
          setRecommendedItems(food_list.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to load recommendations:", err);
        setRecommendedItems(food_list.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [token, food_list]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  if (loading && recommendedItems.length === 0) return null;
  if (recommendedItems.length === 0) return null;

  return (
    <div 
      style={{ 
        width: "90%", 
        maxWidth: "1200px", 
        margin: "35px auto 10px auto", 
        color: "#fff",
        position: "relative"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "600", background: "linear-gradient(90deg, #f97316, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {token ? "🎯 Tailored Recipes for You" : "🔥 Trending Culinary Delights"}
          </h2>
          <p style={{ fontSize: "13px", color: "#a8a29e", marginTop: "4px" }}>Handpicked selections matching your taste profiles and active community choices.</p>
        </div>
        
        {/* Navigation arrows */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            onClick={scrollLeft}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              fontWeight: "bold",
              transition: "background 0.2s"
            }}
          >
            ←
          </button>
          <button 
            onClick={scrollRight}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              fontWeight: "bold",
              transition: "background 0.2s"
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Horizontal Sliding Grid Container */}
      <div 
        ref={scrollRef}
        style={{
          display: "flex",
          gap: "20px",
          overflowX: "auto",
          paddingBottom: "15px",
          scrollBehavior: "smooth"
        }}
        className="custom-carousel-scrollbar"
      >
        {recommendedItems.map((item, index) => (
          <div 
            key={index} 
            style={{ 
              flex: "0 0 280px", 
              background: "rgba(255,255,255,0.02)", 
              border: "1px solid rgba(255,255,255,0.04)", 
              borderRadius: "14px", 
              overflow: "hidden"
            }}
          >
            <FoodItem 
              id={item._id}
              name={item.name}
              description={item.description}
              price={item.price}
              image={item.image}
              category={item.category}
              restaurantId={item.restaurantId}
            />
          </div>
        ))}
      </div>

      <style>{`
        .custom-carousel-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-carousel-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 999px;
        }
        .custom-carousel-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.2);
          border-radius: 999px;
        }
        .custom-carousel-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.4);
        }
        .custom-carousel-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(249, 115, 22, 0.2) rgba(255, 255, 255, 0.02);
        }
      `}</style>
    </div>
  );
};

export default RecommendationCarousel;
