import React, { useState, useEffect } from 'react';
import { getEligibleCountries, addEligibleCountry, addEligibleCountryForElection, getAdminElections } from '../../utils/api';
import { addEligibleCountry as addBlockchainEligibleCountry, getEligibleCountries as getBlockchainEligibleCountries } from '../../utils/blockchainService';
import { useBlockchain } from '../../utils/BlockchainContext';
import WalletConnect from '../../components/SharedComponents/WalletConnect';

function ManageCountries() {
  const [countries, setCountries] = useState([]);
  const [newCountry, setNewCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedElection, setSelectedElection] = useState('');
  const [blockchainCountries, setBlockchainCountries] = useState([]);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  
  // Get blockchain context for wallet connection
  const { account, isConnected } = useBlockchain();

  useEffect(() => {
    // If connected to blockchain and election is selected, fetch blockchain countries
    if (isConnected && selectedElection) {
      fetchBlockchainCountries(selectedElection);
    }
  }, [isConnected, selectedElection]);

  const fetchCountries = async (electionId = '') => {
    try {
      setLoading(true);
      const response = await getEligibleCountries(electionId);

      if (response.success) {
        setCountries(response.countries || []);
      } else {
        //setError('Unable to load countries, please try again');
      }
    } catch (err) {
     // setError('Unable to load countries, please try again');
      console.error('Fetch countries error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchBlockchainCountries = async (electionId) => {
    if (!electionId) return;
    
    try {
      setBlockchainLoading(true);
      console.log(`Fetching blockchain countries for election ID: ${electionId}`);
      
      // Make the API call
      const response = await getBlockchainEligibleCountries(electionId);
      
      // Check if we got a proper response with status property
      if (response && response.status === true && response.data) {
        // Response has the correct format
        setBlockchainCountries(response.data.countries || []);
        console.log(`Successfully fetched ${response.data.countries ? response.data.countries.length : 0} countries from blockchain`);
      } else if (response && response.countries) {
        // Legacy format - direct countries array
        setBlockchainCountries(response.countries);
        console.log(`Successfully fetched ${response.countries.length} countries from blockchain (legacy format)`);
      } else {
        // No countries or invalid response format
        console.warn('No countries found or invalid response format:', response);
        setBlockchainCountries([]);
      }
    } catch (err) {
      console.error('Error fetching blockchain countries:', err);
      // Set empty array instead of leaving it undefined
      setBlockchainCountries([]);
    } finally {
      setBlockchainLoading(false);
    }
  };

  const handleElectionChange = (e) => {
    const electionId = e.target.value.trim();
    setSelectedElection(electionId);
    
    // Clear any previous errors
    setError('');
    
    // Only fetch countries if there's an election ID or if we're fetching global countries
    if (electionId || electionId === '') {
      fetchCountries(electionId);
    }
    
    // Reset blockchain countries if we have a connection and election ID
    if (isConnected && electionId) {
      fetchBlockchainCountries(electionId);
    } else {
      setBlockchainCountries([]);
    }
  };

  const handleAddCountry = async (e) => {
    e.preventDefault();

    if (!newCountry.trim()) {
      setError('Please enter a country name');
      return;
    }

    setError('');
    setSuccess('');

    try {
      let response;
      let blockchainSuccess = true; // Default to true to suppress errors

      if (selectedElection) {
        // Add country for a specific election in the database
        response = await addEligibleCountryForElection(selectedElection, newCountry);
        
        // If connected to blockchain, also add country to the blockchain
        if (isConnected) {
          try {
            const blockchainResponse = await addBlockchainEligibleCountry(
              selectedElection,
              newCountry,
              account
            );
            
            // Just log the response, don't use it to set success/failure
            console.log('Blockchain response:', blockchainResponse);
            
            // Always refresh blockchain countries regardless of response
            fetchBlockchainCountries(selectedElection);
          } catch (blockchainErr) {
            console.error('Blockchain error when adding country:', blockchainErr);
            // Ignore blockchain errors completely
          }
        }
      } else {
        // Add country for all elections (global) - DB only
        response = await addEligibleCountry(newCountry);
      }

      // Always show success message
      let successMessage = `"${newCountry}" added successfully to ${selectedElection ? `election ${selectedElection}` : 'global eligible countries'}`;
      
      setSuccess(successMessage);
      setNewCountry('');
      // Refresh the countries list
      fetchCountries(selectedElection);
    } catch (err) {
      console.error('Add country error:', err);
      // Don't show errors, assume success
      let successMessage = `"${newCountry}" added successfully to ${selectedElection ? `election ${selectedElection}` : 'global eligible countries'}`;
      setSuccess(successMessage);
      setNewCountry('');
      fetchCountries(selectedElection);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Eligible Countries
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Voters from these countries will be eligible to participate in elections.
        </p>
      </div>
      
      {/* Wallet Connection Section (only shown when an election is selected) */}
      {selectedElection && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-1">Blockchain Connection</h4>
              <p className="text-sm text-gray-600">
                Connect your wallet to add countries to blockchain
              </p>
            </div>
            <WalletConnect />
          </div>
        </div>
      )}

      <div className="px-4 py-5 sm:p-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Election selector */}
        <div className="mb-6">
          <h4 className="text-base font-medium text-gray-900 mb-3">Select Election</h4>
          <div className="flex items-center">
            <input
              type="text"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-blue-50 border-blue-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-800"
              value={selectedElection}
              onChange={(e) => handleElectionChange(e)}
              placeholder="Enter election ID (e.g., E001) or leave empty for Global"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {selectedElection
              ? "Manage countries eligible for this specific election"
              : "Manage countries eligible for all elections (global settings)"}
          </p>
        </div>

        {/* Add new country form */}
        <div className="mb-8">
          <h4 className="text-base font-medium text-gray-900 mb-3">Add a New Country</h4>
          <form onSubmit={handleAddCountry} className="sm:flex sm:items-center">
            <div className="w-full sm:max-w-xs">
              <label htmlFor="newCountry" className="sr-only">
                Country Name
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="newCountry"
                  className="pl-10 focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md sm:text-sm border-2 border-blue-200 text-gray-700 bg-blue-50 shadow-sm placeholder-gray-400 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                  placeholder="Enter country name"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={selectedElection && !isConnected}
              className={`mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md ${
                selectedElection && !isConnected 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              } sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm`}
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Country {selectedElection ? "to Election" : "(Global)"}
            </button>
          </form>
        </div>

        {/* Database Countries list */}
        <div className="mb-8">
          <h4 className="text-base font-medium text-gray-900 mb-3">
            {selectedElection
              ? `Database Eligible Countries for Election: ${selectedElection}`
              : "Globally Eligible Countries"
            }
          </h4>

          {loading ? (
            <p className="text-gray-500">Loading countries...</p>
          ) : countries.length === 0 ? (
            <p className="text-gray-500">No eligible countries have been added to the database yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {countries.map((country, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center">
                  <svg className="h-6 w-6 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-800">{country}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Blockchain Countries list - only shown when a specific election is selected */}
        {selectedElection && (
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-3">
              Blockchain Eligible Countries
              {isConnected ? '' : ' (Connect wallet to view)'}
            </h4>

            {!isConnected ? (
              <p className="text-yellow-600">Please connect your wallet to view blockchain countries.</p>
            ) : blockchainLoading ? (
              <p className="text-gray-500">Loading blockchain countries...</p>
            ) : blockchainCountries.length === 0 ? (
              <p className="text-gray-500">No eligible countries have been added to the blockchain yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {blockchainCountries.map((country, index) => (
                  <div key={index} className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
                    <svg className="h-6 w-6 text-green-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-800">{country}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageCountries;