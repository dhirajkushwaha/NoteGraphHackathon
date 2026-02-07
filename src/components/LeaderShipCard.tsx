
import React from 'react'

import people from "../app/(temp)/about/people.json"
import { usePopup } from '@/context/PopupContext';


function LeaderShipCard() {
    const { openPopup } = usePopup();
    return (
        <div>
            {
                people.map((person, index) => (
                    <div key={index} onClick={() => openPopup("profile", person)} className='cursor-pointer group relative w-[280px] rounded-[20px] overflow-hidden h-[350px] ' >
                        <img className='absolute  z-0 transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-[0.7] rounded-[20px]' src={person.url} alt={person.name} />

                        <div className=' h-[100%] relative flex flex-col justify-end z-[1]    transition-opacity duration-300 group-hover:opacity-0' >
                            <div className='p-1 px-3 bg-[#1e1e1ebd]  text-white rounded-[18px]'>
                                <div>
                                    <h2 className='w-fit  text-white   pb-0 poppins    text-2xl lg:text-2xl '   > {person.name} </h2>
                                    <p className='mt-1 font-light text-white w-fit  text-[14px]' > {person.position} </p>

                                </div>

                            </div>
                        </div>


                        <div className='w-[100%]   absolute transition-all duration-300 bottom-[-40px] opacity-0   group-hover:opacity-100 group-hover:bottom-0'>
                            <img className=' absolute z-2 w-[100%] ' src="/img/about/personhover.svg" alt="" />
                            <div className='mt-[20px] relative z-3 p-3  flex items-center justify-between' >
                                <div className=''>
                                    <h2 className='fontA  font-bold text-2xl lg:text-3xl text-[#272727]' > {person.name} </h2>
                                    <p className='  font-light    text-[#272727] text-[15px] ' > {person.position}  </p>

                                </div>
                                <div className='bg-[#3b3b3b33] p-3 rounded-[10px]'>
                                    <img className=' ' src="/img/about/arrowgreen.svg" alt="" />
                                </div>
                            </div>

                            <div className='p-3 pt-0 relative z-3 '>
                                <p className='w-fit text-[#272727] bg-white p-1 px-2 rounded-[10px]' >Know More</p>
                            </div>

                        </div>



                    </div>

                ))
            }
        </div>
    )
}

export default LeaderShipCard
