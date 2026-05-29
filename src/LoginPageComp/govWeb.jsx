import React, { useState, useEffect } from "react";
import axios from "axios";
import Header from "../components/SharedComponents/Header";
import Footer from "../components/SharedComponents/Footer";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheckIcon, UserIcon, LockClosedIcon } from "@heroicons/react/24/solid";

const Gov = () => {
    const [citizenId, setCitizenId] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [walletAddress, setWalletAddress] = useState(null);
    const navigate = useNavigate();

    // Retrieve wallet address from localStorage on component mount
    useEffect(() => {
        const storedWalletAddress = localStorage.getItem('walletAddress');
        setWalletAddress(storedWalletAddress);

        // Optional: Check if wallet is connected
        if (!storedWalletAddress) {
            setMessage("⚠️ Wallet not connected. Please connect your wallet first.");
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        // Verify wallet is connected
        if (!walletAddress) {
            setMessage("❌ Wallet not connected. Please connect your wallet first.");
            setLoading(false);
            return;
        }

        try {
            // Step 1: Get eligibility data from government server
            const govResponse = await axios.post("http://localhost:5001/api/citizens/login", {
                idNumber: citizenId,
                password,
            });

            if (govResponse.status === 200) {
                const eligibilityData = govResponse.data.eligibilityData;
                console.log("✅ Eligibility data received: ", eligibilityData);
                setMessage("✅ Government verification successful. Updating your profile...");

                // Step 2: Send eligibility data to your server with wallet address
                try {
                    const voteChainResponse = await axios.post("http://localhost:5000/api/users/update-eligibility", {
                        walletAddress,
                        eligibilityData
                    });

                    if (voteChainResponse.status === 200) {
                        console.log("✅ Profile updated successfully:", voteChainResponse.data);
                        setMessage("✅ Verification complete! Your profile has been updated. Redirecting...");

                        // Redirect to voter dashboard instead of homepage
                        setTimeout(() => {
                            navigate("/voterDashboard");
                        }, 1500);
                    }
                } catch (voteChainError) {
                    console.error("❌ Profile update failed:", voteChainError.response?.data || voteChainError.message);
                    setMessage("❌ Government verification successful, but we couldn't update your profile. Please try again.");
                }
            }
        } catch (govError) {
            console.error("❌ Government verification failed: ", govError.response?.data || govError.message);
            
            // Check for 409 status (already registered)
            if (govError.response?.status === 409) {
                setMessage("❌ This citizen ID has already been registered for voting. Each citizen can only register once.");
                
                // Add a button to return to voter dashboard
                setTimeout(() => {
                    navigate("/voterDashboard");
                }, 3000);
            } else {
                setMessage("❌ Government verification failed. Please check your credentials.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="">
            <div className="w-full min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 flex flex-col">
                <Header />
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-md">
                        <div className="bg-white/10 backdrop-blur-lg shadow-2xl rounded-3xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-4xl">
                            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                <div className="text-center">
                                    <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600 mb-2 pl-4 border-l-4 border-cyan-400">
                                        Citizen Portal
                                    </h2>
                                    <p className="text-white/70 text-sm">Secure Government Access</p>
                                </div>

                                {/* Wallet Status */}
                                <div className="text-center">
                                    {walletAddress ? (
                                        <div className="text-green-400 text-sm flex items-center justify-center">
                                            <ShieldCheckIcon className="h-4 w-4 mr-1" />
                                            <span>Wallet Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                                        </div>
                                    ) : (
                                        <div className="text-yellow-400 text-sm">
                                            Please connect your wallet before proceeding
                                        </div>
                                    )}
                                </div>

                                {/* Citizen ID */}
                                <div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <UserIcon className="h-5 w-5 text-white/50" />
                                        </div>
                                        <input
                                            type="text"
                                            value={citizenId}
                                            onChange={(e) => setCitizenId(e.target.value)}
                                            placeholder="Enter your 12-digit Citizen ID"
                                            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 placeholder-white/40"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <LockClosedIcon className="h-5 w-5 text-white/50" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 placeholder-white/40"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading || !walletAddress}
                                    className={`w-full py-3 rounded-xl ${loading || !walletAddress
                                            ? "bg-gray-500 cursor-not-allowed"
                                            : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                                        } text-white font-bold transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50`}
                                >
                                    {loading ? "Verifying..." : "Login Securely"}
                                </button>
                            </form>
                        </div>

                        {/* Status Message */}
                        {message && (
                            <div className={`text-center mt-4 text-sm ${message.includes("❌")
                                    ? "text-red-400"
                                    : message.includes("⚠️")
                                        ? "text-yellow-400"
                                        : "text-green-400"
                                }`}>
                                {message}
                            </div>
                        )}

                        <div className="text-center text-white mt-6 text-sm space-y-2 opacity-70">
                            <p>Protected by Advanced Encryption | Official Government Portal</p>
                            <p>All access attempts are logged and monitored</p>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        </div>
    );
};

export default Gov;