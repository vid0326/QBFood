import React, { useState } from 'react'
import style from './home.module.css'
import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import FoodDisplay from '../../components/foodDisplay/FoodDisplay'
import RecommendationCarousel from '../../components/RecommendationCarousel/RecommendationCarousel'

const Home = () => {

  const [category,setCategory] = useState("All")


  return (
    <div className={style.a1}>
      <Header />
      <RecommendationCarousel />
      <ExploreMenu category={category} setCategory={setCategory} />
      <FoodDisplay category={category} />
    </div>
  );
}

export default Home