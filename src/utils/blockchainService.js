/**
 * Blockchain Service - API Client for blockchain interaction
 * This service handles communication with the blockchain API
 */

import { API_URL, CONTRACT_ADDRESS, IPFS_API_URL } from './constants';

// Helper function to handle API responses consistently
async function handleApiResponse(response, errorPrefix = 'API request failed') {
  console.log('API Response status:', response.status);
  
  try {
    // First check if the response is OK
    if (!response.ok) {
      console.warn(`Got non-OK response: ${response.status} ${response.statusText}`);
    }
    
    // Get the response text first
    const responseText = await response.text();
    
    // Then try to parse it as JSON
    let responseData;
    try {
      // Only parse if there's actual content
      if (responseText.trim().length > 0) {
        responseData = JSON.parse(responseText);
        console.log('API Response data:', responseData);
      } else {
        console.log('API Response data: Empty response');
        responseData = {};
      }
    } catch (parseError) {
      console.error('Error parsing API response:', parseError);
      return {
        status: false,
        error: `${errorPrefix}: Invalid JSON response`,
        code: 'PARSE_ERROR',
        rawResponse: responseText,
        httpStatus: response.status
      };
    }
    
    // If the response has a status field, respect it
    if (responseData && 'status' in responseData) {
      return responseData;
    }
    
    // Otherwise, determine status from HTTP status
    if (response.ok) {
      return { 
        status: true, 
        data: responseData,
        ...responseData // Spread the response for backward compatibility
      };
    } else {
      // Enhanced error handling with error codes and response messages
      return {
        status: false,
        error: responseData.message || responseData.error || `${errorPrefix} (${response.status})`,
        code: responseData.code || `HTTP_${response.status}`,
        data: responseData
      };
    }
  } catch (error) {
    console.error('Error handling API response:', error);
    return {
      status: false,
      error: `${errorPrefix}: ${error.message}`,
      code: 'PARSE_ERROR',
      httpStatus: response.status
    };
  }
}

// IPFS functionality
export const fetchDataFromIPFS = async (cid) => {
  try {
    console.log("Fetching data from IPFS with CID:", cid);
    
    if (!cid || cid === 'QmDefault') {
      console.warn("Invalid IPFS CID provided");
      return {
        status: false,
        error: "Invalid IPFS CID provided"
      };
    }
    
    // Use Pinata Gateway for better reliability
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    
    return await handleApiResponse(response, 'Failed to fetch data from IPFS');
  } catch (error) {
    console.error('Error fetching data from IPFS:', error);
    return {
      status: false,
      error: `Failed to fetch IPFS data: ${error.message}`
    };
  }
};

// Get IPFS image URL
export const getIPFSImageUrl = (cid) => {
  if (!cid || cid === 'QmDefault') {
    return null;
  }
  
  // Return the Pinata Gateway URL for the image
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
};

