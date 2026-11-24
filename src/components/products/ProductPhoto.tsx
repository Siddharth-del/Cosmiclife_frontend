import Image from "@/components/ui/Image";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";

interface Props {
  src?: string | null;
  alt: string;
  dark?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  compact?: boolean;
}

export function ProductPhoto({ src, alt, dark = false, sizes, priority, className, compact = false }: Props) {
  if (src) return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
  return (
    <div
      role="img"
      aria-label={`${alt} (image coming soon)`}
      className={cn("absolute inset-0 flex flex-col items-center justify-center gap-3", dark ? "bg-espresso text-gold-soft/70" : "bg-sand text-espresso/45")}
    >
      <svg aria-hidden viewBox="0 0 32 32" className={compact ? "h-5 w-5" : "h-10 w-10 md:h-12 md:w-12"}>
        <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
        <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
        <circle cx="26.2" cy="9" r="1.9" className="fill-gold" />
      </svg>
      {!compact && <span className="font-display text-[0.8rem] uppercase tracking-[0.32em]">{site.wordmark}</span>}
    </div>
  );
}
