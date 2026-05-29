/**
 * Survey Blockchain Service - API Client for survey blockchain interaction
 * This service handles communication with the blockchain API for survey functionality
 */

import { API_URL } from './constants';

// Helper function to handle API responses consistently
async function handleApiResponse(response, errorPrefix = 'API request failed') {
  try {
    // First check if the response is OK
    if (!response.ok) {
      console.log(`Got non-OK response: ${response.status} ${response.statusText}`);
      
      // Try to get more information from the error response
      let errorDetail = '';
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail = ` - Details: ${errorText}`;
          console.log('Error response body:', errorText);
        }
      } catch (e) {
        console.log('Could not read error response body', e);
      }
      
      // Return structured error
      return { 
        status: false, 
        error: `${errorPrefix}: ${response.status} ${response.statusText}${errorDetail}` 
      };
    }
    
    // Get the response text first
    const responseText = await response.text();
    
    // Check if the response is empty
    if (!responseText) {
      return { status: true, data: null };
    }
    
    // Then try to parse it as JSON
    try {
      const data = JSON.parse(responseText);
      return { status: true, data };
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      return { status: false, error: 'Invalid JSON response from API' };
    }
  } catch (error) {
    console.error(`${errorPrefix}:`, error);
    return { status: false, error: error.message };
  }
}

// Wrapper function for API calls with better error handling
async function callApi(url, options = {}, errorPrefix = 'API request failed') {
  try {
    console.log(`Making API call to: ${url}`);
    const response = await fetch(url, options);
    return await handleApiResponse(response, errorPrefix);
  } catch (error) {
    console.error(`Network error while calling ${url}:`, error);
    return { status: false, error: `Network error: ${error.message}` };
  }
}

/**
 * Create a new survey
 */
export const createSurvey = async (id, title, description, duration, maxSelectableOptions, from) => {
    try {
    const response = await fetch(`${API_URL}/surveys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
            id,
            title,
            description,
        duration,
        maxSelectableOptions,
        from
      }),
    });
    
    return await handleApiResponse(response, 'Failed to create survey');
    } catch (error) {
        console.error('Error creating survey:', error);
    return { status: false, error: error.message };
  }
};

/**
 * Add an option to a survey
 */
export const addOption = async (surveyId, optionText, from) => {
    try {
    console.log(`Adding option to survey ${surveyId}: "${optionText}" from address: ${from}`);
    
    const response = await fetch(`${API_URL}/surveys/${surveyId}/options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        optionText,
        from
      }),
    });
    
    const result = await handleApiResponse(response, 'Failed to add option');
    console.log(`Option add response for "${optionText}":`, result);
    return result;
    } catch (error) {
        console.error('Error adding option:', error);
    return { status: false, error: error.message };
  }
};

/**
 * Activate a survey
 */
