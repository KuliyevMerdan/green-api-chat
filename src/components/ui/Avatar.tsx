import { memo } from 'react';
import { getInitials } from '../../lib/format';
import { UserIcon } from './icons';
import styles from './Avatar.module.css';

const GRADIENTS = [
  ['#ff8a5b', '#f5487f'],
  ['#ffc84b', '#ff8a3d'],
  ['#5ee08f', '#1fb57a'],
  ['#4fd1ff', '#3f7cf5'],
  ['#8f7cff', '#5b4cf0'],
  ['#ff7ad9', '#b54cf0'],
  ['#4be3d4', '#2a9df4'],
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

interface AvatarProps {
  /** Стабильный ключ для выбора цвета (обычно chatId). */
  seed: string;
  name?: string | undefined;
  size?: number;
}

export const Avatar = memo(function Avatar({ seed, name, size = 48 }: AvatarProps) {
  const [from, to] = GRADIENTS[hashString(seed) % GRADIENTS.length]!;
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-hidden="true"
    >
      {name ? getInitials(name) : <UserIcon size={size * 0.5} />}
    </span>
  );
});
