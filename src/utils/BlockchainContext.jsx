import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { checkWalletRegistered, getUuidByWallet } from './blockchainService';

// Create the blockchain context
const BlockchainContext = createContext();

// Provider component that wraps the app and makes blockchain data available
export function BlockchainProvider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userUuid, setUserUuid] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to check registration status - pulled out to be reusable
  const checkRegistrationStatus = useCallback(async (walletAddress) => {
    try {
      // Always fetch fresh data from the blockchain
      const response = await checkWalletRegistered(walletAddress);
      console.log("Registration status response:", response);
      
      // Handle both response formats
      let isUserRegistered = false;
      
      if (response && typeof response.registered === 'boolean') {
        // Direct format
        isUserRegistered = response.registered;
      } else if (response && response.status === true && response.data && typeof response.data.registered === 'boolean') {
        // Nested format
        isUserRegistered = response.data.registered;
      } else {
        console.warn("Unexpected registration check response format:", response);
        isUserRegistered = false;
      }
      
      setIsRegistered(isUserRegistered);
      
      if (isUserRegistered) {
        // Also get the UUID
        const uuidResponse = await getUuidByWallet(walletAddress);
        
        // Handle both UUID response formats
        let uuid = null;
        if (uuidResponse && uuidResponse.uuid) {
          // Direct format
          uuid = uuidResponse.uuid;
        } else if (uuidResponse && uuidResponse.status === true && uuidResponse.data && uuidResponse.data.uuid) {
          // Nested format
          uuid = uuidResponse.data.uuid;
        }
        
        setUserUuid(uuid);
      } else {
        setUserUuid(null);
      }
      
      return isUserRegistered;
    } catch (err) {
      console.error("Failed to check registration status:", err);
      setIsRegistered(false);
      setUserUuid(null);
      return false;
    }
  }, []);

  // Initialize connection to blockchain
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if MetaMask is installed
        if (window.ethereum) {
          // Create ethers provider instance
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(web3Provider);

          // Get network information
          const network = await web3Provider.getNetwork();
          setChainId(network.chainId);

          // Check for existing account connection
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            const currentAccount = accounts[0];
            setAccount(currentAccount);
            
            // Get signer
            const signerObj = await web3Provider.getSigner();
            setSigner(signerObj);
            
            // Check if wallet is registered - fetches fresh data
            await checkRegistrationStatus(currentAccount);
            setIsConnected(true);
          }

          // Set up listeners for account and chain changes
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', () => window.location.reload());
        } else {
          setError("MetaMask not installed. Please install MetaMask to use this application.");
        }
      } catch (err) {
        console.error("Blockchain initialization error:", err);
        setError(err.message || "Failed to connect to blockchain");
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Cleanup event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [checkRegistrationStatus]);

  // Handle account change in MetaMask
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      // User disconnected
      setAccount(null);
      setSigner(null);
      setIsConnected(false);
      setIsRegistered(false);
      setUserUuid(null);
    } else {
      // Account changed
      const newAccount = accounts[0];
      setAccount(newAccount);
      
      if (provider) {
        const signerObj = await provider.getSigner();
        setSigner(signerObj);
      }
      
      // Check registration status for new account - fetches fresh data
      await checkRegistrationStatus(newAccount);
      setIsConnected(true);
    }
  };

  // Connect wallet function
  const connectWallet = async () => {
    try {
      setError(null);
      
      if (!window.ethereum) {
        throw new Error("MetaMask not installed. Please install MetaMask to use this application.");
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentAccount = accounts[0];
      setAccount(currentAccount);
      
      // Get signer
      const signerObj = await provider.getSigner();
      setSigner(signerObj);
      
      // Check if wallet is registered - fetches fresh data
      await checkRegistrationStatus(currentAccount);
      
      setIsConnected(true);
      return true;
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet");
      return false;
    }
  };

  // Function to refresh registration status on-demand
  const refreshRegistrationStatus = async () => {
    if (!account) {
      setIsRegistered(false);
      return;
    }
    
    console.log("Checking if wallet is registered:", account);
    try {
      const result = await checkWalletRegistered(account);
      console.log("Registration check result:", result);
      
      // Handle both response formats
      if (result && typeof result.registered === 'boolean') {
        // Direct format: { registered: true/false }
        setIsRegistered(result.registered);
      } else if (result && result.status === true && result.data && typeof result.data.registered === 'boolean') {
        // Nested format: { status: true, data: { registered: true/false }}
        setIsRegistered(result.data.registered);
        console.log("Setting registration status from nested data:", result.data.registered);
      } else if (result && result.status === false) {
        console.warn("Error checking registration status:", result.error);
        // Do not change registration status on error - keep previous value
      } else {
        // Handle undefined or unexpected response
        console.warn("Unexpected registration check response format:", result);
        // If we can't determine status, assume not registered for safety
        setIsRegistered(false);
      }
    } catch (error) {
      console.error("Error checking registration status:", error);
      // Keep previous registration status on error
    }
  };

  // Disconnect wallet function (properly handles MetaMask disconnection)
  const disconnectWallet = async () => {
    // Clear our React state
    setAccount(null);
    setSigner(null);
    setIsConnected(false);
    setIsRegistered(false);
    setUserUuid(null);
    
    try {
      // Clear localStorage cache related to wallet connection
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Clear any MetaMask or wallet related cache
        if (key && (
            key.includes('metamask') || 
            key.includes('walletconnect') || 
            key.includes('wallet') ||
            key.includes('WALLETCONNECT')
          )) {
          localStorage.removeItem(key);
        }
      }
      
      // Attempt to clear MetaMask session if the wallet supports it
      if (window.ethereum && window.ethereum._metamask) {
        try {
          // This requests MetaMask to disconnect - may not work on all versions
          await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          });
        } catch (permError) {
          console.log('Permission request failed, using fallback method');
        }
      }
      
      // Clear session storage as well
      sessionStorage.clear();
      
      // Force reload window to clear any remaining state
      window.location.reload();
    } catch (err) {
      console.error("Error during wallet disconnect:", err);
      // Still reload the page even if there were errors
      window.location.reload();
    }
  };

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const value = {
    provider,
    signer,
    account,
    isConnected,
    isRegistered,
    userUuid,
    chainId,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    formatAddress,
    refreshRegistrationStatus
  };

  return <BlockchainContext.Provider value={value}>{children}</BlockchainContext.Provider>;
}

// Custom hook to use the blockchain context
export const useBlockchain = () => {
  const context = useContext(BlockchainContext);
  if (context === undefined) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
};

export default BlockchainContext; 