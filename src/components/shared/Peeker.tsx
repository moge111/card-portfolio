interface PeekerProps {
  src: string;
  className?: string;
  size?: number;
  alt?: string;
}

// A character peeking over the top edge of a panel. The wrapper clips the
// image so only the head/shoulders show above the box. Parent must be a
// positioned element (.panel already is).
export default function Peeker({ src, className = '', size = 40, alt = '' }: PeekerProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute overflow-hidden ${className}`}
      style={{ height: size, top: -size }}
    >
      <img src={src} alt={alt} className="peeker-img object-contain object-top" style={{ height: size * 1.9 }} />
    </div>
  );
}
