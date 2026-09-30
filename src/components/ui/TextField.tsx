import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './TextField.module.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null | undefined;
  hint?: ReactNode;
  /** Элемент справа внутри поля, например кнопка «показать пароль». */
  trailing?: ReactNode;
}

export function TextField({
  label,
  error,
  hint,
  trailing,
  id,
  className,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = error || hint ? `${inputId}-description` : undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.control} data-invalid={Boolean(error) || undefined}>
        <input
          id={inputId}
          className={styles.input}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedById}
          {...props}
        />
        {trailing}
      </div>
      {(error || hint) && (
        <p id={describedById} className={error ? styles.error : styles.hint}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
