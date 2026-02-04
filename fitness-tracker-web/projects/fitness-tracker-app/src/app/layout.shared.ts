export const SLIDES = [
  'assets/slideshow/GymBild1.png',
  'assets/slideshow/GymBild2.png',
  'assets/slideshow/GymBild3.jpg',
  'assets/slideshow/GymBild5.png',
  'assets/slideshow/GymBild6.png',
  'assets/slideshow/GymBild7.png',
  'assets/slideshow/Bild8.png',
];

export const SLIDE_INTERVAL_MS = 4000;

export function startSlideshow(
  slideCount: number,
  onAdvance: (nextIndex: number) => void
): number | undefined {
  if (slideCount <= 1) {
    return undefined;
  }

  let currentIndex = 0;

  return window.setInterval(() => {
    currentIndex = (currentIndex + 1) % slideCount;
    onAdvance(currentIndex);
  }, SLIDE_INTERVAL_MS);
}

export function stopSlideshow(timerId?: number): void {
  if (timerId === undefined) {
    return;
  }

  window.clearInterval(timerId);
}
