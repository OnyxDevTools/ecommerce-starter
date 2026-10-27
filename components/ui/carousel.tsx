"use client";
// filename: components/ui/carousel.tsx
// Local shadcn-style Carousel composition, powered by Embla.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "./button";
const Context = createContext<ReturnType<typeof useEmblaCarousel> | null>(null);
function useCarousel() {
  const value = useContext(Context);
  if (!value) throw new Error("Carousel context required");
  return value;
}
export function Carousel({ children }: { children: ReactNode }) {
  const value = useEmblaCarousel({ loop: false });
  return (
    <Context.Provider value={value}>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Product images"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") value[1]?.scrollPrev();
          if (e.key === "ArrowRight") value[1]?.scrollNext();
        }}
      >
        {children}
      </div>
    </Context.Provider>
  );
}
export function CarouselContent({ children }: { children: ReactNode }) {
  const [ref] = useCarousel();
  return (
    <div ref={ref} className="gallery-viewport">
      <div className="gallery-track">{children}</div>
    </div>
  );
}
export function CarouselItem({ children }: { children: ReactNode }) {
  return (
    <div role="group" aria-roledescription="slide" className="gallery-slide">
      {children}
    </div>
  );
}
export function CarouselControls() {
  const [, api] = useCarousel(),
    [index, setIndex] = useState(0);
  useEffect(() => {
    if (!api) return;
    const update = () => setIndex(api.selectedScrollSnap());
    api.on("select", update);
    return () => {
      api.off("select", update);
    };
  }, [api]);
  return (
    <div className="gallery-controls">
      <span>
        View {index + 1} of {api?.scrollSnapList().length || 2}
      </span>
      <div>
        <Button
          variant="outline"
          aria-label="Previous image"
          onClick={() => api?.scrollPrev()}
          disabled={index === 0}
        >
          ←
        </Button>{" "}
        <Button
          variant="outline"
          aria-label="Next image"
          onClick={() => api?.scrollNext()}
          disabled={!!api && index === api.scrollSnapList().length - 1}
        >
          →
        </Button>
      </div>
    </div>
  );
}
