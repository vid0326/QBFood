/**
 * #25: FilterContext — Manages search/filter state (searchQuery, dietaryFilter, priceRange, maxDistance)
 * Isolated so filter changes don't re-render auth or cart consumers.
 */
import { createContext, useContext, useState } from 'react';

export const FilterContext = createContext(null);

export const FilterProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState('All');
  const [maxDistance, setMaxDistance] = useState(10);
  const [priceRange, setPriceRange] = useState([0, 500]);

  return (
    <FilterContext.Provider value={{
      searchQuery, setSearchQuery,
      dietaryFilter, setDietaryFilter,
      maxDistance, setMaxDistance,
      priceRange, setPriceRange
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => useContext(FilterContext);
