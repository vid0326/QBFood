import { useNavigate } from 'react-router-dom';
import styles from './NotFound.module.css';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.emoji}>🍕</div>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>Page Not Found</h2>
        <p className={styles.sub}>Looks like this page got eaten! Let's find you something better.</p>
        <div className={styles.btnRow}>
          <button className={styles.btnPrimary} onClick={() => navigate('/')}>🏠 Back to Home</button>
          <button className={styles.btnSecondary} onClick={() => navigate(-1)}>← Go Back</button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
