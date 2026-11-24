interface Props {
  wide: string;
  narrow: string;
  alt: string;
  minWidth?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function ArtDirectedImage({ wide, narrow, alt, minWidth = 768, priority = false, className }: Props) {
  return (
    <picture>
      <source media={`(min-width: ${minWidth}px)`} srcSet={wide} />
      <img
        src={narrow}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={className}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", color: "transparent" }}
      />
    </picture>
  );
}
