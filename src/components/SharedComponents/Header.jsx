import React, { useEffect, useState, useCallback } from 'react';
import logo from '../../assets/bigo.png';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaInfoCircle, FaUser, FaSignInAlt, FaUserPlus, FaHome, FaBars, FaChevronDown } from 'react-icons/fa';
import ConnectWalletButton from '../../LoginPageComp/connectWallet';
import axios from 'axios';

const Header = ({ logoLeftPosition = -50 }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    const storedUserId = localStorage.getItem('userId');
    const storedWalletAddress = localStorage.getItem('walletAddress');

    if (token) {
      setIsAuthenticated(true);
      setRole(userRole);
      setUserId(storedUserId);
      setWalletAddress(storedWalletAddress);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (window.ethereum && token) {
      const fetchAndCompareWallet = async (accounts) => {
        const currentWallet = accounts[0];
        if (!currentWallet) return;
        try {
          const response = await axios.get('http://localhost:5000/api/users/check-wallet', {
            headers: { Authorization: `Bearer ${token}` }
          });

          const dbWallet = response.data.walletAddress;

          // Compare the current wallet with the registered one in the DB
          if (dbWallet && currentWallet.toLowerCase() !== dbWallet.toLowerCase()) {
            // alert mismatch
          }
        } catch (err) {
          console.error('❌ Error fetching wallet from DB: ', err.response?.data || err.message);
        }
      };

      const handleAccountsChanged = (accounts) => {
        fetchAndCompareWallet(accounts);
      };

      // Initial check on component mount (just in case the wallet is already connected)
      window.ethereum.request({ method: 'eth_accounts' }).then(fetchAndCompareWallet);

      // Listen for wallet changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);

      // Cleanup listener on component unmount
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login2');  // Redirect to home page after logout
  }, [navigate]);

  const displaySessionInfo = useCallback(async () => {
    const token = localStorage.getItem('token');
    const electionId = '15'; // Replace with actual ID if known

    console.log('Local Storage UserID:', localStorage.getItem('userId') || 'Not available');
    console.log('Local Storage Role:', localStorage.getItem('role') || 'Not available');
    console.log('Local Storage Token:', token || 'Not available');
    console.log('Local Store Wallet Address: ', localStorage.getItem('walletAddress') || 'Not available');

    if (token) {
      try {
        // ✅ First, fetch wallet address using check-wallet API
        const response = await axios.get('http://localhost:5000/api/users/check-wallet', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const walletAddress = response.data.walletAddress;
        console.log('✅ Wallet from DB:', walletAddress || 'No wallet Linked');

        if (walletAddress) {
          // ✅ After fetching wallet address, use it to fetch user's country
          const userResponse = await axios.get(`http://localhost:5000/api/users/${walletAddress}/country`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const userCountry = userResponse.data?.country || 'Country not found';
          console.log('✅ User country from DB:', userCountry);
        } else {
          console.log('❌ No wallet address found in DB');
        }
      } catch (err) {
        console.error('❌ Error fetching wallet or user country from DB:', err);
      }

      // ✅ Fetch eligible countries from blockchain for an election
      try {
        const countriesRes = await axios.get(`http://localhost:3001/elections/${electionId}/countries`);
        const countries = countriesRes.data?.countries || [];
        console.log('📦 Eligible countries from blockchain:', Array.isArray(countries) ? countries.join(', ') : 'Invalid format');
      } catch (err) {
        console.error('❌ Error fetching countries from blockchain:', err);
      }
    }
  }, []);

  // Function to handle navigation based on role
  const handleDashboardClick = () => {
    if (role === 'admin') {
      navigate('/adminDashboard');  // Navigate to the admin dashboard
    } else if (role === 'user') {
      navigate('/voterDashboard');  // Navigate to the user dashboard
    }
  };

  return (
    <header className="bg-[#29227d] shadow-2xl sticky top-0 z-50 font-['Poppins']">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center relative">
        {/* Logo */}
        <div className="w-full md:w-1/4 -left-40 -top-2 relative">
          <Link to="/">
            <img src={logo} alt="VoteChain Logo" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-wrap gap-2 mb-2 md:mb-0 justify-around w-full md:w-2/4">
          <Link
            to="/"
            className="flex items-center gap-1 px-3 py-1.5 text-white text-md rounded-md hover:ring-2 hover:ring-indigo-300 transition"
          >
            <FaHome /> Home
          </Link>
          {isAuthenticated && (
            <>
              <button
                onClick={displaySessionInfo}
                className="flex items-center gap-1 px-3 py-1.5 text-md text-white rounded-md hover:ring-2 hover:ring-indigo-300 transition bg-transparent"
              >
                <FaInfoCircle /> Info
              </button>
              <button
                onClick={handleDashboardClick}
                className="flex items-center gap-1 px-3 py-1.5 text-md text-white rounded-md hover:ring-2 hover:ring-indigo-300 transition bg-transparent"
              >
                <FaBars /> Dashboard
              </button>
            </>
          )}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center ml-20 gap-2 relative -right-32">
          {isAuthenticated ? (
            <>
              <button
                onClick={handleLogout}
                className="flex bg-transparent items-center gap-1 px-3 py-1.5 text-white text-md rounded-md hover:ring-2 hover:ring-indigo-300 transition"
              >
                <FaSignOutAlt /> Logout
              </button>

              <div className="relative">
                <button
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md bg-indigo-700 hover:ring-2 hover:bg-transparent hover:ring-indigo-300 transition"
                >
                  <FaUser />
                  <span className="capitalize font-semibold text-md">
                    {role}
                  </span>
                  <FaChevronDown
                    className={`text-xs transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-indigo-200 rounded-md shadow-lg z-50 p-3 space-y-2">
                    <div className="text-md text-gray-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-indigo-900">
                          ID: {" "}
                          <span className="text-indigo-700 truncate max-w-[180px]">
                            {userId}
                          </span>
                        </span>
              </div>
                      <span className="font-medium text-indigo-900">
                        Wallet:&nbsp;
                      </span>
                      <span
                        className="truncate w-full text-indigo-700"
                        title={walletAddress}
                      >
                        {walletAddress && walletAddress.length > 16
                          ? `${walletAddress.substring(
                              0,
                              8
                            )}...${walletAddress.substring(
                              walletAddress.length - 8
                            )}`
                          : walletAddress}
                      </span>
                </div>
                    <ConnectWalletButton />
                </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login2"
                className="text-white px-3 py-1.5 rounded-md text-md font-medium hover:ring-2 hover:ring-blue-300 transition"
              >
                <FaSignInAlt className="inline-block mr-1" /> Login
              </Link>
              <Link
                to="/register"
                className="text-white px-3 py-1.5 rounded-md text-md font-medium hover:ring-2 hover:ring-indigo-300 transition"
              >
                <FaUserPlus className="inline-block mr-1" /> Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;