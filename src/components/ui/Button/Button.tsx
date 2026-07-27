import { forwardRef } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "tertiary";
type Size = "medium" | "large" | "xlarge";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "medium", block, className, type = "button", ...rest },
    ref
  ) => {
    const cls = [
      styles.btn,
      styles[size],
      styles[variant],
      block ? styles.block : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    return <button ref={ref} type={type} className={cls} {...rest} />;
  }
);

Button.displayName = "Button";
