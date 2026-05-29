import React, { useState } from "react";
import Header from '../components/SharedComponents/Header';
import Footer from '../components/SharedComponents/Footer';
import { Link, useNavigate } from 'react-router-dom';
import 'font-awesome/css/font-awesome.min.css';
import '../styles/signUpStyle.css';
import axios from 'axios';
import { useBlockchain } from '../utils/BlockchainContext';
import { registerUser } from '../utils/blockchainService';

const SignUp = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [role, SetRole] = useState('user');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    
    // Get blockchain context
    const { account, isConnected, connectWallet, error: walletError } = useBlockchain();

    const handleWalletConnect = async () => {
        if (!isConnected) {
            await connectWallet();
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Check if wallet is connected
        if (!isConnected) {
            setError('Please connect your blockchain wallet first');
            setLoading(false);
            return;
        }

        try {
            // First register user in the MongoDB database
            const response = await axios.post('http://localhost:5000/api/auth/register', {
                userId,
                password,
                role,
                walletAddress: account // Include wallet address in registration
            });

            // Then register user in the blockchain
            try {
                const blockchainResponse = await registerUser(userId, account);
                
                if (blockchainResponse.status) {
                    setSuccess("Registration successful! You have been registered in both the database and on the blockchain.");
                    setUserId('');
                    setPassword('');
                    SetRole('user');
                    
                    // Redirect after success
                    setTimeout(() => {
                        navigate('/voterDashboard');
                    }, 2000);
                } else {
                    setError("Database registration successful, but blockchain registration failed. Please try again.");
                }
            } catch (blockchainErr) {
                console.error("Blockchain registration error:", blockchainErr);
                setError(`Database registration successful, but blockchain registration failed: ${blockchainErr.message}`);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Registration Failed';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-[]">
            <Header />
            <div className="min-h-screen flex items-center justify-center p-4 hero-pattern transform scale-90">
                <div className="max-w-5xl w-full mx-auto signup-card bg-white flex flex-col md:flex-row">
                    {/* Left Panel */}
                    <div className="w-full md:w-5/12 left-panel text-white p-8 md:p-12 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10">
                            <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white"></div>
                            <div className="absolute bottom-10 right-10 w-24 h-24 rounded-full bg-white"></div>
                            <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full bg-white"></div>
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">Welcome Aboard!</h2>
                            <p className="text-lg md:text-xl opacity-90 mb-6">Join our blockchain voting platform and make your voice heard.</p>

                            <div className="flex items-center space-x-4 mb-8">
                                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                    <i className="fas fa-shield-alt text-white"></i>
                                </div>
                                <p className="text-sm">Secure blockchain-based voting</p>
                            </div>

                            <div className="flex items-center space-x-4 mb-8">
                                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                    <i className="fas fa-bolt text-white"></i>
                                </div>
                                <p className="text-sm">Transparent and tamper-proof</p>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                    <i className="fas fa-user-friends text-white"></i>
                                </div>
                                <p className="text-sm">Cast your vote securely in blockchain elections</p>
                            </div>
                        </div>

                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
                            <span className="h-2 w-2 bg-white rounded-full pulse-circle"></span>
                            <span className="h-2 w-2 bg-white rounded-full pulse-circle" style={{ animationDelay: '0.2s' }}></span>
                            <span className="h-2 w-2 bg-white rounded-full pulse-circle" style={{ animationDelay: '0.4s' }}></span>
                        </div>
                    </div>

                    {/* Right Panel - Form */}
                    <div className="w-full md:w-7/12 p-8 md:p-12">
                        <div className="max-w-md mx-auto">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-800">Create Account</h3>
                                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                                    <i className="fas fa-user-plus text-indigo-600"></i>
                                </div>
                            </div>

                            {/* Wallet Connection Section */}
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                <div className="flex flex-col">
                                    <h4 className="text-md font-semibold text-gray-700 mb-2">Blockchain Wallet Connection</h4>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Connect your blockchain wallet to register for voting
                                    </p>
                                    <div className="flex items-center">
                                        <button 
                                            type="button" 
                                            onClick={handleWalletConnect}
                                            disabled={isConnected}
                                            className={`px-4 py-2 rounded-lg text-white text-sm ${isConnected ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'} transition-colors duration-200`}
                                        >
                                            {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
                                        </button>
                                        {isConnected && (
                                            <span className="ml-3 text-sm text-gray-700">
                                                Connected: {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : ''}
                                            </span>
                                        )}
                                    </div>
                                    {walletError && <p className="text-red-600 text-sm mt-2">{walletError}</p>}
                                </div>
                            </div>

                            <form className="space-y-6" onSubmit={handleRegister}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">UserID</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                            <i className="fas fa-envelope text-gray-400"></i>
                                        </span>
                                        <input
                                            type="text"
                                            name="userId"
                                            value={userId}
                                            onChange={(e) => setUserId(e.target.value)}
                                            className="form-input pl-10 py-3 w-full rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200 text-white"
                                            placeholder="Choose a unique UserID"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                            <i className="fas fa-lock text-gray-400"></i>
                                        </span>
                                        <input
                                            type="password"
                                            name="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="form-input pl-10 py-3 w-full rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200 text-white"
                                            placeholder="Create a strong password"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        id="terms"
                                        type="checkbox"
                                        required
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                                        I agree to the <a href="#" className="text-indigo-600 hover:text-indigo-800">Terms of Service</a> and <a href="#" className="text-indigo-600 hover:text-indigo-800">Privacy Policy</a>
                                    </label>
                                </div>

                                {error && <p className="text-red-600 text-sm">{error}</p>}
                                {success && <p className="text-green-600 text-sm">{success}</p>}

                                <div>
                                    <button
                                        type="submit"
                                        disabled={loading || !isConnected}
                                        className={`w-full ${loading || !isConnected ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex justify-center items-center`}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                                </svg>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Create Account
                                                <i className="fas fa-arrow-right ml-2"></i>
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="text-center">
                                    <p className="text-sm text-gray-600">
                                        Already have an account?
                                        <Link to="/Login" className="font-medium text-indigo-600 hover:text-indigo-800"> Sign In</Link>
                                    </p>
                                </div>

                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <button type="button" className="py-2 px-4 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center">
                                        <i className="fab fa-google text-red-500"></i>
                                    </button>
                                    <button type="button" className="py-2 px-4 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center">
                                        <i className="fab fa-facebook-f text-blue-600"></i>
                                    </button>
                                    <button type="button" className="py-2 px-4 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center">
                                        <i className="fab fa-apple text-gray-800"></i>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default SignUp;
