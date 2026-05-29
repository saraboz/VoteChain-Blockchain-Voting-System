import React, { useState, useEffect } from 'react';
import Header from '../../components/SharedComponents/Header';
import Footer from '../../components/SharedComponents/Footer';
import { Link } from "react-router-dom";
import { useBlockchain } from '../../utils/BlockchainContext';
import WalletConnect from '../../components/SharedComponents/WalletConnect';
import CountdownTimer from '../../components/SharedComponents/CountdownTimer';
import { 
  getElectionDetails, 
  getCandidates, 
  getRemainingTime, 
  checkVoteStatus, 
  getResults,
  getTotalVotes,
  getWinner,
  getAllElections,
  getResultsVisibility,
  fetchDataFromIPFS,
  getIPFSImageUrl
} from '../../utils/blockchainService';
import SurveyParticipation from '../Survey/SurveyParticipation';
import DecisionParticipation from '../Decision/DecisionParticipation';

const VoterDashboard = () => {
    const [activeSection, setActiveSection] = useState('dashboard');
    const [availableElections, setAvailableElections] = useState([]);
    const [myBallots, setMyBallots] = useState([]);
    const [electionResults, setElectionResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedElection, setSelectedElection] = useState(null);
    const [candidateData, setCandidateData] = useState(null);
    const [ipfsLoading, setIpfsLoading] = useState(false);
    const [showSurveys, setShowSurveys] = useState(false);
    const [showDecisions, setShowDecisions] = useState(false);
    
    const { account, isConnected, isRegistered, refreshRegistrationStatus } = useBlockchain();

    // Fetch data whenever account or connection status changes
    useEffect(() => {
        const loadData = async () => {
            // Always refresh registration status first to get latest blockchain data
            if (isConnected && account) {
                await refreshRegistrationStatus();
                fetchData();
            } else {
                // Reset data or show demo data when not connected
                setAvailableElections([
                    { id: 'E001', name: 'Presidential Election 2025', startTime: 'Mar 22, 2025', duration: '2 days', active: true }
                ]);
                setMyBallots([]);
                setElectionResults([]);
                setLoading(false);
            }
        };
        
        loadData();
    }, [isConnected, account, refreshRegistrationStatus]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch all available elections from the blockchain
            const electionResponse = await getAllElections();
            console.log("Raw election response:", electionResponse);
            
            // Check if we got a valid response
            if (!electionResponse.status) {
                const errorMsg = electionResponse.error || "Failed to fetch elections from blockchain";
                console.error(errorMsg);
                setError(errorMsg);
                setLoading(false);
                return;
            }
            
            // Make sure we have elections array - handle both response formats
            let electionData = [];
            if (electionResponse.elections && Array.isArray(electionResponse.elections)) {
                electionData = electionResponse.elections;
            } else if (electionResponse.data && electionResponse.data.elections && Array.isArray(electionResponse.data.elections)) {
                electionData = electionResponse.data.elections;
            } else {
                console.error("Invalid elections data format:", electionResponse);
                // If no elections data, set empty array
                setAvailableElections([]);
                setLoading(false);
                return;
            }
            
            console.log("Fetched elections:", electionData);
            
            // Process each election to get details
            const electionsPromises = electionData.map(async (election) => {
                try {
                    // Add logging to debug election format
                    console.log("Processing election item:", election);
                    
                    // Directly use the election data from API response
                    const startDate = new Date(parseInt(election.startTime) * 1000).toLocaleDateString();
                    const endTimestamp = parseInt(election.startTime) + parseInt(election.duration);
                    const endDate = new Date(endTimestamp * 1000).toLocaleDateString();
                    
                    return {
                        id: election.id,
                        name: election.name,
                        startDate,
                        endDate,
                        startTimestamp: parseInt(election.startTime),
                        endTimestamp,
                        status: election.active ? 'Active' : 'Inactive',
                        ipfsHash: election.ipfsHash
                    };
                } catch (err) {
                    console.error(`Error processing election ${election.id}:`, err);
                    return null;
                }
            });
            
            const elections = (await Promise.all(electionsPromises)).filter(Boolean);
            console.log("Processed elections:", elections);
            setAvailableElections(elections.length > 0 ? elections : []);

            // Create a map to track visibility of all elections
            const visibilityMap = {};
            
            // First check visibility for all elections upfront
            for (const election of elections) {
                try {
                    const visibilityResponse = await getResultsVisibility(election.id);
                    visibilityMap[election.id] = visibilityResponse.visible;
                    console.log(`Election ${election.id} visibility:`, visibilityResponse.visible);
                } catch (err) {
                    console.error(`Error checking visibility for election ${election.id}:`, err);
                    visibilityMap[election.id] = false;
                }
            }
            
            // Check vote status for the user's wallet on each election - always gets fresh data
            if (account) {
                const ballotsPromises = elections.map(async (election) => {
                    try {
                        const { voted } = await checkVoteStatus(election.id, account);
                        
                        if (voted) {
                            // If user has voted, get election details
                            const candidates = await getCandidates(election.id);
                            
                            // Get the visibility status from our precomputed map
                            const isVisible = visibilityMap[election.id] || false;
                            
                            // For demo purposes since we can't know which candidate the user voted for
                            return {
                                id: `B-${election.id}`,
                                electionId: election.id,
                                electionName: election.name,
                                votedOn: election.startDate, // Approximate for demo
                                candidate: candidates.candidates[0], // First candidate as placeholder
                                resultsVisible: isVisible,
                                resultId: `R-${election.id}` // Explicit reference to results section
                            };
                        }
                        return null;
                    } catch (err) {
                        console.error(`Error checking vote status for ${election.id}:`, err);
                        return null;
                    }
                });
                
                const ballots = (await Promise.all(ballotsPromises)).filter(Boolean);
                console.log("User ballots:", ballots);
                setMyBallots(ballots);
                
                // Fetch results for completed elections - always gets fresh data
                const resultsPromises = elections
                    // Show results for ALL elections, not just inactive ones
                    .map(async (election) => {
                        try {
                            // Use the previously checked visibility status
                            const isVisible = visibilityMap[election.id] || false;
                            console.log(`Processing election ${election.id} for results display, visibility: ${isVisible}`);
                            
                            // Create result object even if results are not visible
                            return {
                                id: `R-${election.id}`,
                                electionId: election.id,
                                electionName: election.name,
                                winner: isVisible ? await getWinner(election.id).then(r => r.winner).catch(() => "Not available") : null,
                                totalVotes: isVisible ? await getTotalVotes(election.id).then(r => parseInt(r.totalVotes)).catch(() => 0) : 0,
                                date: election.endDate,
                                candidates: isVisible ? await getResults(election.id)
                                    .then(({ candidates, votes }) => {
                                        const totalVotes = candidates.reduce((sum, _, i) => sum + parseInt(votes[i] || 0), 0);
                                        
                                        // Get the highest vote count
                                        const votesCounts = votes.map(v => parseInt(v || 0));
                                        const highestVoteCount = Math.max(...votesCounts);
                                        
                                        // Count how many candidates have the highest vote count
                                        const tiedCandidates = votesCounts.filter(v => v === highestVoteCount).length;
                                        
                                        // If more than one candidate has the highest vote count, it's a tie
                                        const hasTie = tiedCandidates > 1 && highestVoteCount > 0;
                                        
                                        const candidatesData = candidates.map((candidate, index) => {
                                            const voteCount = parseInt(votes[index] || 0);
                                            const percentage = totalVotes > 0 
                                                ? Math.round((voteCount / totalVotes) * 100) 
                                                : 0;
                                            
                                            return {
                                                name: candidate,
                                                votes: voteCount,
                                                percentage,
                                                isTied: hasTie && voteCount === highestVoteCount
                                            };
                                        });
                                        
                                        return candidatesData;
                                    })
                                    .catch(() => []) : [],
                                visible: isVisible,
                                status: election.status,
                                // Check if there's a tie directly here
                                hasTie: isVisible ? await getResults(election.id)
                                    .then(({ candidates, votes }) => {
                                        if (!votes || votes.length === 0) return false;
                                        
                                        const votesCounts = votes.map(v => parseInt(v || 0));
                                        const highestVoteCount = Math.max(...votesCounts);
                                        
                                        // Count how many candidates have the highest vote count
                                        const tiedCandidates = votesCounts.filter(v => v === highestVoteCount).length;
                                        
                                        // If more than one candidate has the highest vote count, it's a tie
                                        return tiedCandidates > 1 && highestVoteCount > 0;
                                    })
                                    .catch(() => false) : false
                            };
                        } catch (err) {
                            console.error(`Error fetching results for ${election.id}:`, err);
                            // Return a placeholder result object for failed elections
                            return {
                                id: `R-${election.id}`,
                                electionId: election.id,
                                electionName: election.name,
                                winner: null,
                                totalVotes: 0,
                                date: election.endDate,
                                candidates: [],
                                visible: false,
                                status: election.status,
                                error: true
                            };
                        }
                    });
                
                const results = (await Promise.all(resultsPromises)).filter(Boolean);
                console.log("Election results:", results);
                setElectionResults(results);
            }
            
            setLoading(false);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load election data. Please try again later.");
            setLoading(false);
        }
    };

    // Add a function to check if an election has ended based on timestamp
    const hasElectionExpired = (endTimestamp) => {
        const currentTime = Math.floor(Date.now() / 1000);
        return currentTime >= endTimestamp;
    };

    // Add a function to handle countdown completion
    const handleCountdownComplete = (electionId) => {
        // Find the election by ID and update its status to inactive
        setAvailableElections(prev => 
            prev.map(election => 
                election.id === electionId 
                    ? { ...election, status: 'Inactive' } 
                    : election
            )
        );
        console.log(`Election ${electionId} countdown completed, marked as inactive`);
    };

    // Add a function to handle candidate data fetching from IPFS
    const fetchCandidateData = async (election) => {
        try {
            // Reset previous candidate data
            setCandidateData(null);
            
            // Show loading state
            setIpfsLoading(true);
            setSelectedElection(election);
            
            if (!election || !election.ipfsHash) {
                console.error('No IPFS hash available for election', election?.id);
                setCandidateData(null);
                setIpfsLoading(false);
                return;
            }
            
            console.log(`Fetching candidate data for election ${election.id} from IPFS hash: ${election.ipfsHash}`);
            
            const response = await fetchDataFromIPFS(election.ipfsHash);
            
            if (response.status === false) {
                console.error('Failed to fetch candidate data:', response.error);
                setCandidateData(null);
            } else {
                console.log('Successfully fetched candidate data:', response.data);
                setCandidateData(response.data);
            }
        } catch (err) {
            console.error('Error fetching candidate data:', err);
            setCandidateData(null);
        } finally {
            setIpfsLoading(false);
        }
    };

    // Add a function to render the candidate details
    const renderCandidateDetails = () => {
        if (!selectedElection) return null;
        
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        Candidate Information for {selectedElection.name}
                    </h2>
                    <button 
                        onClick={() => setSelectedElection(null)} 
                        className="text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 px-3 py-1.5 rounded-md hover:from-blue-700 hover:to-indigo-800 font-medium"
                    >
                        Close
                    </button>
                </div>
                
                {ipfsLoading ? (
                    <div className="flex justify-center items-center p-8">
                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span className="ml-3 text-gray-600">Loading candidate information...</span>
                    </div>
                ) : candidateData ? (
                    <div className="space-y-6">
                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="text-lg font-semibold mb-2">Election ID: {candidateData.electionId}</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {candidateData.candidates && candidateData.candidates.map((candidate, index) => (
                                <div key={candidate.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                                        <div className="flex items-center space-x-4">
                                            {candidate.photo && (
                                                <div className="flex-shrink-0">
                                                    <img 
                                                        src={getIPFSImageUrl(candidate.photo)} 
                                                        alt={`${candidate.name} photo`}
                                                        className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = "https://via.placeholder.com/64?text=Photo";
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="text-lg font-bold text-blue-900">{candidate.name}</h4>
                                                <p className="text-sm text-gray-600">ID: {candidate.id}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4">
                                        <div className="mb-4">
                                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Biography</h5>
                                            <p className="text-sm text-gray-600">{candidate.biography}</p>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Professional Background</h5>
                                            <p className="text-sm text-gray-600">{candidate.professionalBackground}</p>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Policy Positions</h5>
                                            <ul className="list-disc list-inside text-sm text-gray-600">
                                                {candidate.policyPositions && candidate.policyPositions.map((policy, i) => (
                                                    <li key={i}>{policy}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Campaign Promises</h5>
                                            <ul className="list-disc list-inside text-sm text-gray-600">
                                                {candidate.campaignPromises && candidate.campaignPromises.map((promise, i) => (
                                                    <li key={i}>{promise}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-4 border-t border-gray-200">
                                        {selectedElection.status === 'Active' ? (
                                            <Link to={`/vote/${selectedElection.id}`} className="w-full block text-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm font-medium">
                                                Vote for this Candidate
                                            </Link>
                                        ) : (
                                            <span className="w-full block text-center px-4 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed text-sm font-medium">
                                                Voting Closed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>No candidate information available. The IPFS data may be missing or incorrectly formatted.</p>
                    </div>
                )}
            </div>
        );
    };

    // Add this function to render a preview of candidates when fetched
    const renderCandidatePreview = () => {
        if (!selectedElection || !candidateData || !candidateData.candidates) return null;
        
        return (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-blue-100">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Candidates</h3>
                <div className="flex flex-wrap gap-4">
                    {candidateData.candidates.map((candidate) => (
                        <div key={candidate.id} className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                            {candidate.photo ? (
                                <img 
                                    src={getIPFSImageUrl(candidate.photo)} 
                                    alt={candidate.name}
                                    className="h-10 w-10 rounded-full object-cover border border-white"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://via.placeholder.com/40?text=Photo";
                                    }}
                                />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
                                    {candidate.name.charAt(0)}
                                </div>
                            )}
                            <span className="text-sm font-medium text-gray-700">{candidate.name}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex justify-end">
                    <button 
                        onClick={() => setSelectedElection(null)} 
                        className="text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 px-3 py-1.5 rounded-md hover:from-blue-700 hover:to-indigo-800 font-medium mr-4"
                    >
                        Close preview
                    </button>
                    <Link to={`/vote/${selectedElection.id}`} className="text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 px-3 py-1.5 rounded-md hover:from-blue-700 hover:to-indigo-800 font-medium">
                        Vote Now
                    </Link>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (showSurveys) {
            return <SurveyParticipation />;
        }

        if (showDecisions) {
            return <DecisionParticipation />;
        }

        // Show connect wallet message if not connected
        if (!isConnected) {
            return (
                <div className="bg-white rounded-lg shadow-lg p-10 mb-8 text-center">
                    <div className="mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect Your Wallet</h2>
                    <p className="text-gray-600 mb-8">Please connect your blockchain wallet to access the voting platform</p>
                    <div className="flex justify-center">
                        <WalletConnect className="mx-auto" />
                    </div>
                </div>
            );
        }
        
        // Show registration needed message if connected but not registered
        if (isConnected && !isRegistered) {
            return (
                <div className="bg-white rounded-lg shadow-lg p-10 mb-8 text-center">
                    <div className="mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Required</h2>
                    <p className="text-gray-600 mb-8">Your wallet is connected but not registered in the system. Please register first.</p>
                    <Link to="/Register" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium inline-block">
                        Register Now
                    </Link>
                </div>
            );
        }
        
        // Show loading indicator
        if (loading) {
            return (
                <div className="bg-white rounded-lg shadow-lg p-10 mb-8 text-center">
                    <div className="flex justify-center mb-6">
                        <svg className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                    </div>
                    <h2 className="text-xl font-medium text-gray-700">Loading election data...</h2>
                </div>
            );
        }
        
        // Show error message if there was an error
        if (error) {
            return (
                <div className="bg-white rounded-lg shadow-lg p-10 mb-8 text-center">
                    <div className="mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Data</h2>
                    <p className="text-gray-600 mb-8">{error}</p>
                    <button 
                        onClick={fetchData} 
                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        
        // Regular content based on active section
        switch(activeSection) {
            case 'available':
                return (
                    <div className="space-y-8">
                        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-700">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Elections</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-blue-50">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Election ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Start Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">End Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Countdown</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Action</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Candidates</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-blue-100">
                                        {availableElections.map((election) => {
                                            const now = Math.floor(Date.now() / 1000);
                                            const isElectionEnded = now > election.endTimestamp || election.status !== 'Active';
                                            
                                            return (
                                                <tr key={election.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">{election.id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{election.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">{election.startDate}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">{election.endDate}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {election.status === 'Active' ? (
                                                            <CountdownTimer 
                                                                endTime={election.endTimestamp}
                                                                compact={true}
                                                                className="text-sm text-blue-600 font-medium"
                                                                onComplete={() => handleCountdownComplete(election.id)}
                                                            />
                                                        ) : (
                                                            <span className="text-sm text-gray-500">Finished</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            election.status === 'Active' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {election.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {election.status === 'Active' ? (
                                                            <Link to={`/vote/${election.id}`} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm font-medium inline-block">
                                                                Vote Now
                                                            </Link>
                                                        ) : (
                                                            <span className="text-gray-400">Not Available</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => fetchCandidateData(election)}
                                                            className="px-4 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors duration-200 text-sm font-medium inline-block"
                                                        >
                                                            View Candidates
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {availableElections.length === 0 && (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                                                    No elections available at this time.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {ipfsLoading && selectedElection && (
                            <div className="mt-4 p-6 bg-white rounded-lg shadow-sm border border-blue-100 flex items-center justify-center">
                                <svg className="animate-spin h-6 w-6 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                <span className="text-gray-600">Loading candidate information...</span>
                            </div>
                        )}
                        
                        {selectedElection && !ipfsLoading && candidateData && candidateData.candidates && 
                            activeSection === 'available' ? renderCandidateDetails() : renderCandidatePreview()}
                    </div>
                );
                
            case 'ballots':
                return (
                    <div className="space-y-8">
                        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-700">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Ballots</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-blue-50">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Ballot ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Election Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Voted On</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-blue-100">
                                        {myBallots.map((ballot) => (
                                            <tr key={ballot.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-800">{ballot.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{ballot.electionName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-800">{ballot.votedOn}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {ballot.resultsVisible ? (
                                                        <button
                                                            onClick={() => {
                                                                const resultId = `R-${ballot.electionId}`;
                                                                console.log(`Trying to scroll to result with ID: ${resultId}`);
                                                                
                                                                // Find the element by ID
                                                                const resultElement = document.getElementById(resultId);
                                                                if (resultElement) {
                                                                    console.log("Found element, scrolling to it");
                                                                    resultElement.scrollIntoView({ behavior: 'smooth' });
                                                                    // Highlight the element briefly
                                                                    resultElement.classList.add('highlight-result');
                                                                    setTimeout(() => {
                                                                        resultElement.classList.remove('highlight-result');
                                                                    }, 2000);
                                                                } else {
                                                                    console.error(`Could not find element with ID: ${resultId}`);
                                                                    // Display all elections in results section
                                                                    console.log("Available result elements:");
                                                                    document.querySelectorAll('[id^="R-"]').forEach(el => {
                                                                        console.log(el.id);
                                                                    });
                                                                    
                                                                    // Scroll to results section as fallback
                                                                    const resultsSection = document.querySelector('.election-results-section');
                                                                    if (resultsSection) {
                                                                        resultsSection.scrollIntoView({ behavior: 'smooth' });
                                                                    }
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium flex items-center"
                                                        >
                                                            View Results
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed transition-colors duration-200 text-sm font-medium flex items-center"
                                                        >
                                                            Results Hidden
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {myBallots.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                    You haven't voted in any elections yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700 election-results-section">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">Election Results</h2>
                            
                            {electionResults.length > 0 ? (
                                electionResults.map((result) => (
                                    <div id={result.id} key={result.id} className="mb-12 last:mb-0 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md">
                                        <div className="flex justify-between items-center mb-6 border-b border-blue-200 pb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-blue-900">{result.electionName}</h3>
                                                <p className="text-sm text-gray-600 mt-1">Concluded on {result.date}</p>
                                                <p className="text-xs text-gray-500">Election ID: {result.electionId}</p>
                                            </div>
                                            <div className="bg-blue-100 px-4 py-2 rounded-full">
                                                <span className="text-sm font-semibold text-blue-800">
                                                    {result.visible ? `${result.totalVotes.toLocaleString()} Total Votes` : 'Results Hidden'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {result.visible ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
                                                    <div className="flex justify-center items-center h-48 relative">
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="text-center">
                                                                <div className="text-2xl font-bold text-blue-800">
                                                                    {result.hasTie ? 'Tie' : 'Winner'}
                                                                </div>
                                                                <div className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mt-2">
                                                                    {result.hasTie ? 'Multiple Candidates Tied' : result.winner}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {result.candidates.length > 0 && (
                                                            <svg viewBox="0 0 36 36" className="h-full w-full">
                                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                                                                {result.candidates.map((candidate, i) => {
                                                                    // Calculate where this segment starts
                                                                    const prevPercents = result.candidates
                                                                        .slice(0, i)
                                                                        .reduce((acc, c) => acc + c.percentage, 0);
                                                                    
                                                                    // Convert percentage to strokeDasharray
                                                                    const strokeDasharray = `${candidate.percentage * 0.01 * 100} 100`;
                                                                    
                                                                    // Calculate rotation to position correctly
                                                                    const rotate = `rotate(${(prevPercents * 3.6) - 90} 18 18)`;

                                                                    // Pick colors based on position (winner gets primary color)
                                                                    const colors = [
                                                                        "stroke-blue-600", "stroke-indigo-400", "stroke-cyan-500", 
                                                                        "stroke-gray-400", "stroke-teal-500"
                                                                    ];
                                                                    
                                                                    return (
                                                                        <circle 
                                                                            key={i}
                                                                            cx="18" 
                                                                            cy="18" 
                                                                            r="15.915" 
                                                                            fill="none" 
                                                                            className={colors[i % colors.length]}
                                                                            strokeWidth="3.8" 
                                                                            strokeDasharray={strokeDasharray}
                                                                            strokeDashoffset="25"
                                                                            transform={rotate}
                                                                        />
                                                                    );
                                                                })}
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
                                                    <h4 className="font-semibold text-gray-700 mb-4">Vote Distribution</h4>
                                                    {result.candidates.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {result.candidates.map((candidate, idx) => (
                                                                <div key={idx} className="bg-blue-50 rounded-lg p-3 transition-all duration-300 hover:shadow-md">
                                                                    <div className="flex justify-between mb-2">
                                                                        <span className="font-medium text-gray-800">{candidate.name}</span>
                                                                        <span className="text-gray-600">{candidate.votes.toLocaleString()} votes</span>
                                                                    </div>
                                                                    <div className="relative pt-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                                                                                    (candidate.name === result.winner || candidate.isTied)
                                                                                        ? 'bg-blue-200 text-blue-800' 
                                                                                        : 'bg-gray-200 text-gray-700'
                                                                                }`}>
                                                                                    {candidate.percentage}%
                                                                                </span>
                                                                            </div>
                                                                            {result.hasTie && candidate.isTied ? (
                                                                                <div className="text-xs text-blue-600 font-semibold">
                                                                                    Tied
                                                                                </div>
                                                                            ) : candidate.name === result.winner && !result.hasTie ? (
                                                                                <div className="text-xs text-blue-600 font-semibold">
                                                                                    Winner
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                        <div className="overflow-hidden h-2 mt-2 text-xs flex rounded bg-gray-200">
                                                                            <div 
                                                                                style={{ width: `${candidate.percentage}%` }} 
                                                                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                                                                    (candidate.name === result.winner || candidate.isTied)
                                                                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
                                                                                        : 'bg-gray-400'
                                                                                }`}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-500 text-center py-6">
                                                            No candidate data available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-xl shadow-sm border border-blue-100">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                                <h4 className="text-xl font-medium text-gray-700 mb-2">Results Not Visible</h4>
                                                <p className="text-gray-500 text-center mb-4">
                                                    The administrator has not made the results of this election visible yet.
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-end pt-4 border-t border-blue-100">
                                            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium">
                                                View Full Election Report
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-gray-500">
                                    No completed elections found.
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return (
                    <>
                        {/* Wallet Connection Status */}
                        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-t-4 border-blue-700">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                                <div className="mb-4 md:mb-0">
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">Blockchain Wallet</h3>
                                    <p className="text-gray-600">Manage your blockchain connection</p>
                                </div>
                                <WalletConnect />
                            </div>
                        </div>
                
                        {/* Status Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1 font-medium">Active Elections</p>
                                        <h3 className="text-2xl font-bold text-gray-800">
                                            {availableElections.filter(e => e.status === 'Active').length}
                                        </h3>
                                    </div>
                                    <div className="bg-green-100 p-3 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button 
                                        onClick={() => setActiveSection('available')} 
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                                    >
                                        View all active elections
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-cyan-500 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1 font-medium">My Ballots</p>
                                        <h3 className="text-2xl font-bold text-gray-800">{myBallots.length}</h3>
                                    </div>
                                    <div className="bg-cyan-100 p-3 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-600" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button 
                                        onClick={() => setActiveSection('ballots')} 
                                        className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors duration-200 text-sm font-medium"
                                    >
                                        View my voting history
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1 font-medium">Election Results</p>
                                        <h3 className="text-2xl font-bold text-gray-800">{electionResults.length}</h3>
                                    </div>
                                    <div className="bg-blue-100 p-3 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button 
                                        onClick={() => setActiveSection('ballots')} 
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                                    >
                                        View election results
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Recent Elections - Preview */}
                        <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-700">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-gray-800">Available Elections</h2>
                                <button 
                                    onClick={() => setActiveSection('available')}
                                    className="text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 px-3 py-1.5 rounded-md hover:from-blue-700 hover:to-indigo-800 font-medium"
                                >
                                    View All →
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-blue-50">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Election Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Start Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">End Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Action</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Candidates</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-blue-100">
                                        {availableElections.slice(0, 2).map((election) => {
                                            return (
                                                <tr key={election.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{election.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            election.status === 'Active' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {election.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">{election.startDate}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">{election.endDate}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {election.status === 'Active' ? (
                                                            <Link to={`/vote/${election.id}`} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm font-medium inline-block">
                                                                Vote Now
                                                            </Link>
                                                        ) : (
                                                            <span className="text-gray-400">Not Available</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => fetchCandidateData(election)}
                                                            className="px-4 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors duration-200 text-sm font-medium inline-block"
                                                        >
                                                            View Candidates
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {availableElections.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                    No elections available at this time.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {selectedElection && !ipfsLoading && candidateData && candidateData.candidates && 
                            activeSection === 'available' ? renderCandidateDetails() : renderCandidatePreview()}
                    </>
                );
        }
    };

    return (
        <div className='w-full'>
            <Header/>
            <div className="bg-gray-50 min-h-screen">
                <div className="flex flex-grow flex-col md:flex-row">
                    {/* Sidebar */}
                    <div className="w-64 bg-gradient-to-b from-blue-900 to-indigo-900 hidden md:block min-h-screen">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-white mb-6 pl-4 border-l-4 border-cyan-400">Voter Portal</h2>
                            <nav className="space-y-3">
                                <button
                                    onClick={() => {
                                        setActiveSection('dashboard');
                                        setShowSurveys(false);
                                        setShowDecisions(false);
                                    }}
                                    className={`flex items-center px-4 py-3 rounded-lg w-full text-left ${
                                        activeSection === 'dashboard' && !showSurveys && !showDecisions
                                            ? 'bg-white text-blue-900 font-medium' 
                                            : 'bg-blue-800 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    <span className="font-medium">Dashboard</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveSection('available');
                                        setShowSurveys(false);
                                        setShowDecisions(false);
                                    }}
                                    className={`flex items-center px-4 py-3 rounded-lg w-full text-left ${
                                        activeSection === 'available' && !showSurveys && !showDecisions
                                            ? 'bg-white text-blue-900 font-medium' 
                                            : 'bg-blue-800 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2" />
                                    </svg>
                                    <span className="font-medium">Available Elections</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveSection('ballots');
                                        setShowSurveys(false);
                                        setShowDecisions(false);
                                    }}
                                    className={`flex items-center px-4 py-3 rounded-lg w-full text-left ${
                                        activeSection === 'ballots' && !showSurveys && !showDecisions
                                            ? 'bg-white text-blue-900 font-medium' 
                                            : 'bg-blue-800 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">My Ballots</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveSection('results');
                                        setShowSurveys(false);
                                        setShowDecisions(false);
                                    }}
                                    className={`flex items-center px-4 py-3 rounded-lg w-full text-left ${
                                        activeSection === 'results' && !showSurveys && !showDecisions
                                            ? 'bg-white text-blue-900 font-medium' 
                                            : 'bg-blue-800 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <span className="font-medium">Election Results</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowSurveys(true);
                                        setShowDecisions(false);
                                    }}
                                    className={`flex items-center px-4 py-3 rounded-lg w-full text-left ${
                                        showSurveys
                                            ? 'bg-white text-blue-900 font-medium'
                                            : 'bg-blue-800 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <span className="font-medium">Surveys</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowDecisions(true);
                                        setShowSurveys(false);
                                    }}
                                    className={`flex items-center px-4 py-3 rounded-lg w-full text-left ${
                                        showDecisions
                                            ? 'bg-white text-blue-900 font-medium'
                                            : 'bg-blue-800 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    <span className="font-medium">Decisions</span>
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="container mx-auto">
                            {/* Progress bar with gradient */}
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                            
                            {/* Header section */}
                            <div className="flex items-center justify-between mb-8">
                                <h1 className="text-2xl font-bold text-gray-800 border-l-4 border-cyan-400 pl-4">
                                    {activeSection === 'dashboard' && 'Voter Dashboard'}
                                    {activeSection === 'results' && 'Election Results'}
                                    {activeSection === 'available' && 'Available Elections'}
                                    {activeSection === 'ballots' && 'My Voting History'}
                                </h1>
                                <div className="flex space-x-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search elections..."
                                            className="pl-10 pr-4 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm text-gray-700"
                                        />
                                        <svg xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-blue-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24"
                                            stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <button 
                                        onClick={() => setActiveSection('available')}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 shadow-md flex items-center space-x-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span>Join Election</span>
                                    </button>
                                </div>
                            </div>

                            {/* Dynamic content based on active section */}
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
            <Footer logoLeftPosition={30}/>
        </div>
    );
};

export default VoterDashboard;