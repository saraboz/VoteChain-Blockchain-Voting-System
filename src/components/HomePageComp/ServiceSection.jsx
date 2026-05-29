import React from 'react';
import surveyIcon from '../assets/checklist.png'
import electionIcon from '../assets/elections.png'
import corporateIcon from '../assets/office.png'

const ServicesSection = () => {
  return (
    <section className="bg-gray-900 text-white py-36 px-6 mx-auto ">
      <div className="max-w-4xl mx-auto text-center max-w-6xl  ">
        <h2 className="font-bold text-gray-100 underline decoration-emerald-300 italic text-[55px]"> Our Services</h2>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-12 mt-16 max-w-6xl font-[Poppins] text-2xl text-sky-100 mx-auto mt-20">
        <div className="text-center transition">
          <img src={electionIcon} alt="Governance Elections" className="w-50 mx-auto" />
          <p className="mt-4 ">Governance <br /> Elections</p>
        </div>

        <div className="text-center">
          <img src={surveyIcon} alt="Surveys" className="w-50 mx-auto" />
          <p className="mt-4 ">Surveys</p>
        </div>

        <div className="text-center">
          <img src={corporateIcon} alt="Corporate Decision-Making" className="w-50 mx-auto" />
          <p className="mt-4 ">Corporate <br /> Decision-Making</p>
        </div>
      </div>
    </section>
  );
}

export default ServicesSection;
