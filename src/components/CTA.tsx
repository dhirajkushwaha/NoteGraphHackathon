import React from 'react'

import { usePopup } from '@/context/PopupContext';


interface CTAProps {
  className?: string;
  text: string;
}

function CTA( { className, text }: CTAProps  ) {
    const { openPopup } = usePopup();
    return (
        <div onClick={() => openPopup("meeting")} className={`   ${className} relative`}>

            <div className={`fontA CTABUTTON text-light glass-card cursor-pointer  z-2  flex   items-center justify-center !rounded-[16px]  h-[53.6px]`} style={{ backgroundColor: "rgb(3 , 255, 64 , 32%)", border: "1px solid rgb(81 134 83)" }}>
                <span> {text} </span>
            </div>

            <div className="!absolute top-[-10px] gradient-overlay opacity-60  z-1 !w-[140px] !h-[76px]" >

            </div>


        </div>
    )
}

export default CTA
