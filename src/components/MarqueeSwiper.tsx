"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import Image from "next/image";

// Import Swiper styles
import "swiper/css";

type MarqueeSwiperProps = {
  images: string[];
};

export default function MarqueeSwiper({ images }: MarqueeSwiperProps) {
  return (
    <div className="w-full overflow-hidden">
      <Swiper
        modules={[Autoplay]}
        spaceBetween={30}
        slidesPerView="auto"
        loop={true}
        speed={5000} // smooth continuous speed
        autoplay={{
          delay: 0, // no delay between slides
          disableOnInteraction: false,
        }}
        allowTouchMove={false} // purely marquee, no dragging
      >
        {images.concat(images).map((src, i) => (
          <SwiperSlide
            key={i}
            className="!w-auto flex items-center justify-center"
          >
            <Image
              src={src}
              alt={`marquee-img-${i}`}
              width={200}
              height={120}
              className="object-contain"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
