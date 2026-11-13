import type { CSSProperties, ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> & {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
};

const FILL: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", color: "transparent" };

export default function Image({ fill, priority, loading, decoding, style, sizes: _sizes, ...rest }: Props) {
  return (
    <img
      {...rest}
      loading={priority ? "eager" : (loading ?? "lazy")}
      fetchPriority={priority ? "high" : undefined}
      decoding={decoding ?? "async"}
      style={fill ? { ...FILL, ...style } : style}
    />
  );
}
