'use client';

export interface CardTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function CardTitle({
  title,
  subtitle,
  className = '',
}: CardTitleProps) {
  return (
    <div className={className}>
      <h4 className="type-label truncate font-bold text-[var(--color-text-default)]">
        {title}
      </h4>
      {subtitle && (
        <p className="type-caption-compact text-[var(--color-text-muted)]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
