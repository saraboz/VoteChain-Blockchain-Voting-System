import { useEffect } from 'react';
import { setupWalletChangeListener } from './blockchainService';
import axios from 'axios';
import { showModalAlert } from '../components/SharedComponents/Alert';

/**
 * WalletMonitor - A component that monitors MetaMask wallet changes and enforces wallet validation
 * This should be placed high in the component tree to monitor wallet changes application-wide
 */
const WalletMonitor = () => {
  useEffect(() => {
    const walletAddress = localStorage.getItem('walletAddress');
    const token = localStorage.getItem('token');
    
    if (!walletAddress || !token) {
      return; // Not logged in with a wallet, nothing to monitor
    }
    
    // Function to handle logout when wallet changes
    const handleLogout = () => {
      console.log('WalletMonitor: Wallet changed, logging out');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      localStorage.removeItem('walletAddress');
      
      // Force redirect to login page
      window.location.href = '/';
      
      // Show alert to user
      showModalAlert({
        type: 'warning',
        title: 'MetaMask Address Changed',
        message: 'Your MetaMask wallet address changed. You have been logged out for security reasons.',
        buttonText: 'OK',
      });
    };
    
    // Set up a continuous wallet verification
    const verifyCurrentWallet = async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const currentWalletAddress = accounts[0];
            
            // Simple check - if addresses don't match (case-insensitive), logout immediately
            if (currentWalletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
              console.log('WalletMonitor: Active wallet mismatch detected');
              handleLogout();
              return;
            }
            
            // Also verify with the backend
            try {
              await axios.post(
                'http://localhost:5000/api/auth/verify-wallet',
                { walletAddress: currentWalletAddress },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            } catch (error) {
              console.error('WalletMonitor: Backend verification failed', error);
              // If backend rejects the wallet, logout
              if (error.response && (error.response.status === 403 || error.response.status === 401)) {
                handleLogout();
              }
            }
          }
        }
      } catch (error) {
        console.error('WalletMonitor: Error checking wallet', error);
      }
    };
    
    // Initial verification
    verifyCurrentWallet();
    
    // Set up the listener from our blockchain service
    const cleanup = setupWalletChangeListener(walletAddress, handleLogout);
    
    // Additionally, poll for changes regularly (as a fallback)
    const intervalId = setInterval(verifyCurrentWallet, 10000); // Check every 10 seconds
    
    // Clean up listeners and intervals when component unmounts
    return () => {
      if (cleanup) {
        cleanup();
      }
      clearInterval(intervalId);
    };
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default WalletMonitor;
