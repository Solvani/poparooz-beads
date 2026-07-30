import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...attributes
}: ButtonProps) {
  const classes = ["button", `button--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return <button type={type} className={classes} {...attributes} />;
}
