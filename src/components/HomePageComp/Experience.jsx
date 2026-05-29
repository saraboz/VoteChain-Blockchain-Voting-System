import React from 'react';
import soci from '../assets/soci.png';
import stats from '../assets/stats.png';
import bulb from '../assets/bulb.png';

const Experience = ()=>{
    return (
        <section className="bg-gray-900 text-white py-36 px-6 ">
        <div className="max-w-4xl mx-auto text-center">
            {/* <!-- Section Title --> */}
            <h2 className="font-bold  text-gray-100 underline decoration-amber-200 italic text-[55px]">Experience VoteChain</h2>
            
            <p className="text-lg text-gray-300 mt-4 font-[Poppins]">
                We leverage cutting-edge technology so people can vote securely from anywhere
                and administrators can manage elections with ease.
            </p>
        </div>
    
        {/* <!-- Features Container --> */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 mt-16">
            {/* <!-- Accessible --> */}
            <div className="bg-indigo-900 p-12 rounded-lg text-center max-w-xs h-[400px] w-[375] flex flex-col justify-center  items-center  font-[Poppins]">
                <img src={soci} alt="Accessible" className="w-12 mx-auto"/>
                <h3 className="text-sky-200 text-2xl font-semibold mt-4">ACCESSIBLE</h3>
                <p className="text-gray-300 mt-2">
                    We leverage web-based accessibility features to enable voters to submit
                    their ballot from anywhere in the world.
                </p>
            </div>
    
            {/* <!-- Accurate --> */}
            <div className="bg-indigo-900 p-12 rounded-lg text-center max-w-xs h-[400px] w-[375] flex flex-col justify-center  items-center  font-[Poppins]">
                <img src={stats} alt="Accurate" className="w-12 mx-auto" />
                <h3 className="text-sky-200 text-2xl font-semibold mt-4">ACCURATE</h3>
                <p className="text-gray-300 mt-2">
                    Our process generates a voter-verifiable paper trail, allowing for audits
                    and optional instant results tabulation.
                </p>
            </div>
    
            {/* <!-- Seamless --> */}
            <div className="bg-indigo-900 p-12 rounded-lg text-center max-w-xs h-[400px] w-[375] flex flex-col justify-center  items-center  font-[Poppins]">
                <img src= {bulb} alt="Seamless" className="w-12 mx-auto" />
                <h3 className="text-sky-200 text-2xl font-semibold mt-4">SEAMLESS</h3>
                <p className="text-gray-300 mt-2">
                    We've built our products to integrate with existing elections systems and
                    streamline the voting process.
                </p>
            </div>
        </div>
    </section>
    );
}

export default Experience;