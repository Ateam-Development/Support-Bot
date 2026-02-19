
import React from 'react';
import styles from './Loader.module.css';

const Loader = ({ className }) => {
    return (
        <div className={`${styles.loader} ${className || ''}`}>
            <div className={`${styles.box} ${styles.box0}`}>
                <div />
            </div>
            <div className={`${styles.box} ${styles.box1}`}>
                <div />
            </div>
            <div className={`${styles.box} ${styles.box2}`}>
                <div />
            </div>
            <div className={`${styles.box} ${styles.box3}`}>
                <div />
            </div>
            <div className={`${styles.box} ${styles.box4}`}>
                <div />
            </div>
            <div className={`${styles.box} ${styles.box5}`}>
                <div />
            </div>
            <div className={`${styles.box} ${styles.box6}`}>
                <div />
            </div>
            <div className={`${styles.box} ${styles.box7}`}>
                <div />
            </div>
            <div className={styles.ground}>
                <div />
            </div>
        </div>
    );
};

export default Loader;
