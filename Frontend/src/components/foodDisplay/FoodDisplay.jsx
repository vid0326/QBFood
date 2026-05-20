import React, { useContext } from "react";
import style from "./fooddisplay.module.css";
import { StoreContext } from "../../context/StoreContext";
import FoodItem from "../FoodItem/FoodItem";

const FoodDisplay = ({ category }) => {
  const { food_list, searchQuery, dietaryFilter, maxDistance, priceRange } = useContext(StoreContext);

  const filteredItems = food_list.filter(item => {
    // 1. Category Filter
    if (category !== "All" && category !== item.category) return false;

    // 2. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchCat = item.category?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) return false;
    }

    // 3. Dietary Filter
    if (dietaryFilter !== "All") {
      const desc = item.description?.toLowerCase() || "";
      const name = item.name.toLowerCase();
      if (dietaryFilter === "Veg") {
        const isVeg = desc.includes("veg") || desc.includes("green") || desc.includes("salad") || name.includes("veg") || name.includes("paneer") || name.includes("salad") || name.includes("dal");
        if (!isVeg) return false;
      } else if (dietaryFilter === "Vegan") {
        const isVegan = desc.includes("vegan") || desc.includes("plant-based") || name.includes("vegan");
        if (!isVegan) return false;
      } else if (dietaryFilter === "Gluten-Free") {
        const isGf = desc.includes("gluten") || desc.includes("gf") || desc.includes("healthy") || name.includes("gluten") || name.includes("rice");
        if (!isGf) return false;
      }
    }

    // 4. Price Range Filter
    const [minPrice, maxPrice] = priceRange;
    if (item.price < minPrice || item.price > maxPrice) return false;

    return true;
  });

  return (
    <section className={style.FoodDisplay} id="fooddisplay">
      <div className={style.FoodDisplayHeader}>
        <h2>
          {category === "All" ? "Top Dishes Near You" : `Best ${category} Dishes`}
        </h2>
        <span className={style.resultCount}>{filteredItems.length} dish{filteredItems.length !== 1 ? "es" : ""} found</span>
      </div>
      <div className={style.FoodDisplayList}>
        {filteredItems.length > 0
          ? filteredItems.map((item, index) => (
              <FoodItem
                key={index}
                id={item._id}
                name={item.name}
                description={item.description}
                price={item.price}
                image={item.image}
                category={item.category}
                restaurantId={item.restaurantId}
              />
            ))
          : (
            <div className={style.emptyState}>
              <span>🍽️</span>
              <p>No dishes match your filters.</p>
              <span className={style.emptyHint}>Try adjusting your price range or search query!</span>
            </div>
          )
        }
      </div>
    </section>
  );
};

export default FoodDisplay;
