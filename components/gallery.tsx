"use client";
// filename: components/gallery.tsx
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselControls,
} from "./ui/carousel";
export function Gallery({
  images,
}: {
  images: { src: string; alt: string; width: number; height: number }[];
}) {
  return (
    <Carousel>
      <CarouselContent>
        {images.map(({ src, alt, width, height }, i) => (
          <CarouselItem key={src}>
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              sizes="(max-width: 800px) 100vw, 55vw"
              priority={i === 0}
              unoptimized={src.startsWith("/media/")}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselControls />
    </Carousel>
  );
}
