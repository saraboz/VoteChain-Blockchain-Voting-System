import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { showModalAlert } from './Alert';
/**
 * ProtectedRoute - A component that enforces authentication for protected routes
 * It checks if:
 * 1. User is logged in (has token)
 * 2. If user has a wallet: verify wallet matches stored address
 * 3. If user doesn't have a wallet: allow access based on token validity
 */
const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const verifyAuthentication = async () => {
      try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
          // Not logged in, no need to continue
          setLoading(false);
          return;
        }
        
        // Decode the token to check if walletAddress is required
        let decodedToken;
        try {
          decodedToken = jwtDecode(token);
        } catch (err) {
          console.error('Invalid token format:', err);
          handleLogout('Invalid token format. Please login again.');
          return;
        }
        
        // Check if this user even has a wallet address requirement
        const tokenHasWallet = decodedToken.walletAddress !== null && decodedToken.walletAddress !== undefined;
        
        if (!tokenHasWallet) {
          // User doesn't need wallet verification, they can proceed
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }
        
        // For users with wallet addresses, continue with wallet verification
        const storedWalletAddress = localStorage.getItem('walletAddress');
        
        // If user should have a wallet address but doesn't, that's a problem
        if (!storedWalletAddress) {
          console.log('ProtectedRoute: No wallet address found, logging out');
          handleLogout('No wallet address found. Please login again.');
          return;
        }
        
        // Check if MetaMask is available
        if (!window.ethereum) {
          console.log('ProtectedRoute: MetaMask not available, logging out');
          handleLogout('MetaMask extension is required. Please install or enable it and try again.');
          return;
        }
        
        // Get current wallet address from MetaMask
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
          console.log('ProtectedRoute: No MetaMask account connected, logging out');
          handleLogout('No MetaMask account connected. Please connect your wallet and try again.');
          return;
        }
        
        const currentWalletAddress = accounts[0];
        
        // Compare current wallet address with stored wallet address
        if (currentWalletAddress.toLowerCase() !== storedWalletAddress.toLowerCase()) {
          console.log('ProtectedRoute: Wallet address mismatch', {
            current: currentWalletAddress,
            stored: storedWalletAddress
          });
          handleLogout('Your wallet address has changed. Please login again with the correct wallet.');
          return;
        }
        
        // Verify wallet with backend
        try {
          await axios.post(
            'http://localhost:5000/api/auth/verify-wallet',
            { walletAddress: currentWalletAddress },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // If we reached here, authentication is successful
          setIsAuthenticated(true);
        } catch (error) {
          console.error('ProtectedRoute: Backend wallet verification failed', error);
          handleLogout('Your session is invalid. Please login again.');
          return;
        }
        
        setLoading(false);
      } catch (error) {
        console.error('ProtectedRoute: Authentication verification error', error);
        handleLogout('An error occurred during authentication. Please try again.');
      }
    };
    
    const handleLogout = (message) => {
      // Clear all auth data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      localStorage.removeItem('walletAddress');
      
      setIsAuthenticated(false);
      setLoading(false);
      
      // Show message if provided
      if (message) {
        showModalAlert({
          type: 'info',
          title: 'Information',
          message: message,  // Use the dynamic message passed
          buttonText: 'OK',
        });
      }
      
      // Force navigate to login page
      navigate('/Login2');
    };
    
    // Run verification on component mount
    verifyAuthentication();
    
    // Set up MetaMask listeners for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        const token = localStorage.getItem('token');
        const storedWalletAddress = localStorage.getItem('walletAddress');
        
        // If logged in and accounts changed or disappeared
        if (token && storedWalletAddress) {
          if (!accounts || !accounts.length || 
              accounts[0].toLowerCase() !== storedWalletAddress.toLowerCase()) {
            handleLogout('Your wallet address has changed. You have been logged out for security reasons.');
          }
        }
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Clean up listener on unmount
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [navigate]);
  
  // Show loading state
  if (loading) {
    return <div>Verifying authentication...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/Login2" />;
  }
  
  // If authenticated, render the protected route
  return children;
};

export default ProtectedRoute;