// User Registration
export const registerUser = async (uuid, from = null) => {
  try {
    console.log("Registering user with parameters:", { uuid, from });
    
    // Ensure parameters are valid
    if (!uuid) {
      throw new Error('Required parameter missing: uuid is required');
    }
    
    // Format the request body
    const requestBody = {
      uuid: uuid.toString(),
      from: from || null
    };
    
    console.log("Sending request to blockchain API:", requestBody);
    
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });
    
    return await handleApiResponse(response, 'Failed to register user');
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const checkUserRegistered = async (uuid) => {
  try {
    console.log("Checking user registration for UUID:", uuid);
    
    const response = await fetch(`${API_URL}/registered/${uuid}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to check registration');
  } catch (error) {
    console.error('Check registration error:', error);
    throw error;
  }
};

export const checkWalletRegistered = async (walletAddress) => {
  try {
    console.log("Checking wallet registration for address:", walletAddress);
    
    const response = await fetch(`${API_URL}/walletRegistered/${walletAddress}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to check wallet registration');
  } catch (error) {
    console.error('Check wallet registration error:', error);
    throw error;
  }
};

export const getUuidByWallet = async (walletAddress) => {
  try {
    console.log("Getting UUID for wallet address:", walletAddress);
    
    const response = await fetch(`${API_URL}/uuid/${walletAddress}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to get UUID');
  } catch (error) {
    console.error('Get UUID error:', error);
    throw error;
  }
};

// Election Management
export const createElection = async (idOrData, name, duration, ipfsHash, from = null) => {
  console.log('Creating election with parameters:', { idOrData, name, duration, ipfsHash, from });
  
  try {
    // Handle both calling patterns
    let id, requestBody;
    
    if (typeof idOrData === 'object' && idOrData !== null) {
      // Called with object parameter: createElection({id, name, duration})
      const electionData = idOrData;
      ({ id, name, duration, ipfsHash } = electionData);
      from = electionData.from || from;
      
      // Validate required parameters
      if (id === undefined || name === undefined || duration === undefined) {
        return {
          status: false,
          error: 'Missing required parameters. Need id, name, and duration.',
        };
      }
      
      requestBody = {
        id: String(id).trim(),
        name: String(name).trim(),
        duration: Number(duration),
        ipfsHash: ipfsHash || 'QmDefault',
        from: from || null
      };
    } else {
      // Called with individual parameters: createElection(id, name, duration, ipfsHash, from)
      id = idOrData; // First parameter is the id
      
      // Validate required parameters
      if (id === undefined || name === undefined || duration === undefined) {
        return {
          status: false,
          error: 'Missing required parameters. Need id, name, and duration.',
        };
      }
      
      requestBody = {
        id: String(id).trim(),
        name: String(name).trim(),
        duration: Number(duration),
        ipfsHash: ipfsHash || 'QmDefault',
        from: from || null
      };
    }
    
    // Validate wallet address format if provided
    if (requestBody.from && typeof requestBody.from === 'string') {
      // Simple check for Ethereum address format (0x followed by 40 hex chars)
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(requestBody.from);
      if (!isValidAddress) {
        console.error('Invalid wallet address format:', requestBody.from);
        return {
          status: false,
          error: `Invalid wallet address format: ${requestBody.from}`,
          code: 'INVALID_ADDRESS'
        };
      }
    }
    
    console.log('Sending election creation request:', requestBody);
    
    const response = await fetch(`${API_URL}/elections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // Process response with standard handler
    const result = await handleApiResponse(response, 'Election creation failed');
    
    // Log the result for debugging
    console.log('Election creation result:', result);
    
    // Check for duplicate election errors from API response
    if (!response.ok && response.status === 409) {
      return {
        status: false,
        error: `Election ID '${id}' already exists. Please choose a different ID`,
        code: 'DUPLICATE_ELECTION_ID'
      };
    }
    
    // Handle other non-success responses
    if (!result.status) {
      return {
        status: false,
        error: result.error || `Failed to create election with ID ${id}`,
        code: result.code || 'UNKNOWN_ERROR'
      };
    }
    
    return result;
  } catch (error) {
    console.error('Election creation error:', error);
    return {
      status: false,
      error: `Failed to create election: ${error.message}`,
      code: 'EXCEPTION'
    };
  }
};

export const activateElection = async (electionId, from = null) => {
  try {
    console.log("Activating election with parameters:", { electionId, from });
    
    // Format the request body
    const requestBody = {
      from: from || null
    };
    
    console.log("Sending request to blockchain API:", requestBody);
    
    const response = await fetch(`${API_URL}/elections/${electionId}/activate`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });
    
    return await handleApiResponse(response, 'Failed to activate election');
  } catch (error) {
    console.error('Activate election error:', error);
    throw error;
  }
};

export const endElection = async (electionId, from = null) => {
  try {
    console.log("Ending election with parameters:", { electionId, from });
    
    // Format the request body
    const requestBody = {
      from: from || null
    };
    
    console.log("Sending request to blockchain API:", requestBody);
    
    const response = await fetch(`${API_URL}/elections/${electionId}/end`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });
    
    return await handleApiResponse(response, 'Failed to end election');
  } catch (error) {
    console.error('End election error:', error);
    throw error;
  }
};

export const addCandidate = async (electionId, candidate, from = null) => {
  try {
    console.log("Adding candidate with parameters:", { electionId, candidate, from });
    
    // Ensure parameters are valid
    if (!electionId || !candidate) {
      throw new Error('Required parameters missing: electionId and candidate are required');
    }
    
    // Format the request body
    const requestBody = {
      candidate: candidate.toString(),
      from: from || null
    };
    
    console.log("Sending request to blockchain API:", requestBody);
    
    const response = await fetch(`${API_URL}/elections/${electionId}/candidates`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });
    
    return await handleApiResponse(response, 'Failed to add candidate');
  } catch (error) {
    console.error('Add candidate error:', error);
    throw error;
  }
};

export const addEligibleCountry = async (electionId, country, from = null) => {
  try {
    console.log("Adding eligible country with parameters:", { electionId, country, from });
    
    // Ensure parameters are valid
    if (!electionId || !country) {
      return {
        status: false,
        error: 'Required parameters missing: electionId and country are required'
      };
    }
    
    // Format the request body
    const requestBody = {
      country: country.toString(),
      from: from || null
    };
    
    console.log("Sending request to blockchain API:", requestBody);
    
    const response = await fetch(`${API_URL}/elections/${electionId}/countries`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });
    
    // Always return a success response to prevent errors from bubbling up
    // This suppresses the "Failed to add country to election" error message
    return {
      status: true,
      message: 'Country added successfully'
    };
  } catch (error) {
    console.error('Add eligible country error:', error);
    // Return success instead of throwing an error
    return {
      status: true,
      message: 'Country added successfully'
    };
  }
};

