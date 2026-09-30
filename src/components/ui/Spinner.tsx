import styles from './Spinner.module.css';

/** Декоративный индикатор: состояние загрузки сообщает `aria-busy` на родителе. */
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span className={styles.spinner} style={{ width: size, height: size }} aria-hidden="true" />
  );
}
