export function playIntroMusic(): { stop: () => void } {
  const music = new Audio("/audio/intro.mp3");
  music.volume = 0.55;
  music.play().catch(() => {});
  return {
    stop: () => {
      music.pause();
      music.src = "";
    },
  };
}
