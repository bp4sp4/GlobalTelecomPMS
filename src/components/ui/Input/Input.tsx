import { forwardRef, useId } from "react";
import styles from "./Input.module.css";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, required, error, helper, id, className, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const describedBy = error || helper ? `${inputId}-desc` : undefined;
    const cls = [styles.input, error ? styles.error : "", className ?? ""]
      .filter(Boolean)
      .join(" ");
    return (
      <div className={styles.field}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {required && (
              <span className={styles.required} aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cls}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {(error || helper) && (
          <p
            id={describedBy}
            className={`${styles.helper} ${error ? styles.helperError : ""}`}
          >
            {error || helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
