import React, { useState } from "react";
import bulb from '../components/assets/bulb.png';
import Header from '../components/SharedComponents/Header';
import Footer from '../components/SharedComponents/Footer';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '@fortawesome/fontawesome-free';
// import "../styles/loginStyle.css";
import '../styles/loginStyle.css';
import { connectWallet as connectMetaMaskWallet, authenticateWithWallet } from '../utils/blockchainService';
import { showModalAlert } from '../components/SharedComponents/Alert';

const LoginPage = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [walletAddress, setWalletAddress] = useState(null);
    const [token, setToken] = useState('');
    const [needWallet, setNeedWallet] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', {
                userId,
                password
            });

            const { role, token, walletAddress } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('role', role);
            localStorage.setItem('userId', userId);

            if (walletAddress) {
                localStorage.setItem('walletAddress', walletAddress);
            }

            setToken(token);
            setWalletAddress(walletAddress);

            showModalAlert({
                type: 'success',
                title: 'Login Successful',
                message: `You have logged in successfully as ${role}.`,
                buttonText: 'OK',
            });

            if (!walletAddress) {
                // Store that user needs to connect a wallet
                setNeedWallet(true);
                // Stay on the login page if wallet connection is required
            } else {
                // If wallet already exists, redirect to the appropriate dashboard
                localStorage.setItem('walletAddress', walletAddress);
                navigate(role === 'admin' ? '/adminDashboard' : '/voterDashboard');
            }
        } catch (err) {
            showModalAlert({
                type: 'error',
                title: 'Login Failed',
                message: `Login Failed, Check your information & try again.\nFailure Reason: ${err.response?.data?.message}`,
                buttonText: 'OK',
            });
        }
    };

    // Renamed to connectWalletAndLink to avoid naming conflict with imported function
    const connectWalletAndLink = async () => {
        if (!window.ethereum) {
            showModalAlert({
                type: 'error',
                title: 'MetaMask Not Installed',
                message: 'MetaMask is not installed. Please install it to continue.',
                buttonText: 'Install MetaMask',
            });
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];
            setWalletAddress(address);
            localStorage.setItem('walletAddress', address);

            await axios.post(
                'http://localhost:5000/api/users/link-wallet',
                { walletAddress: address },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            showModalAlert({
                type: 'success',
                title: 'Wallet Linked Successfully',
                message: 'Your wallet has been linked successfully!',
                buttonText: 'OK',
            });
            const role = localStorage.getItem('role');
            navigate(role === 'admin' ? '/gov' : '/voterDashboard');
        } catch (err) {
            console.error(err);
           showModalAlert({
                type: 'error',
                title: 'Wallet Connection Failed',
                message: 'Failed to connect your wallet. Please try again.',
                buttonText: 'Try Again',
            });
        }
    };

    // Fixed handleMetaMaskLogin function
    const handleMetaMaskLogin = async () => {
        setIsLoading(true);
        setError('');

        try {
            // First connect to the wallet
            const connectResult = await connectMetaMaskWallet();

            if (!connectResult.status) {
                setError(connectResult.error);
                setIsLoading(false);
                return;
            }

            const { walletAddress } = connectResult.data;
            setWalletAddress(walletAddress);

            console.log("Connected to wallet:", walletAddress);

            // Then authenticate with our backend
            try {
                const response = await axios.post('http://localhost:5000/api/auth/wallet-login', {
                    walletAddress
                });

                const { token, role, userId } = response.data;

                // Store in localStorage
                localStorage.setItem('token', token);
                localStorage.setItem('role', role);
                localStorage.setItem('userId', userId);
                localStorage.setItem('walletAddress', walletAddress);

                // Navigate to the appropriate dashboard
                showModalAlert({
                    type: 'success',
                    title: 'Login Successful',
                    message: 'You have successfully logged in with your wallet!',
                    buttonText: 'OK',
                });
                navigate(role === 'admin' ? '/adminDashboard' : '/voterDashboard');

            } catch (authError) {
                console.error("Authentication error:", authError);
                if (authError.response?.status === 401) {
                    setError('This wallet is not registered with any account. Please login with username/password first and link your wallet.');
                } else {
                    setError(authError.response?.data?.message || 'Authentication failed');
                }
            }

        } catch (err) {
            console.error('MetaMask login error:', err);
            setError(err.message || 'Login with MetaMask failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="">
            <Header />
            <div className="min-h-screen flex flex-col hero-pattern transform scale-90">
                <div className="flex-grow flex items-center justify-center py-16 px-8">
                    <div className="max-w-5xl w-full mx-auto login-card bg-white flex flex-col md:flex-row shadow-2xl">

                        {/* Left Panel */}
                        <div className="w-full md:w-1/2 left-panel text-white p-12 rounded-l-lg flex flex-col justify-center items-center">
                            <div className="relative z-10 text-center">
                                <img src={bulb} alt="VoteChain Logo" className="mx-auto mb-6 rounded-full bg-white p-3" />
                                <h2 className="text-4xl font-bold mb-4 welcome-text">Welcome Back!</h2>
                                <p className="text-xl opacity-90 mb-8">Login to continue and get<br />back to what matters.</p>

                                <div className="bg-white bg-opacity-10 p-5 rounded-xl backdrop-filter backdrop-blur-sm mt-6">
                                    <p className="text-sm font-medium mb-3">Trusted by organizations worldwide</p>
                                    <div className="flex justify-center space-x-6">
                                        <i className="fas fa-university text-2xl"></i>
                                        <i className="fas fa-building text-2xl"></i>
                                        <i className="fas fa-landmark text-2xl"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-5 flex space-x-3 floating-bubbles">
                                <span className="h-3 w-3 bg-white rounded-full"></span>
                                <span className="h-3 w-3 bg-white rounded-full"></span>
                                <span className="h-3 w-3 bg-white rounded-full"></span>
                            </div>
                        </div>

                        {/* Login Form */}
                        <div className="w-full md:w-1/2 p-12">
                            <h2 className="text-3xl font-bold mb-8 text-gray-800">Login to your account</h2>

                            {/* MetaMask Direct Login Button */}
                            <div className="mb-8">
                                <button
                                    onClick={handleMetaMaskLogin}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center space-x-2 py-4 px-4 rounded-lg transition-all transform hover:scale-[1.02]"
                                    style={{
                                        background: 'linear-gradient(90deg, #F6851B 0%, #F5A623 100%)',
                                        color: 'white',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {isLoading ? (
                                        <span>Connecting...</span>
                                    ) : (
                                        <>
                                            <img
                                                src="https://cdn.worldvectorlogo.com/logos/metamask.svg"
                                                alt="MetaMask"
                                                className="w-6 h-6 mr-2"
                                            />
                                            <span className="text-lg">Login with MetaMask</span>
                                        </>
                                    )}
                                </button>
                                {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                            </div>

                            {/* Divider */}
                            <div className="flex items-center my-6">
                                <div className="flex-grow h-px bg-gray-300"></div>
                                <span className="px-3 text-gray-500 text-sm">OR</span>
                                <div className="flex-grow h-px bg-gray-300"></div>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email / User ID</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <i className="fas fa-envelope text-white opacity-70"></i>
                                        </div>
                                        <input
                                            type="text"
                                            value={userId}
                                            onChange={(e) => setUserId(e.target.value)}
                                            className="input-field pl-12 py-4 w-full rounded-lg focus:outline-none text-white text-lg"
                                            placeholder="example@domain.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <div className="flex justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Password</label>
                                        <a href="#" className="text-sm text-indigo-600 hover:text-indigo-800">Forgot password?</a>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <i className="fas fa-lock text-white opacity-70"></i>
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input-field pl-12 py-4 w-full rounded-lg focus:outline-none text-lg"
                                            placeholder="Enter your password"
                                            required
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer">
                                            <i className="fas fa-eye text-white opacity-70 hover:opacity-100"></i>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center mt-6">
                                    <input id="remember-me" name="remember-me" type="checkbox" className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">Remember me</label>
                                </div>

                                <div className="mt-8">
                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-4 px-4 rounded-lg transition duration-200 flex justify-center items-center text-lg"
                                    >
                                        {isLoading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                                </svg>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Login
                                                <i className="fas fa-arrow-right ml-2"></i>
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="text-center mt-6">
                                    <p className="text-sm text-gray-600">
                                        Don't have an account?
                                        <Link to="/Register" className="font-medium text-indigo-600 hover:text-indigo-800"> Sign Up</Link>
                                    </p>
                                </div>
                            </form>

                            {needWallet && (
                                <div className="mt-6 text-center">
                                    <button onClick={connectWalletAndLink} className="text-indigo-600 font-medium hover:underline">
                                        Connect MetaMask Wallet
                                    </button>
                                </div>
                            )}

                            {walletAddress && (
                                <p className="text-green-600 text-sm mt-3 text-center">
                                    ✅ Wallet connected: {walletAddress}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default LoginPage;
