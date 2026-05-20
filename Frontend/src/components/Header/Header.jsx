import React from 'react'
import style from './header.module.css'

const Header = () => {
  return (
    <section className={style.header}>
      <div className={style.floatingEmoji} aria-hidden>🍕</div>
      <div className={style.floatingEmoji2} aria-hidden>🍜</div>
      <div className={style.floatingEmoji3} aria-hidden>🧋</div>

      <div className={style.headerContent}>
        <span className={style.headerTag}>
          <span className={style.liveDot}></span>
          500+ restaurants • 30-min delivery • no cap
        </span>
        <h1>
          your next fave meal<br />
          is <span>one tap away.</span>
        </h1>
        <p>
          Discover local gems & chain favs. Real food, real fast, real good. Delivered fresh to your door fr fr. 🔥
        </p>
        <div className={style.headerBtns}>
          <button
            className={style.headerBtnPrimary}
            onClick={() => document.getElementById('ExploreMenu')?.scrollIntoView({ behavior: 'smooth' })}
          >
            let's eat →
          </button>
          <button className={style.headerBtnSecondary}>
            how it works ✨
          </button>
        </div>
        <div className={style.headerStats}>
          <div className={style.statItem}>
            <span className={style.statValue}>50K+</span>
            <span className={style.statLabel}>happy customers</span>
          </div>
          <div className={style.statItem}>
            <span className={style.statValue}>500+</span>
            <span className={style.statLabel}>restaurants</span>
          </div>
          <div className={style.statItem}>
            <span className={style.statValue}>~30 min</span>
            <span className={style.statLabel}>avg delivery</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Header