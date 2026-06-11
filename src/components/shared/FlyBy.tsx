import { useEffect, useState } from 'react';
import { FLAIR } from '../../constants/flair';

interface Fly {
  id: number;
  src: string;
  top: number;
  dur: number;
  size: number;
  reverse: boolean;
}

const COOLDOWN_MS = 3500;
let lastFly = 0;

export function triggerFlyBy(category: string) {
  window.dispatchEvent(new CustomEvent('vault-flyby', { detail: { category } }));
}

export default function FlyByLayer() {
  const [flies, setFlies] = useState<Fly[]>([]);

  useEffect(() => {
    const onFly = (e: Event) => {
      const category = (e as CustomEvent).detail?.category as string;
      const pool = FLAIR[category];
      if (!pool?.length) return;
      const now = Date.now();
      if (now - lastFly < COOLDOWN_MS) return;
      lastFly = now;
      const fly: Fly = {
        id: now,
        src: pool[Math.floor(Math.random() * pool.length)],
        top: 10 + Math.random() * 55,
        dur: 3 + Math.random() * 1.8,
        size: 120 + Math.random() * 80,
        reverse: Math.random() < 0.35,
      };
      setFlies((f) => [...f, fly]);
      window.setTimeout(() => {
        setFlies((f) => f.filter((x) => x.id !== fly.id));
      }, (fly.dur + 0.3) * 1000);
    };
    window.addEventListener('vault-flyby', onFly);
    return () => window.removeEventListener('vault-flyby', onFly);
  }, []);

  return (
    <>
      {flies.map((f) => (
        <div
          key={f.id}
          className={`flyby ${f.reverse ? 'flyby-reverse' : ''}`}
          style={{ top: `${f.top}vh`, animationDuration: `${f.dur}s` }}
        >
          <span className="flyby-bob inline-block">
            <img
              src={f.src}
              alt=""
              style={{ width: f.size, transform: f.reverse ? 'scaleX(-1)' : undefined }}
            />
          </span>
        </div>
      ))}
    </>
  );
}
