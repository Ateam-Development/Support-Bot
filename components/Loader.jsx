import React from 'react';
import styles from './Loader.module.css';

// Lightweight CSS-only loader: spinning gradient ring around a pulsing core.
// Shows instantly (no staged 3s intro) and costs no JS.
const Loader = ({ className, label }) => {
    return (
        <div className={`${styles.wrap} ${className || ''}`} role="status" aria-label={label || 'Loading'}>
            <div className={styles.loader}>
                <span className={styles.ring} />
                <span className={styles.orbit}><i /></span>
                <span className={styles.core} />
            </div>
            {label && <span className={styles.label}>{label}</span>}
        </div>
    );
};

export default Loader;
