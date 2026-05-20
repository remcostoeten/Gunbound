import { useCallback, useEffect, useState } from "react";

const INTRO_FLAG = "remBoundIntroSeen";

export function useIntroFlag() {
  const [hasSeen, setHasSeen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage?.getItem(INTRO_FLAG) === "1") setHasSeen(true);
    } catch {}
  }, []);

  const markSeen = useCallback(() => {
    try { window.localStorage?.setItem(INTRO_FLAG, "1"); } catch {}
    setHasSeen(true);
  }, []);

  const reset = useCallback(() => {
    try { window.localStorage?.removeItem(INTRO_FLAG); } catch {}
    setHasSeen(false);
  }, []);

  return { hasSeen, markSeen, reset };
}
