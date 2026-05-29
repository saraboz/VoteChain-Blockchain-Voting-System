import React from 'react';
import background from '../assets/background1.png'

const MainSection = () => {
  return (
    <section className="relative bg-blue-900 text-white py-14 bg-cover bg-center h-[90vh]"
      style={{ backgroundImage: `url(${background})` }}>
      <div className="container mx-auto mt-48 flex flex-col lg:flex-row items-center relative">
        <div className="lg:w-1/2 lg:text-left lg:ml-20" style={{ position: "relative", left: "40%" }}>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ fontSize: "5.5rem" }}>
            <span className="text-emerald-400 text-[110px]">Voting</span><br />
            <span className="text-amber-300 italic">Reinvented ,</span><br />
            <span className="text-emerald-400 italic">Trust</span>
            <span className="text-sky-300 italic">Secured</span>
          </h1>
          <p className="mt-6 text-xl text-white opacity-75 left-4 mr-20 relative font-[Poppins]">
            Empowering democracy with cutting-edge blockchain solutions for trusted, tamper-proof elections.
          </p>
          <div className="bg-amber-200 rounded-full flex items-center p-2 px-3 mt-4 w-full md:w-auto ]">
            <input type="text" placeholder="Enter Election/Survey ID" className="p-4 w-full bg-yellow-50 text-blue-700 rounded-full placeholder:text-indigo-500 focus:outline-none" />
            <button className="bg-emerald-500 text-white px-8 font-semibold text-lg leading-none py-3 rounded-full ml-2 hover:bg-[#4338ca] hover:scale-90 transition-all duration-300">
              Vote Now
            </button>
          </div>
        </div>
      </div>
      <button onClick={() => { window.open('http://localhost:5173/gov', '_blank') }} className="px-6 py-3 bg-indigo-600 text-white relative -left-3 font-semibold rounded-xl hover:bg-indigo-700 transition duration-300">
        Connect To Your Government Portal
      </button>
    </section>
  );
}

export default MainSection;