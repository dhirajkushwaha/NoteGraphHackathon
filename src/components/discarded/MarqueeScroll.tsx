"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import Image from "next/image";

import "swiper/css";

type MarqueeScrollProps = {
  images: string[];
};

export default function MarqueeSwiper({ images }: MarqueeScrollProps) {
  return (
    <div className="w-full overflow-hidden">
      <Swiper
        modules={[Autoplay]}
        spaceBetween={48} // matches your `gap-8 md:gap-12`
        slidesPerView="auto"
        loop={true}
        
        freeMode={true} 
        speed={6000}
        autoplay={{
          delay: 0,
          disableOnInteraction: false,
        }}
        allowTouchMove={false}
      >
        {images.concat(images).map((src, i) => (
          <SwiperSlide
            key={i}
            className="!w-auto flex items-center justify-center"
          >
            {/* <Image
              src={src}
              alt={`marquee-img-${i}`}
              width={150}
              height={60}
              className="object-contain opacity-90 hover:opacity-100 transition"
            /> */}
            <img src={src} alt={`marquee-img-${i}`} className="object-contain opacity-90 hover:opacity-100 transition" />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
