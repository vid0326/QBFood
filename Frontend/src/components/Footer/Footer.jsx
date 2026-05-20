import React from 'react'
import style from './footer.module.css'
import { assets } from '../../assets/assets';

const Footer = () => {
  return (
    <footer className={style.Footer} id="Footer">
      <div className={style.FooterContent}>
        <div className={style.FooterContentLeft}>
          <img src={assets.logo} alt="QuickBite logo" className={style.logo} />
          <p>
            Connecting food lovers with the best local restaurants. Fast delivery, fresh food, happy customers — every single time.
          </p>
          <div className={style.FooterSocial}>
            <img src={assets.facebook_icon} alt="Facebook" />
            <img src={assets.twitter_icon} alt="Twitter" />
            <img src={assets.linkedin_icon} alt="LinkedIn" />
          </div>
        </div>
        <div className={style.FooterContentMiddle}>
          <h3>Company</h3>
          <ul>
            <li>Home</li>
            <li>About Us</li>
            <li>Delivery</li>
            <li>Privacy Policy</li>
          </ul>
        </div>
        <div className={style.FooterContentRight}>
          <h3>Get In Touch</h3>
          <ul>
            <li>+91 9902901869</li>
            <li>quickbite@gmail.com</li>
            <li>Mon – Sat: 9am – 10pm</li>
          </ul>
        </div>
      </div>
      <div className={style.FooterBottom}>
        <p className={style.FooterCopyrigth}>
          © 2026 QuickBite. All Rights Reserved.
        </p>
        <span className={style.footerBadge}>
           Crafted with ❤️ by Ayush, Khairaj, and Vidhut. Fueling your cravings one byte at a time! 🚀
        </span>
      </div>
    </footer>
  );
}

export default Footer