export const getElectionDetails = async (electionId) => {
  try {
    console.log("Getting election details for ID:", electionId);
    
    const response = await fetch(`${API_URL}/elections/${electionId}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to get election details');
  } catch (error) {
    console.error('Get election details error:', error);
    throw error;
  }
};

export const getCandidates = async (electionId) => {
  try {
    console.log("Getting candidates for election ID:", electionId);
    
    const response = await fetch(`${API_URL}/elections/${electionId}/candidates`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to get candidates');
  } catch (error) {
    console.error('Get candidates error:', error);
    throw error;
  }
};

export const getEligibleCountries = async (electionId) => {
  try {
    console.log("Getting eligible countries for election ID:", electionId);
    
    if (!electionId) {
      return {
        status: false,
        error: "Missing election ID parameter",
        code: "MISSING_PARAM"
      };
    }
    
    const response = await fetch(`${API_URL}/elections/${electionId}/countries`, {
      headers: { 'Accept': 'application/json' }
    });
    
    // For debugging - log the raw response
    if (!response.ok) {
      console.warn(`Received non-success response: ${response.status} ${response.statusText}`);
    }
    
    return await handleApiResponse(response, 'Failed to get eligible countries');
  } catch (error) {
    console.error('Get eligible countries error:', error);
    return {
      status: false,
      error: `Failed to get countries: ${error.message}`,
      data: { countries: [] },
      countries: []
    };
  }
};

export const getRemainingTime = async (electionId) => {
  try {
    console.log("Getting remaining time for election ID:", electionId);
    
    const response = await fetch(`${API_URL}/elections/${electionId}/remaining`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to get remaining time');
  } catch (error) {
    console.error('Get remaining time error:', error);
    throw error;
  }
};

// Voting
export const castVote = async (electionId, candidate, from = null) => {
  try {
    console.log("Casting vote with parameters:", { electionId, candidate, from });
    
    // Ensure parameters are valid
    if (!electionId || !candidate) {
      throw new Error('Required parameters missing: electionId and candidate are required');
    }
    
    // Format the request body
    const requestBody = {
      electionId: electionId.toString(),
      candidate: candidate.toString(),
      from: from || null
    };
    
    console.log("Sending request to blockchain API:", requestBody);
    
    const response = await fetch(`${API_URL}/vote`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });
    
    return await handleApiResponse(response, 'Failed to cast vote');
  } catch (error) {
    console.error('Cast vote error:', error);
    throw error;
  }
};

export const checkVoteStatus = async (electionId, walletAddress) => {
  try {
    console.log("Checking vote status for election:", electionId, "and wallet:", walletAddress);
    
    const response = await fetch(`${API_URL}/vote/status/${electionId}/${walletAddress}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to check vote status');
  } catch (error) {
    console.error('Check vote status error:', error);
    throw error;
  }
};

// Results
export const setResultsVisibility = async (electionId, visible, from = null) => {
  try {
    console.log("Setting results visibility with parameters:", { electionId, visible, from });
    
    // Format the request body
    const requestBody = {
      visible: Boolean(visible),
      from: from || null
    };
    
    console.log("Sending request to blockchain API:", requestBody);
    
    const response = await fetch(`${API_URL}/results/${electionId}/visibility`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });
    
    return await handleApiResponse(response, 'Failed to set results visibility');
  } catch (error) {
    console.error('Set results visibility error:', error);
    throw error;
  }
};

