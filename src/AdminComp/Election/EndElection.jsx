import React, { useState } from 'react';
import { useBlockchain } from '../../utils/BlockchainContext';
import WalletConnect from '../../components/SharedComponents/WalletConnect';
import { endElection } from '../../utils/blockchainService';

function EndElection() {
  const [electionId, setElectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Get blockchain context for wallet connection
  const { account, isConnected } = useBlockchain();

  const handleElectionIdChange = (e) => {
    setElectionId(e.target.value.trim());
    // Clear previous messages
    setError('');
    setSuccess('');
  };

  const handleEndElection = async (e) => {
    e.preventDefault();
    
    if (!electionId) {
      setError('Please enter an election ID');
      return;
    }
    
    if (!isConnected) {
      setError('Please connect your wallet to end an election');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await endElection(electionId, account);
      
      if (response.status) {
        setSuccess(`Election ${electionId} ended successfully!`);
        setElectionId(''); // Clear the input
      } else {
        setError(response.error || 'Failed to end election');
      }
    } catch (err) {
      console.error('Error ending election:', err);
      setError('Connection error, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden rounded-lg">
      <div className="px-4 py-3 sm:px-6 border-b border-gray-200">
        <h3 className="text-md leading-6 font-medium text-gray-900">
          End Election
        </h3>
        <p className="mt-1 max-w-2xl text-xs text-gray-500">
          End an active election to stop accepting votes and prepare for results.
        </p>
      </div>
      
      {/* Wallet Connection Section */}
      <div className="px-4 py-2 bg-red-50 border-b border-red-200">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-0">Blockchain Connection</h4>
            <p className="text-xs text-gray-600">
              Connect your wallet to end an election
            </p>
          </div>
          <WalletConnect />
        </div>
      </div>

      <div className="px-4 py-3 sm:p-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 mb-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-xs text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleEndElection} className="space-y-4">
          <div>
            <label htmlFor="electionId" className="block text-xs font-medium text-gray-700">Election ID</label>
            <input
              type="text"
              id="electionId"
              className="mt-1 block w-full pl-3 pr-10 py-1.5 text-base bg-red-50 border-red-200 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md text-gray-800"
              placeholder="Enter election ID (e.g., E001)"
              value={electionId}
              onChange={handleElectionIdChange}
              required
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading || !isConnected}
              className={`w-full inline-flex items-center justify-center px-4 py-1.5 border border-transparent shadow-sm font-medium rounded-md ${
                loading || !isConnected 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
              } text-sm`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ending...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  End Election
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EndElection; 