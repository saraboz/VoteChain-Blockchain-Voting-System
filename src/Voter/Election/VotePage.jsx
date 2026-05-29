import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBlockchain } from '../../utils/BlockchainContext';
import Header from '../../components/SharedComponents/Header';
import Footer from '../../components/SharedComponents/Footer';
import WalletConnect from '../../components/SharedComponents/WalletConnect';
import axios from 'axios';
import {
  getElectionDetails,
  getCandidates,
  getRemainingTime,
  checkVoteStatus,
  castVote
} from '../../utils/blockchainService';

const VotePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, isConnected, isRegistered, refreshRegistrationStatus } = useBlockchain();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [remainingTime, setRemainingTime] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactionHash, setTransactionHash] = useState(null); // To store the transaction hash
  // Add new state for eligibility
  const [isEligible, setIsEligible] = useState(true); // Default to true, will be verified
  const [userCountry, setUserCountry] = useState(null);
  const [eligibleCountries, setEligibleCountries] = useState([]);

  // Debug log function
  const debugLog = (message, data) => {
    console.log(`[VotePage] ${message}`, data || '');
  };

  // Check vote status with explicit debug logging
  const checkUserVoteStatus = async () => {
    if (!account || !id) return false;

    try {
      debugLog(`Checking vote status for account ${account} in election ${id}`);
      const voteStatus = await checkVoteStatus(id, account);

      debugLog(`Vote status response:`, voteStatus);

      if (voteStatus.status && voteStatus.voted) {
        debugLog(`User has voted: ${voteStatus.voted}`);
        setHasVoted(true);
        return true;
      }

      debugLog(`User has not voted`);
      return false;
    } catch (err) {
      debugLog(`Error checking vote status: ${err.message}`);
      console.error(err);
      return false;
    }
  };

  const checkEligibility = async () => {
    console.log(`account: ${account}, and the id is: ${id}`); // 🔍 Debug
    if (!account || !id) return false; // Ensure both account (wallet address) and id (election id) are provided

    const token = localStorage.getItem('token');  // Get the token from localStorage

    try {
      debugLog(`Checking eligibility for wallet address ${account} in election ${id}`);

      // 1. Fetch the user's country based on wallet address (account)
      const userCountryResponse = await axios.get(`http://localhost:5000/api/users/${account}/country`, {
        headers: { Authorization: `Bearer ${token}` }  // Include the Authorization token
      });

      // 4. Check if user has a valid VID
      const vidResponse = await axios.get(`http://localhost:5000/api/users/${account}/VID`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!vidResponse || !vidResponse.data || !vidResponse.data.VID) {
        debugLog(`User VID not found or null for wallet address ${account}`);
        setUserCountry(null); // Set userCountry to null to indicate account not confirmed
        setIsEligible(false);
        return false;
      }

      debugLog(`User VID: ${vidResponse.data.VID}`);

      // Only check country if user has a valid VID
      if (!userCountryResponse || !userCountryResponse.data || !userCountryResponse.data.country) {
        debugLog(`User country not found for wallet address ${account}`);
        setIsEligible(false);
        return false;
      }

      setUserCountry(userCountryResponse.data.country);
      console.log("User's country:", userCountryResponse.data.country); // 🔍 Debug
      debugLog(`User country: ${userCountryResponse.data.country}`);

      // 2. Fetch the eligible countries for the election based on election ID
      const countriesResponse = await axios.get(`http://localhost:3001/elections/${id}/countries`);

      if (!countriesResponse || !countriesResponse.data || !Array.isArray(countriesResponse.data.countries)) {
        debugLog(`Eligible countries not found or invalid format for election ${id}`);
        setIsEligible(false);
        return false;
      }

      const countriesData = countriesResponse.data;
      setEligibleCountries(countriesData.countries);
      debugLog(`Eligible countries: ${countriesData.countries.join(', ')}`);

      // 3. Check if the user's country is in the list of eligible countries
      // Make the comparison case-insensitive and trim whitespace
      const userCountryNormalized = userCountryResponse.data.country.trim().toLowerCase();
      
      // Set isCountryEligible to true by default - assume all countries are eligible if list is empty
      let isCountryEligible = true;
      
      // Only perform the check if there are actually countries specified in the list
      if (countriesData.countries && countriesData.countries.length > 0) {
        const eligibleCountriesNormalized = countriesData.countries.map(country => 
          country.trim().toLowerCase()
        );
        isCountryEligible = eligibleCountriesNormalized.includes(userCountryNormalized);
      }
      
      debugLog(`Country eligibility: ${isCountryEligible} (normalized comparison)`);

      // If country is not eligible, no need to check other criteria
      if (!isCountryEligible) {
        setIsEligible(false);
        return false;
      }

      // 5. Check if user is over 18 years old
      const ageResponse = await axios.get(`http://localhost:5000/api/users/${account}/age`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!ageResponse || !ageResponse.data || !ageResponse.data.age) {
        debugLog(`User age not found for wallet address ${account}`);
        setIsEligible(false);
        return false;
      }

      const userAge = ageResponse.data.age;
      // debugLog(`User age: ${userAge}`);
      console.log("User's age:", userAge); // 🔍 Debug

      const isAgeEligible = userAge >= 18;
      debugLog(`Age eligibility (18+): ${isAgeEligible}`);

      // Final eligibility check - all conditions must be met
      const eligible = isCountryEligible && vidResponse.data.VID && isAgeEligible;
      setIsEligible(eligible);

      console.log(`Is user eligible?`, eligible); // ✅ Final decision
      debugLog(`User eligibility: ${eligible}`);

      return eligible;
    } catch (err) {
      // Catch and log any errors that happen during the process
      debugLog(`Error checking eligibility: ${err.message}`);
      console.error(err);
      setIsEligible(false);  // Default to false in case of error
      return false;
    }
  };

  // Fetch election data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        debugLog(`Loading data for election ${id}`);

        // Always refresh registration status to get latest blockchain data
        if (isConnected && account) {
          await refreshRegistrationStatus();

          // Check if the user is eligible to vote
          await checkEligibility();
          // Check if the user has already voted - always gets fresh data
          // This needs to happen right away, before even loading other data
          await checkUserVoteStatus();
        }

        // Get election details
        const details = await getElectionDetails(id);

        // Convert timestamps to readable dates
        const startDate = new Date(details.startTime * 1000).toLocaleDateString();
        const endTimestamp = parseInt(details.startTime) + parseInt(details.duration);
        const endDate = new Date(endTimestamp * 1000).toLocaleDateString();

        setElection({
          ...details,
          id,
          startDate,
          endDate,
          endTimestamp, // Store the raw end timestamp for direct comparison
        });

        // Get candidates
        const candidatesData = await getCandidates(id);
        setCandidates(candidatesData.candidates || []);

        // Get remaining time directly from blockchain
        const timeData = await getRemainingTime(id);
        const remaining = timeData.remaining || 0;
        setRemainingTime(remaining);

        debugLog(`Fetched remaining time: ${remaining} seconds`);

        setLoading(false);
      } catch (err) {
        debugLog(`Error fetching election data: ${err.message}`);
        console.error("Error fetching election data:", err);
        setError("Failed to load election data. Please try again.");
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }

    // Set up a timer to periodically refresh the remaining time data from the blockchain
    // This ensures we always have the most accurate time remaining
    const refreshTimer = setInterval(() => {
      if (id) {
        // Refresh remaining time from blockchain every 30 seconds
        getRemainingTime(id)
          .then(timeData => {
            const remaining = timeData.remaining || 0;
            debugLog(`Refreshed remaining time: ${remaining} seconds`);
            setRemainingTime(remaining);
          })
          .catch(err => {
            console.error("Error refreshing remaining time:", err);
          });
      }
    }, 30000); // Every 30 seconds

    // Set up a more frequent timer for countdown display
    const countdownTimer = setInterval(() => {
      setRemainingTime(prev => {
        // Only decrement if more than 0
        if (prev > 0) {
          return prev - 1;
        }
        return 0;
      });
    }, 1000); // Every second

    // Periodically refresh vote status if connected
    const voteStatusTimer = setInterval(() => {
      if (isConnected && account && id && !hasVoted) {
        // Check for fresh vote status every 10 seconds
        checkUserVoteStatus();
      }
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(refreshTimer);
      clearInterval(countdownTimer);
      clearInterval(voteStatusTimer);
    };
  }, [id, account, isConnected, refreshRegistrationStatus]);

  // Watch for transaction hash changes and confirm votes
  useEffect(() => {
    // When we have a transaction hash but haven't confirmed the vote was recorded
    if (transactionHash && !hasVoted) {
      debugLog(`Monitoring transaction: ${transactionHash}`);

      // Check vote status immediately and then periodically
      const checkTransaction = async () => {
        const voted = await checkUserVoteStatus();
        if (voted) {
          debugLog(`Vote confirmed on blockchain`);
          setHasVoted(true);
        }
      };

      checkTransaction();

      const intervalId = setInterval(checkTransaction, 5000);

      return () => clearInterval(intervalId);
    }
  }, [transactionHash, hasVoted, account, id]);

  // Handle vote submission
  const handleVote = async (e) => {
    e.preventDefault();

    if (!selectedCandidate) {
      setError("Please select a candidate.");
      return;
    }

    if (!isConnected) {
      setError("Please connect your wallet to vote.");
      return;
    }

    // Check registration status just before voting to get fresh data
    await refreshRegistrationStatus();

    if (!isRegistered) {
      setError("Your wallet is not registered. Please register before voting.");
      return;
    }

    const eligible = await checkEligibility();
    if (!eligible) {
      setError("You are not eligible to vote in this election.");
      return;
    }


    // Check vote status again right before submitting
    const alreadyVoted = await checkUserVoteStatus();
    if (alreadyVoted) {
      debugLog('User has already voted - stopping submission');
      setHasVoted(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      setTransactionHash(null);

      debugLog(`Casting vote for candidate: ${selectedCandidate}`);

      // Cast vote
      const result = await castVote(id, selectedCandidate, account);

      debugLog(`Vote cast result:`, result);

      if (result.status) {
        // Save transaction hash for tracking
        if (result.transactionHash) {
          setTransactionHash(result.transactionHash);
          debugLog(`Transaction hash: ${result.transactionHash}`);
        }

        // Set success message
        setSuccess("Your vote has been successfully recorded on the blockchain!");

        // Check vote status immediately after transaction
        const voted = await checkUserVoteStatus();

        if (voted) {
          debugLog('Vote confirmed immediately');
          setHasVoted(true);
        } else {
          debugLog('Vote not yet confirmed - will check via useEffect');
          // useEffect with transactionHash dependency will keep checking
        }
      } else {
        setError("Transaction completed but vote may not have been recorded properly.");
      }
    } catch (err) {
      debugLog(`Error casting vote: ${err.message}`);
      console.error("Error casting vote:", err);
      setError(err.message || "Failed to cast vote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format remaining time
  const formatTime = (seconds) => {
    if (seconds === null) return 'Calculating...';
    if (seconds <= 0) return 'Election has ended';

    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let timeString = '';
    if (days > 0) timeString += `${days} day${days > 1 ? 's' : ''} `;
    if (hours > 0) timeString += `${hours} hour${hours > 1 ? 's' : ''} `;
    if (minutes > 0) timeString += `${minutes} minute${minutes > 1 ? 's' : ''} `;
    if (secs > 0 && days === 0) timeString += `${secs} second${secs > 1 ? 's' : ''}`;

    return timeString.trim() || 'Less than a second';
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 text-center">
            <div className="flex justify-center mb-6">
              <svg className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-medium text-gray-700">Loading election data...</h2>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Render error state
  if (error && !election) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 text-center">
            <div className="text-red-500 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-gray-700 mb-4">{error}</h2>
            <button onClick={() => navigate('/voterDashboard')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Return to Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Election Header */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">{election?.name || 'Election'}</h1>
              <div className="px-3 py-1 bg-white text-blue-800 rounded-full text-sm font-medium">
                {election?.active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          {/* Election Details */}
          <div className="p-6 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm text-blue-800 font-medium mb-2">Start Date</h3>
                <p className="text-gray-700">{election?.startDate}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm text-blue-800 font-medium mb-2">End Date</h3>
                <p className="text-gray-700">{election?.endDate}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm text-blue-800 font-medium mb-2">Time Remaining</h3>
                <p className="text-gray-700">{formatTime(remainingTime)}</p>
              </div>
            </div>

            {/* Wallet Connection Status */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-lg font-medium text-gray-800">Blockchain Wallet Status</h3>
                  <p className="text-sm text-gray-600">You need to connect your wallet to vote</p>
                </div>
                <WalletConnect />
              </div>
            </div>

            {/* Already Voted Message */}
            {hasVoted && !success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-green-100 p-3 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-green-800 mb-2">You have already voted in this election</h3>
                  <p className="text-md text-green-700 mb-6">
                    Your vote has been securely recorded on the blockchain and cannot be changed.
                  </p>
                  <button
                    onClick={() => navigate('/voterDashboard')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-green-100 p-3 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-green-800 mb-2">Vote Successfully Cast!</h3>
                  <p className="text-md text-green-700 mb-4">{success}</p>

                  {!hasVoted && transactionHash && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6 w-full max-w-lg">
                      <h4 className="font-semibold text-yellow-800 mb-2">Waiting for blockchain confirmation...</h4>
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <svg className="animate-spin h-5 w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span className="text-sm text-yellow-600">Your vote is being confirmed on the blockchain</span>
                      </div>
                      <p className="text-xs text-gray-500 break-all">Transaction: {transactionHash}</p>
                    </div>
                  )}

                  {hasVoted && (
                    <div className="bg-green-50 border border-green-200 rounded p-4 mb-6 w-full max-w-lg">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-green-700 font-medium">Vote confirmed on blockchain!</span>
                      </div>
                      {transactionHash && (
                        <p className="text-xs text-gray-500 mt-1 break-all">Transaction: {transactionHash}</p>
                      )}
                    </div>
                  )}

                  <p className="text-gray-600 mb-6">Your vote has been securely recorded and cannot be changed.</p>
                  <button
                    onClick={() => navigate('/voterDashboard')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && election && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-red-800">Error</h3>
                </div>
                <p className="text-sm text-red-700 mt-2">{error}</p>
              </div>
            )}
          </div>

          {/* Voting Form */}
          {!hasVoted && !success && remainingTime > 0 && (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 text-gray-800">Cast Your Vote</h2>

              {!isConnected && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-700">Please connect your wallet to vote.</p>
                </div>
              )}

              {isConnected && !isRegistered && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-700">
                    Your wallet is not registered. Please register before voting.
                  </p>
                  <button
                    onClick={() => navigate('/Register')}
                    className="mt-2 px-4 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                  >
                    Register Now
                  </button>
                </div>
              )}

              {/* New eligibility warning */}
              {isConnected && isRegistered && !isEligible && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      {!userCountry ? (
                        <div>
                          <p className="text-yellow-700 font-medium">
                            Your account needs verification to vote in this election.
                          </p>
                          <p className="mt-2 text-sm text-yellow-700">
                            Please visit the government portal to confirm your account. After confirmation, 
                            you will receive a Voter ID (VID) that allows you to vote if eligible.
                          </p>
                          <button 
                            onClick={() => navigate('/gov')}
                            className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                          >
                            Go to Government Portal
                          </button>
                        </div>
                      ) : eligibleCountries.length > 0 && !eligibleCountries.some(country => 
                          country.trim().toLowerCase() === userCountry.trim().toLowerCase()
                        ) ? (
                        <div>
                          <p className="text-yellow-700 font-medium">
                            You are not eligible to vote in this election.
                          </p>
                          <div className="mt-2 text-sm">
                            <p><span className="font-medium">Your country:</span> {userCountry}</p>
                            <p><span className="font-medium">Eligible countries:</span> {eligibleCountries.join(', ')}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-yellow-700 font-medium">
                            You are not eligible to vote in this election.
                          </p>
                          {/* <p className="mt-2 text-sm text-yellow-700">
                            This is due to one of the following reasons:
                          </p> */}
                          <ul className="mt-1 text-sm text-yellow-700 list-disc pl-5">
                            {/* {userCountry && <li>Your country ({userCountry}) is not eligible for this election</li>} */}
                            <li>Age requirement not met (must be +18)</li>
                            
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleVote}>
                <div className="space-y-4 mb-6">
                  {candidates.length > 0 ? (
                    candidates.map((candidate, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-blue-50 transition-colors">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="candidate"
                            value={candidate}
                            checked={selectedCandidate === candidate}
                            onChange={() => setSelectedCandidate(candidate)}
                            className="form-radio h-5 w-5 text-blue-600"
                            disabled={!isConnected || !isRegistered || isSubmitting}
                          />
                          <div>
                            <h3 className="text-lg font-medium text-gray-800">{candidate}</h3>
                          </div>
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No candidates available for this election.
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => navigate('/voterDashboard')}
                    className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={!isConnected || !isRegistered || !isEligible || isSubmitting || !selectedCandidate || candidates.length === 0}
                    className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center ${(!isConnected || !isRegistered || isSubmitting || !isEligible || !selectedCandidate || candidates.length === 0)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                      }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : 'Submit Vote'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {remainingTime <= 0 && !hasVoted && !success && (
            <div className="p-6 bg-yellow-50 text-center rounded-lg m-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-bold text-yellow-800 mb-2">Election Has Ended</h3>
              <p className="text-yellow-700 mb-4">
                The voting period for this election has ended. No more votes can be cast.
              </p>
              <button
                onClick={() => navigate('/voterDashboard')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default VotePage; 