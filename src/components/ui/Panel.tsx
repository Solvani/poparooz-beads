import type { HTMLAttributes, ReactNode } from "react";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  readonly as?: "section" | "aside";
  readonly title: string;
  readonly titleId: string;
  readonly eyebrow?: string;
  readonly children: ReactNode;
}

export function Panel({
  as: Component = "section",
  title,
  titleId,
  eyebrow,
  children,
  className = "",
  ...attributes
}: PanelProps) {
  return (
    <Component
      aria-labelledby={titleId}
      className={["panel", className].filter(Boolean).join(" ")}
      {...attributes}
    >
      {eyebrow ? <p className="panel__eyebrow">{eyebrow}</p> : null}
      <h2 id={titleId} className="panel__title">
        {title}
      </h2>
      <div className="panel__body">{children}</div>
    </Component>
  );
}