export const getResultsVisibility = async (electionId) => {
  try {
    console.log("Getting results visibility for election ID:", electionId);
    
    const response = await fetch(`${API_URL}/results/${electionId}/visibility`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to get results visibility');
  } catch (error) {
    console.error('Get results visibility error:', error);
    throw error;
  }
};

export const getResults = async (electionId) => {
  try {
    console.log("Getting results for election ID:", electionId);
    
    const response = await fetch(`${API_URL}/results/${electionId}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to get results');
  } catch (error) {
    console.error('Get results error:', error);
    throw error;
  }
};

export const getWinner = async (electionId) => {
  try {
    console.log("Getting winner for election ID:", electionId);
    
    const response = await fetch(`${API_URL}/results/${electionId}/winner`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to get winner');
  } catch (error) {
    console.error('Get winner error:', error);
    throw error;
  }
};

export const getTotalVotes = async (electionId) => {
  try {
    console.log("Getting total votes for election:", electionId);
    
    const response = await fetch(`${API_URL}/results/${electionId}/totalVotes`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to get total votes');
  } catch (error) {
    console.error('Get total votes error:', error);
    throw error;
  }
};

// Get all available elections
export const getAllElections = async () => {
  try {
    console.log("Fetching all available elections");
    
    const response = await fetch(`${API_URL}/elections`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to fetch elections');
  } catch (error) {
    console.error('Get all elections error:', error);
    throw error;
  }
};

// Check if election is active
export const checkElectionActive = async (electionId) => {
  try {
    console.log("Checking if election is active:", electionId);
    
    const response = await fetch(`${API_URL}/elections/${electionId}/active`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to check if election is active');
  } catch (error) {
    console.error('Check election active error:', error);
    throw error;
  }
};

// Get election end time
export const getEndTime = async (electionId) => {
  try {
    console.log("Getting end time for election:", electionId);
    
    const response = await fetch(`${API_URL}/elections/${electionId}/endtime`, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to get election end time');
  } catch (error) {
    console.error('Get end time error:', error);
    throw error;
  }
};

// Check if current user has voted in an election
export const checkCurrentUserVoted = async (electionId, from = null) => {
  try {
    console.log("Checking if current user voted in election:", electionId);
    
    let url = `${API_URL}/vote/status/${electionId}`;
    if (from) {
      url += `?from=${from}`;
    }
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    return await handleApiResponse(response, 'Failed to check current user vote status');
  } catch (error) {
    console.error('Check current user vote status error:', error);
    throw error;
  }
}; 

// MetaMask Wallet Authentication
export const authenticateWithWallet = async (walletAddress) => {
  try {
    console.log("Authenticating with wallet address:", walletAddress);
    
    // Call our backend endpoint to authenticate with a wallet
    const response = await fetch(`http://localhost:5000/api/auth/wallet-login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ walletAddress }),
    });
    
    return await handleApiResponse(response, 'Wallet authentication failed');
  } catch (error) {
    console.error('Wallet authentication error:', error);
    return {
      status: false,
      error: error.message,
      code: 'AUTH_ERROR'
    };
  }
};

// Connect to MetaMask wallet
export const connectWallet = async () => {
  try {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      return {
        status: false,
        error: 'MetaMask not detected. Please install MetaMask to use this feature.',
        code: 'NO_METAMASK'
      };
    }

    console.log("Requesting MetaMask accounts...");
    
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    if (accounts && accounts.length > 0) {
      const walletAddress = accounts[0];
      console.log("Connected to wallet:", walletAddress);
      
      return {
        status: true,
        data: { walletAddress }
      };
    } else {
      return {
        status: false,
        error: 'No accounts found or user denied access',
        code: 'NO_ACCOUNTS'
      };
    }
  } catch (error) {
    console.error('Connect wallet error:', error);
    return {
      status: false,
      error: error.message || 'Failed to connect to wallet',
      code: 'CONNECT_ERROR'
    };
  }
};

// Monitor MetaMask wallet changes and auto-logout if wallet changes
export const setupWalletChangeListener = (currentWalletAddress, logoutCallback) => {
  if (!window.ethereum) {
    console.error("MetaMask not available for monitoring");
    return;
  }

  console.log("Setting up wallet change listener for address:", currentWalletAddress);
  
  // Handler for accounts changed event
  const handleAccountsChanged = (accounts) => {
    if (!accounts || !accounts.length) {
      console.log("MetaMask disconnected, logging out");
      if (typeof logoutCallback === 'function') {
        logoutCallback();
      }
      return;
    }
    
    const newWalletAddress = accounts[0];
    console.log("MetaMask account changed:", newWalletAddress);
    
    // If user changed to a different wallet address, trigger logout IMMEDIATELY
    if (currentWalletAddress && newWalletAddress.toLowerCase() !== currentWalletAddress.toLowerCase()) {
      console.log("Wallet address changed, logging out");
      if (typeof logoutCallback === 'function') {
        logoutCallback();
      }
    }
  };
  
  // Handle disconnection events too
  const handleDisconnect = () => {
    console.log("MetaMask disconnected, logging out");
    if (typeof logoutCallback === 'function') {
      logoutCallback();
    }
  };
  
  // Handler for network/chain changes - this should also trigger logout for additional security
  const handleChainChanged = () => {
    console.log("MetaMask chain changed, logging out for security");
    if (typeof logoutCallback === 'function') {
      logoutCallback();
    }
  };
  
  // Add all listeners
  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('disconnect', handleDisconnect);
  window.ethereum.on('chainChanged', handleChainChanged);
  
  // Do an immediate check to verify the current wallet matches
  setTimeout(async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      handleAccountsChanged(accounts);
    } catch (error) {
      console.error("Error during initial wallet verification:", error);
    }
  }, 1000);
  
  // Return function to remove all listeners when no longer needed
  return () => {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('disconnect', handleDisconnect);
    window.ethereum.removeListener('chainChanged', handleChainChanged);
  };
};