import { useEffect, useRef, useState } from "react";

// Odbrojavanje: `running` pokreće/zaustavlja, `onEnd` se poziva kad vreme istekne
export function useCountdown(seconds: number, running: boolean, onEnd: () => void, resetKey: unknown) {
  const [left, setLeft] = useState(seconds);
  const endsAt = useRef(0);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    endsAt.current = Date.now() + seconds * 1000;
    setLeft(seconds);
  }, [seconds, resetKey]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const l = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        onEndRef.current();
      }
    }, 250);
    return () => clearInterval(t);
  }, [running, resetKey]);

  return left;
}
