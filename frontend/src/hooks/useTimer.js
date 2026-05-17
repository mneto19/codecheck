import { useState, useEffect } from "react";

// Hook que calcula o tempo restante de um exame com base no startedAt e timerSeconds
export function useTimer(startedAt, timerSeconds) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!startedAt || !timerSeconds) return;

    // Atualiza o tempo restante a cada segundo
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      const left = Math.max(0, Math.floor(timerSeconds - elapsed));
      setRemaining(left);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, timerSeconds]);

  // Formata segundos como MM:SS
  const format = (secs) => {
    if (secs === null) return "--:--";
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return { remaining, formatted: format(remaining), expired: remaining === 0 };
}
