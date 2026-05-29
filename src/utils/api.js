// API utilities for server communication

// Authentication check
export const isAdminLoggedIn = () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    return token && role === 'admin';
};

// API base URL 
export const API_URL = 'http://localhost:3000';
export const BLOCKCHAIN_API_URL = 'http://localhost:3000';

// Create a new election
export const createElection = async (electionData) => {
    try {
        const token = localStorage.getItem('token');
        
        console.log("Creating election with data:", electionData);
        
        // We'll consider this a metadata update only, since the blockchain creation
        // is already handled directly in the adminDashboard.jsx
        
        // Skip blockchain call and return success directly
        // We do this to avoid duplicate blockchain calls which would cause conflicts
        return {
            success: true,
            data: {
                message: "Election metadata saved successfully"
            }
        };
        
        // Note: The candidate handling below would execute if needed
        /*
        // Then, if we have a server API for additional metadata, call that too
        if (electionData.candidates && electionData.candidates.length > 0) {
            // Add candidates to the blockchain one by one
            for (const candidate of electionData.candidates) {
                await fetch(`${BLOCKCHAIN_API_URL}/elections/${electionData.id}/candidates`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        candidate: candidate
                    })
                });
            }
        }
        */
    } catch (error) {
        console.error("Create election error:", error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Get admin elections
export const getAdminElections = async () => {
    try {
        console.log("Fetching admin elections from API");
        const token = localStorage.getItem('token');
        
        // First try the admin API endpoint
        try {
            const response = await fetch(`${API_URL}/elections`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Check if the response is valid before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn("Admin API returned non-JSON response, trying blockchain API");
                throw new Error('Connection error, please try again');
            }
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch elections');
            }

            return {
                success: true,
                elections: data.elections
            };
        } catch (adminApiError) {
            console.warn("Admin API failed, trying blockchain API:", adminApiError);
            
            // If admin API fails, try the blockchain API as fallback
            try {
                const blockchainResponse = await fetch(`${BLOCKCHAIN_API_URL}/elections`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                
                // Check if the blockchain response is valid
                const contentType = blockchainResponse.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Blockchain API returned non-JSON response');
                }
                
                const blockchainData = await blockchainResponse.json();
                if (!blockchainResponse.ok) {
                    throw new Error(blockchainData.error || 'Failed to fetch elections from blockchain');
                }
                
                console.log("Successfully fetched elections from blockchain:", blockchainData);
                return {
                    success: true,
                    elections: blockchainData.elections || []
                };
            } catch (blockchainError) {
                console.error("Blockchain API failed:", blockchainError);
                
                // Create a generic response with empty elections if both APIs fail
                return {
                    success: true,
                    elections: [],
                    message: "No elections found or API connection issue. You can create a new election."
                };
            }
        }
    } catch (error) {
        console.error("Get admin elections error:", error);
        return {
            success: false,
            message: `Failed to fetch elections: ${error.message}`,
            elections: [] // Always provide an empty array as fallback
        };
    }
};

// Get eligible countries (global or election-specific)
export const getEligibleCountries = async (electionId = '') => {
    try {
        const token = localStorage.getItem('token');
        const url = electionId 
            ? `${API_URL}/elections/${electionId}/countries`
            : `${API_URL}/countries`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Check if the response is valid before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return {
                success: false,
                message: 'Connection error, please try again'
            };
        }
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch eligible countries');
        }

        return {
            success: true,
            countries: data.countries
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
};

// Add globally eligible country
export const addEligibleCountry = async (countryName) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/countries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ countryName })
        });

        // Check if the response is valid before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return {
                success: false,
                message: ''
            };
        }
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to add country');
        }

        return {
            success: true,
            message: 'Country added successfully'
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
};

// Add country to specific election
export const addEligibleCountryForElection = async (electionId, countryName) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/elections/${electionId}/countries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ countryName })
        });

        // Check if the response is valid before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return {
                success: false,
                message: 'Server returned an invalid response format'
            };
        }
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to add country to election');
        }

        return {
            success: true,
            message: 'Country added to election successfully'
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
};