export const activateSurvey = async (surveyId, from) => {
    try {
    const response = await fetch(`${API_URL}/surveys/${surveyId}/activate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from }),
    });
    
    return await handleApiResponse(response, 'Failed to activate survey');
    } catch (error) {
        console.error('Error activating survey:', error);
        return { status: false, error: error.message };
    }
};

/**
 * End a survey
 */
export const endSurvey = async (surveyId, from) => {
    try {
    const response = await fetch(`${API_URL}/surveys/${surveyId}/end`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from }),
    });
    
    return await handleApiResponse(response, 'Failed to end survey');
    } catch (error) {
        console.error('Error ending survey:', error);
        return { status: false, error: error.message };
    }
};

/**
 * Get details of a survey
 */
export const getSurveyDetails = async (surveyId) => {
    try {
    const response = await fetch(`${API_URL}/surveys/${surveyId}`);
    return await handleApiResponse(response, 'Failed to get survey details');
    } catch (error) {
        console.error('Error getting survey details:', error);
        return { status: false, error: error.message };
    }
};

/**
 * Get options for a survey
 */
export const getSurveyOptions = async (surveyId) => {
    try {
    console.log(`Getting options for survey ${surveyId}`);
    const response = await fetch(`${API_URL}/surveys/${surveyId}/options`);
    const result = await handleApiResponse(response, 'Failed to get survey options');
    
    if (!result.status) {
      console.error('Failed to get survey options:', result.error);
      return { status: false, error: result.error };
    }
    
    // Ensure we have valid arrays for both options and votes
    const options = Array.isArray(result.data?.options) ? result.data.options : [];
    const votes = Array.isArray(result.data?.votes) ? result.data.votes : [];
    
    // Filter out any empty or invalid options
    const validOptions = options.filter(opt => opt && opt !== '');
    const validVotes = votes.slice(0, validOptions.length);
            
    // Ensure votes array matches options array length
    while (validVotes.length < validOptions.length) {
      validVotes.push('0');
    }
    
    console.log(`Processed ${validOptions.length} options for survey ${surveyId}:`, {
      options: validOptions,
      votes: validVotes
    });
            
            return {
                status: true,
                data: {
        options: validOptions,
        votes: validVotes
                }
            };
    } catch (error) {
        console.error('Error getting survey options:', error);
    return { status: false, error: error.message };
    }
};

/**
 * Check if a user has participated in a survey
 */
export const hasUserParticipated = async (surveyId, userAddress) => {
    try {
    if (!userAddress) {
      return { status: false, error: 'No user address provided' };
    }
    
    const response = await fetch(`${API_URL}/surveys/${surveyId}/participation/${userAddress}`);
    const result = await handleApiResponse(response, 'Failed to check participation');
    
            return { 
      status: result.status,
      participated: result.status ? result.data.participated : false,
      error: result.error
            };
    } catch (error) {
        console.error('Error checking participation:', error);
    return { status: false, error: error.message };
  }
};

/**
 * Submit response to a survey
 */
export const submitSurveyResponse = async (surveyId, optionIds, from) => {
  try {
    console.log(`Submitting response to survey ${surveyId}:`, { optionIds, from });
    
    if (!from) {
      return { status: false, error: 'Wallet not connected. Please connect your wallet to participate.' };
    }
        
    if (!surveyId) {
      return { status: false, error: 'Invalid survey ID' };
    }
    
    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return { status: false, error: 'Please select at least one option' };
    }
    
    const url = `${API_URL}/surveys/${surveyId}/respond`;
    console.log(`Sending request to: ${url}`);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        optionIds,
        from
      }),
    };
    
    const response = await fetch(url, options);
    
    // If the response is not OK, get the detailed error message
    if (!response.ok) {
      console.warn(`Server returned error status: ${response.status} ${response.statusText}`);
      
      // Try to parse the error response
      try {
        const errorData = await response.json();
        return { 
          status: false, 
          error: errorData.error || `Failed to submit response: ${response.status} ${response.statusText}`
        };
      } catch (parseError) {
        // If we can't parse the JSON, just return the status
        return { 
          status: false, 
          error: `Failed to submit response: ${response.status} ${response.statusText}`
        };
      }
    }
    
    // Parse the successful response
    const responseText = await response.text();
    
    if (!responseText) {
      return { status: true, data: null };
    }
    
    try {
      const data = JSON.parse(responseText);
      return { status: true, data };
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      return { status: false, error: 'Invalid response from server' };
    }
  } catch (error) {
    console.error('Error submitting response:', error);
    return { status: false, error: error.message || 'Unknown error occurred' };
  }
};

/**
 * Get all surveys
 */
export const getAllSurveys = async () => {
  return await callApi(`${API_URL}/surveys`, {}, 'Failed to get surveys');
};

/**
 * Get active surveys
 */
export const getActiveSurveys = async () => {
    try {
    const response = await fetch(`${API_URL}/surveys/active`);
    return await handleApiResponse(response, 'Failed to get active surveys');
    } catch (error) {
        console.error('Error getting active surveys:', error);
    return { status: false, error: error.message };
    }
};

/**
 * Get survey results
 */
export const getSurveyResults = async (surveyId) => {
    try {
    const response = await fetch(`${API_URL}/surveys/${surveyId}/results`);
    return await handleApiResponse(response, 'Failed to get survey results');
    } catch (error) {
        console.error('Error getting survey results:', error);
    return { status: false, error: error.message };
    }
}; 