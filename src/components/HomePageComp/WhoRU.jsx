import React from "react";
import { useNavigate } from "react-router-dom";
import shapes from '../assets/ShapesCut.png';

const WhoAreU = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-950">
      <div className="container max-w-3xl mx-auto m-12 mx-40 py-4 -m-8 bg-indigo-100 rounded-lg shadow-md flex flex-col md:flex-row items-center">
        
        <div className="md:w-1/2 mt-20 text-center md:text-left text-indigo-950 font-[Poppins]">
          <h1 className="text-5xl font-bold mb-4 ">WHO ARE YOU?!</h1>
          <p className="text-lg mb-16">Login Based on your Role</p>
          
          <div className="space-y-8 mx-36">
            <button
              className="w-full bg-indigo-800 text-white py-3 rounded-full hover:bg-indigo-500 hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/Login')}  // Navigate to Election Admin
            >
              Election Admin
            </button>
            <button
              className="w-full bg-indigo-800 text-white py-3 rounded-full hover:bg-indigo-500 hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/Register')} // Navigate to Election Candidate page (Example)
            >
              Election Candidate
            </button>
            <button
              className="w-full bg-indigo-800 text-white py-3 rounded-full hover:bg-indigo-500 hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/Login')} // Navigate to Voter page (Example)
            >
              Voter
            </button>
          </div>

          <p className="text-sm text-indigo-400 mx-32 mt-32">
            All rights and personal information are protected and reserved according to our terms of services and customer relationship agreement.
          </p>
        </div>

        <div className="md:w-1/2 mt-8 md:mt-0">
          <img src={shapes} alt="Abstract Shapes" className="w-full p-12" />
        </div>

      </div>
    </div>
  );
};

export default WhoAreU;
