import React from "react";
import Header from "../../components/SharedComponents/Header";
import Footer from "../../components/SharedComponents/Footer";
import maleIcon from "../../components/assets/maleicon.png"


const ElectionDetail = () => {
    return (
        <div className="w-[121.8%]">
            <Header />
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 min-h-screen p-4 md:p-8">
                <div className="max-w-6xl mx-auto bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Election Header */}
                    <div className="bg-gray-800 p-6 border-b border-gray-700">
                        <div className="flex flex-col md:flex-row items-center justify-between">
                            <div>
                                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent mb-2">
                                    National Election 2024
                                </h1>
                                <p className="text-gray-400 text-lg">Official Election Information and Candidate Details</p>
                            </div>
                            <div className="mt-4 md:mt-0 flex items-center space-x-4">
                                <div className="bg-blue-900 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="bg-green-900 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Election Key Details */}
                    <div className="grid md:grid-cols-3 gap-6 p-6 bg-gray-800">
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <div className="flex items-center mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <h3 className="text-xl font-semibold text-blue-300">Election Date</h3>
                            </div>
                            <p className="text-gray-300">November 5, 2024</p>
                            <p className="text-gray-500 text-sm">Polling Hours: 7:00 AM - 8:00 PM</p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <div className="flex items-center mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <h3 className="text-xl font-semibold text-green-300">Voting Locations</h3>
                            </div>
                            <p className="text-gray-300">All Registered Polling Stations</p>
                            <p className="text-gray-500 text-sm">Check your local voting center</p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <div className="flex items-center mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="text-xl font-semibold text-purple-300">Election Type</h3>
                            </div>
                            <p className="text-gray-300">National Parliamentary Election</p>
                            <p className="text-gray-500 text-sm">Proportional Representation</p>
                        </div>
                    </div>

                    {/* Candidate Overview */}
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-blue-300 mb-6 border-b border-gray-700 pb-3">
                            Candidate Overview
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                                <div className="flex items-center mb-4">
                                    <img
                                        src={maleIcon}
                                        alt="Candidate 1"
                                        className="w-20 h-20 rounded-full border-3 border-blue-500 object-cover mr-4"
                                    />
                                    <div>
                                        <h3 className="text-xl font-semibold text-blue-300">John Doe</h3>
                                        <p className="text-gray-400">Progressive Party</p>
                                    </div>
                                </div>
                                <p className="text-gray-300 text-sm">
                                    Experienced politician with 15 years of public service. Focusing on economic reform and social welfare.
                                </p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                                <div className="flex items-center mb-4">
                                    <img
                                        src={maleIcon}
                                        alt="Candidate 2"
                                        className="w-20 h-20 rounded-full border-3 border-green-500 object-cover mr-4"
                                    />
                                    <div>
                                        <h3 className="text-xl font-semibold text-green-300">Jane Smith</h3>
                                        <p className="text-gray-400">Conservative Alliance</p>
                                    </div>
                                </div>
                                <p className="text-gray-300 text-sm">
                                    Advocate for fiscal responsibility and national security. Brings a strong business background to politics.
                                </p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                                <div className="flex items-center mb-4">
                                    <img
                                        src={maleIcon}
                                        alt="Candidate 3"
                                        className="w-20 h-20 rounded-full border-3 border-purple-500 object-cover mr-4"
                                    />
                                    <div>
                                        <h3 className="text-xl font-semibold text-purple-300">Alex Johnson</h3>
                                        <p className="text-gray-400">Independent Candidate</p>
                                    </div>
                                </div>
                                <p className="text-gray-300 text-sm">
                                    Independent voice pushing for comprehensive political reform and grassroots representation.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Election Process */}
                    <div className="bg-gray-800 p-6">
                        <h2 className="text-2xl font-bold text-blue-300 mb-6 border-b border-gray-700 pb-3">
                            Voting Process
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-gray-900 p-4 rounded-lg">
                                <h3 className="text-xl font-semibold text-green-300 mb-3">
                                    Voter Eligibility
                                </h3>
                                <ul className="space-y-2 text-gray-300">
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Must be 18 years or older
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Registered voter in current district
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Valid government-issued ID
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-gray-900 p-4 rounded-lg">
                                <h3 className="text-xl font-semibold text-blue-300 mb-3">
                                    Voting Steps
                                </h3>
                                <ol className="space-y-2 text-gray-300">
                                    <li className="flex items-center">
                                        <span className="text-blue-400 font-bold mr-3">1.</span>
                                        Verify registration at polling station
                                    </li>
                                    <li className="flex items-center">
                                        <span className="text-blue-400 font-bold mr-3">2.</span>
                                        Receive official ballot
                                    </li>
                                    <li className="flex items-center">
                                        <span className="text-blue-400 font-bold mr-3">3.</span>
                                        Mark your preferred candidate
                                    </li>
                                    <li className="flex items-center">
                                        <span className="text-blue-400 font-bold mr-3">4.</span>
                                        Cast ballot in secured box
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Call to Action */}
                    <div className="bg-gray-900 p-8 text-center">
                        <h2 className="text-3xl font-bold text-blue-300 mb-4">
                            Your Vote Matters
                        </h2>
                        <p className="text-gray-400 mb-6">
                            Participate in the democratic process. Every vote counts in shaping our future.
                        </p>
                        <div className="flex justify-center space-x-4">
                            <button
                                className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-8 rounded-lg hover:from-green-600 hover:to-green-700 transition transform hover:scale-105"
                                onClick={() => navigate('/register')}
                            >
                                Register to Vote
                            </button>
                            <button
                                className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
                                onClick={() => navigate('/find-polling-station')}
                            >
                                Find Polling Station
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ElectionDetail;