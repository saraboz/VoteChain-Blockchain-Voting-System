/**
 * Decision Making Blockchain Service - API Client for decision blockchain interaction
 * This service handles communication with the blockchain API for decision-making functionality
 */

// Define the blockchain API URL directly (using port 3001)
const BLOCKCHAIN_API_URL = 'http://localhost:3001';

// Helper function to normalize Ethereum addresses
const normalizeAddress = (address) => {
    if (!address) return '';
    return address.trim().toLowerCase();
};

// Helper function to handle API response
const handleApiResponse = async (response) => {
    try {
        if (!response.ok) {
            const errorText = await response.text();
            return { 
                status: false, 
                error: `API error: ${response.status} ${response.statusText || errorText}`
            };
        }
        
        const data = await response.json();
        return { status: true, data };
    } catch (err) {
        console.error(`Error handling API response:`, err);
        return { status: false, error: err.message };
    }
};

// Function to create a new decision
export const createDecision = async (id, name, description, durationMinutes, options, whitelist, creatorAddress) => {
    try {
        const url = `${BLOCKCHAIN_API_URL}/api/decisions/create`;
        
        // Normalize all addresses for consistency
        const normalizedWhitelist = whitelist.map(addr => normalizeAddress(addr));
        const normalizedCreator = normalizeAddress(creatorAddress);
        
        // Make sure creator is in whitelist
        if (!normalizedWhitelist.includes(normalizedCreator)) {
            normalizedWhitelist.push(normalizedCreator);
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: id,
                name: name,
                description: description,
                durationMinutes: durationMinutes,
                options: options,
                whitelist: normalizedWhitelist,
                creator: normalizedCreator
            }),
        });

        return await handleApiResponse(response);
    } catch (err) {
        console.error('Error creating decision:', err);
        return { status: false, error: err.message };
    }
};

// Function to get all decisions
export const getAllDecisions = async () => {
    try {
        const url = `${BLOCKCHAIN_API_URL}/api/decisions`;
        console.log('Fetching all decisions from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.error(`Got non-OK response: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            throw new Error(`Failed to get decisions: ${response.statusText || errorText}`);
        }
        
        // Parse the response JSON
        const result = await response.json();
        console.log('Raw decisions response:', result);
        
        // Handle the standardized API response format
        if (result.status === true && Array.isArray(result.data)) {
            return { status: true, data: result.data };
        } else if (Array.isArray(result)) {
            // Fallback for old API format that returns array directly
            console.warn('API returned array directly instead of {status, data} format');
            return { status: true, data: result };
        } else {
            console.error('Unexpected response format from /api/decisions:', result);
            return { status: false, error: 'Invalid response format', data: [] };
        }
    } catch (err) {
        console.error('Error getting decisions:', err);
        return { status: false, error: err.message, data: [] };
    }
};

// Function to get details of a specific decision
export const getDecisionDetails = async (decisionId) => {
    try {
        const url = `${BLOCKCHAIN_API_URL}/api/decisions/${decisionId}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        return await handleApiResponse(response);
    } catch (err) {
        console.error(`Error getting details for decision ${decisionId}:`, err);
        return { status: false, error: err.message };
    }
};

// Function to check if user is whitelisted for a specific decision
export const isUserWhitelisted = async (decisionId, userAddress) => {
    try {
        // Normalize the address before sending
        const normalizedAddress = normalizeAddress(userAddress);
        const url = `${BLOCKCHAIN_API_URL}/api/decisions/${decisionId}/whitelist/${normalizedAddress}`;
        
        console.log(`Checking if address ${normalizedAddress} is whitelisted for decision ${decisionId}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.warn(`Non-OK response from whitelist check, status: ${response.status}`);
            return { status: false, error: 'Failed to check whitelist status' };
        }
        
        // Get the raw response data
        const rawData = await response.json();
        console.log('Raw API response:', JSON.stringify(rawData));
        
        // Direct pass-through of server response for consistency
        return rawData;
    } catch (err) {
        console.error(`Error checking whitelist status for user ${userAddress} on decision ${decisionId}:`, err);
        return { status: false, error: err.message };
    }
};

// Function to check if a user has already voted
export const hasUserVoted = async (decisionId, userAddress) => {
    try {
        const url = `${BLOCKCHAIN_API_URL}/api/decisions/${decisionId}/voted/${userAddress}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        return await handleApiResponse(response);
    } catch (err) {
        console.error(`Error checking vote status for user ${userAddress} on decision ${decisionId}:`, err);
        return { status: false, error: err.message };
    }
};

// Function to check if a voting is active
export const isVotingActive = async (decisionId) => {
    try {
        const url = `${BLOCKCHAIN_API_URL}/api/decisions/${decisionId}/active`;
        
        console.log(`Checking if decision ${decisionId} is active`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.warn(`Non-OK response from active check, status: ${response.status}`);
            
            // Fallback: Check using remaining time as a proxy
            try {
                const timeResponse = await getRemainingTime(decisionId);
                if (timeResponse.status && timeResponse.data && parseInt(timeResponse.data.remainingTime) > 0) {
                    console.log(`Decision ${decisionId} is active based on remaining time > 0`);
                    return { status: true, data: { active: true } };
                }
            } catch (timeErr) {
                console.error('Error in fallback time check:', timeErr);
            }
            
            return { status: false, error: 'Failed to check active status' };
        }
        
        // Get the raw response data
        const rawData = await response.json();
        console.log(`Raw active status response for decision ${decisionId}:`, JSON.stringify(rawData));
        
        return rawData;
    } catch (err) {
        console.error(`Error checking active status for decision ${decisionId}:`, err);
        return { status: false, error: err.message };
    }
};

// Function to get remaining time for a decision
export const getRemainingTime = async (decisionId) => {
    try {
        const url = `${BLOCKCHAIN_API_URL}/api/decisions/${decisionId}/remaining-time`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        return await handleApiResponse(response);
    } catch (err) {
        console.error(`Error getting remaining time for decision ${decisionId}:`, err);
        return { status: false, error: err.message };
    }
};

// Function to vote on a decision
export const voteOnDecision = async (decisionId, optionIndex, voterAddress) => {
    try {
        const url = `${BLOCKCHAIN_API_URL}/api/decisions/${decisionId}/vote`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                optionIndex: optionIndex,
                voter: voterAddress
            }),
        });

        return await handleApiResponse(response);
    } catch (err) {
        console.error(`Error voting on decision ${decisionId}:`, err);
        return { status: false, error: err.message };
    }
};

// Function to finalize a decision
export const finalizeDecision = async (decisionId, adminAddress) => {
    try {
        const url = `${BLOCKCHAIN_API_URL}/api/decisions/${decisionId}/finalize`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                admin: adminAddress
            }),
        });

        return await handleApiResponse(response);
    } catch (err) {
        console.error(`Error finalizing decision ${decisionId}:`, err);
        return { status: false, error: err.message };
    }
};

// Function to get results of a decision
export const getDecisionResults = async (decisionId) => {
    try {
        const url = `${BLOCKCHAIN_API_URL}/api/decisions/${decisionId}/results`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        return await handleApiResponse(response);
    } catch (err) {
        console.error(`Error getting results for decision ${decisionId}:`, err);
        return { status: false, error: err.message };
    }
};

// Function to get active decisions
export const getActiveDecisions = async () => {
    try {
        const url = `${BLOCKCHAIN_API_URL}/api/decisions/active`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        return await handleApiResponse(response);
    } catch (err) {
        console.error('Error getting active decisions:', err);
        return { status: false, error: err.message };
    }
}; 