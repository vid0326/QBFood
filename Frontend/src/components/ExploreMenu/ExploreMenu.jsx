import React from 'react'
import style from './explore.module.css'
import { menu_list } from '../../assets/assets'

const ExploreMenu = ({ category, setCategory }) => {
  return (
    <section className={style.ExploreMenu} id="ExploreMenu">
      <h2 className={style.ExploreMenuHeading}>
        Explore Our <span>Menu</span>
      </h2>
      <p className={style.ExploreMenuText}>
        Browse through our diverse selection of categories — from quick bites to gourmet meals, there's something for every craving.
      </p>
      <div className={style.ExploreMenuList}>
        {menu_list.map((item, index) => (
          <div
            key={index}
            className={style.MenuListItem}
            onClick={() => setCategory(prev => prev === item.menu_name ? "All" : item.menu_name)}
          >
            <img
              className={category === item.menu_name ? style.active : ""}
              src={item.menu_image}
              alt={item.menu_name}
            />
            <p className={category === item.menu_name ? style.activeText : ""}>{item.menu_name}</p>
          </div>
        ))}
      </div>
      <div className={style.divider}></div>
    </section>
  )
}

export default ExploreMenu