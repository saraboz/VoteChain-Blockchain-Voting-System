import React, { useState, useEffect } from 'react';
import { useBlockchain } from '../../utils/BlockchainContext';
import { 
  getResultsVisibility, 
  setResultsVisibility,
  getAllElections
} from '../../utils/blockchainService';

const ManageResultVisibility = () => {
  const { account, isConnected } = useBlockchain();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedElection, setSelectedElection] = useState('');
  const [visibilityStatus, setVisibilityStatus] = useState({});
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  // Fetch all elections and their visibility status
  useEffect(() => {
    const fetchElections = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await getAllElections();
        
        if (response.status && response.elections) {
          setElections(response.elections);
          
          // Get visibility status for each election
          const statuses = {};
          for (const election of response.elections) {
            try {
              const visibilityResponse = await getResultsVisibility(election.id);
              statuses[election.id] = visibilityResponse.visible || false;
            } catch (err) {
              console.error(`Failed to get visibility for election ${election.id}:`, err);
              statuses[election.id] = false;
            }
          }
          
          setVisibilityStatus(statuses);
        } else {
          setError('Failed to load elections');
        }
      } catch (err) {
        console.error('Error fetching elections:', err);
        setError('Failed to load elections data');
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, []);

  // Handle election change
  const handleElectionChange = (e) => {
    setSelectedElection(e.target.value);
    setSuccess('');
    setError('');
  };

  // Toggle visibility for selected election
  const toggleVisibility = async (electionId, currentVisibility) => {
    if (!isConnected) {
      setError('Please connect your wallet to update result visibility');
      return;
    }

    try {
      setUpdatingVisibility(true);
      setError('');
      setSuccess('');
      
      console.log(`Toggling visibility for election ${electionId} to ${!currentVisibility}`);
      
      const response = await setResultsVisibility(electionId, !currentVisibility, account);
      
      if (response.status) {
        // Update local state
        setVisibilityStatus(prev => ({
          ...prev,
          [electionId]: !currentVisibility
        }));
        
        setSuccess(`Results for election ${electionId} are now ${!currentVisibility ? 'visible' : 'hidden'}`);
      } else {
        setError(response.error || 'Failed to update visibility status');
      }
    } catch (err) {
      console.error('Error toggling visibility:', err);
      setError(err.message || 'An error occurred while updating visibility');
    } finally {
      setUpdatingVisibility(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Manage Result Visibility</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Select Election</label>
        <select
          value={selectedElection}
          onChange={handleElectionChange}
          className="w-full px-4 py-2 bg-blue-900 text-white border border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">-- Select an election --</option>
          {elections.map(election => (
            <option key={election.id} value={election.id}>
              {election.name} (ID: {election.id})
            </option>
          ))}
        </select>
      </div>
      
      {elections.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-blue-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Election ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Results Visible</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-blue-100">
              {elections.map(election => (
                <tr 
                  key={election.id} 
                  className={`hover:bg-blue-50 transition-colors duration-200 ${
                    selectedElection === election.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-gray-800">{election.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{election.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      election.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {election.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      visibilityStatus[election.id] 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {visibilityStatus[election.id] ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleVisibility(election.id, visibilityStatus[election.id])}
                      disabled={updatingVisibility}
                      className={`px-3 py-1 rounded ${
                        visibilityStatus[election.id]
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      } ${updatingVisibility ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {updatingVisibility && selectedElection === election.id ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <>{visibilityStatus[election.id] ? 'Hide Results' : 'Show Results'}</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {elections.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No elections found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No elections available
        </div>
      )}
    </div>
  );
};

export default ManageResultVisibility; 