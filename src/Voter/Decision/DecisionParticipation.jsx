import React, { useState, useEffect } from 'react';
import { useBlockchain } from '../../utils/BlockchainContext';
import CountdownTimer from '../../components/SharedComponents/CountdownTimer';
import * as decisionService from '../../utils/decisionBlockchainService';

const DecisionParticipation = () => {
    const [decisions, setDecisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedOption, setSelectedOption] = useState({});
    const [localVotedDecisions, setLocalVotedDecisions] = useState({});
    const { account } = useBlockchain();
    const [selectedDecision, setSelectedDecision] = useState(null);
    const [decisionResults, setDecisionResults] = useState(null);
    const [loadingResults, setLoadingResults] = useState(false);

    // Key for local storage
    const VOTED_DECISIONS_KEY = `voted_decisions_${account?.toLowerCase() || 'anonymous'}`;

    // Load voted decisions from local storage when component mounts or account changes
    useEffect(() => {
        if (account) {
            const storedVotes = localStorage.getItem(VOTED_DECISIONS_KEY);
            if (storedVotes) {
                try {
                    const parsedVotes = JSON.parse(storedVotes);
                    setLocalVotedDecisions(parsedVotes);
                } catch (e) {
                    console.error('Error parsing stored votes:', e);
                    // Clear invalid data
                    localStorage.removeItem(VOTED_DECISIONS_KEY);
                }
            }
        }
    }, [account]);

    // Save voted decisions to local storage whenever they change
    useEffect(() => {
        if (account && Object.keys(localVotedDecisions).length > 0) {
            localStorage.setItem(VOTED_DECISIONS_KEY, JSON.stringify(localVotedDecisions));
        }
    }, [localVotedDecisions, account]);

    useEffect(() => {
        if (account) {
            loadDecisions();
        }
    }, [account]);

    const loadDecisions = async () => {
        try {
            setLoading(true);
            setError('');
            
            console.log('Getting all decisions...');
            if (!account) {
                setError('Please connect your wallet to view decisions.');
                setLoading(false);
                return;
            }

            console.log('Connected wallet account:', account);
            
            const result = await decisionService.getAllDecisions();
            console.log('All decisions result:', result);
            
            if (!result || !result.status) {
                throw new Error(result?.error || 'Failed to fetch decisions');
            }
            
            // Ensure we have a valid array of decisions
            if (!result.data || !Array.isArray(result.data)) {
                console.error('Invalid data format received:', result.data);
                throw new Error('Invalid data format received from server');
            }
            
            // Filter out any test/mock decisions
            const allDecisions = result.data.filter(decision => 
                decision && 
                decision.name !== "Test Decision" && 
                !decision.description?.includes("demonstration purposes")
            );
            
            console.log(`Processing ${allDecisions.length} decisions...`);
            
            const updatedDecisions = [];
            
            for (const decision of allDecisions) {
                try {
                    // Skip invalid decision objects
                    if (!decision || !decision.id) {
                        console.warn('Skipping invalid decision object:', decision);
                        continue;
                    }
                    
                    console.log(`Processing decision ${decision.id}: ${decision.name}`);
                    
                    // Check if user is whitelisted
                    console.log(`Checking if wallet ${account} is whitelisted for decision ${decision.id}`);
                    const whitelistResult = await decisionService.isUserWhitelisted(decision.id, account);
                    console.log(`Raw whitelist result for decision ${decision.id}:`, JSON.stringify(whitelistResult));
                    
                    // Improved whitelist status checking
                    let isWhitelisted = false;
                    
                    // Check all possible response formats
                    if (whitelistResult && whitelistResult.status) {
                        // Case 1: If the response has data.whitelisted as a boolean
                        if (whitelistResult.data && typeof whitelistResult.data.whitelisted === 'boolean') {
                            isWhitelisted = whitelistResult.data.whitelisted;
                            console.log(`Format 1: data.whitelisted = ${isWhitelisted}`);
                        }
                        // Case 2: If the data itself is a boolean
                        else if (typeof whitelistResult.data === 'boolean') {
                            isWhitelisted = whitelistResult.data;
                            console.log(`Format 2: data = ${isWhitelisted}`);
                        }
                        // Case 3: Direct response from API without nesting
                        else if (whitelistResult.data === true || whitelistResult.data === 'true') {
                            isWhitelisted = true;
                            console.log(`Format 3: data = ${whitelistResult.data}`);
                        }
                    }
                    
                    // Additional check for creator status - creators are always whitelisted
                    if (!isWhitelisted && decision.creator && account) {
                        const normalizedCreator = decision.creator.toLowerCase().trim();
                        const normalizedAccount = account.toLowerCase().trim();
                        if (normalizedCreator === normalizedAccount) {
                            console.log(`User ${account} is the creator of decision ${decision.id}, treating as whitelisted`);
                            isWhitelisted = true;
                        }
                    }
                    
                    console.log(`Final whitelist status for decision ${decision.id}: ${isWhitelisted}`);
                    
                    // Check if user has voted
                    try {
                    const votedResult = await decisionService.hasUserVoted(decision.id, account);
                    const hasVoted = votedResult.status && votedResult.data && votedResult.data.voted;
                        console.log(`Vote status for decision ${decision.id}: ${hasVoted}`);
                    
                    // Check if voting is active
                    const activeResult = await decisionService.isVotingActive(decision.id);
                        console.log(`Active check result for decision ${decision.id}:`, activeResult);
                        
                        // More robust active status checking
                        let isActive = false;
                        
                        // Check the API response
                        if (activeResult && activeResult.status) {
                            if (activeResult.data && typeof activeResult.data.active === 'boolean') {
                                isActive = activeResult.data.active;
                            } else if (typeof activeResult.data === 'boolean') {
                                isActive = activeResult.data;
                            }
                        }
                        
                        // Fallback: Calculate active status based on time
                        if (!isActive) {
                            const currentTime = Math.floor(Date.now() / 1000);
                            const startTime = parseInt(decision.startTime);
                            const endTime = parseInt(decision.endTime);
                            
                            if (currentTime >= startTime && 
                                currentTime <= endTime && 
                                !decision.finalized) {
                                console.log(`Decision ${decision.id} is active based on time calculation`);
                                isActive = true;
                            }
                        }
                        
                        console.log(`Final active status for decision ${decision.id}: ${isActive}`);
                    
                    // Get remaining time if active
                    let remainingTime = 0;
                        let endTimeStamp = 0;
                        
                    if (isActive) {
                            try {
                        const timeResult = await decisionService.getRemainingTime(decision.id);
                        if (timeResult.status && timeResult.data) {
                            remainingTime = parseInt(timeResult.data.remainingTime);
                                    // Calculate the absolute end time for the countdown
                                    endTimeStamp = Math.floor(Date.now() / 1000) + remainingTime;
                                    console.log(`Decision ${decision.id} ends in ${remainingTime} seconds (timestamp: ${endTimeStamp})`);
                                }
                            } catch (err) {
                                console.error(`Error getting remaining time for decision ${decision.id}:`, err);
                                // Fallback to using the decision's end time directly
                                endTimeStamp = parseInt(decision.endTime);
                            }
                        } else {
                            // For inactive decisions, still set the end time for display purposes
                            endTimeStamp = parseInt(decision.endTime);
                    }
                    
                    // Get results
                        let options = [], votes = [];
                        try {
                    const resultsData = await decisionService.getDecisionResults(decision.id);
                            if (resultsData.status && resultsData.data) {
                                if (Array.isArray(resultsData.data.options)) {
                                    options = resultsData.data.options;
                                }
                                if (Array.isArray(resultsData.data.votes)) {
                                    votes = resultsData.data.votes;
                                }
                            }
                        } catch (err) {
                            console.error(`Error getting results for decision ${decision.id}:`, err);
                        }
                    
                    const decisionWithDetails = {
                        id: decision.id,
                        name: decision.name || 'Untitled Decision',
                        description: decision.description || 'No description available',
                        startTime: decision.startTime || '0',
                            endTime: endTimeStamp || decision.endTime || '0',
                        creator: decision.creator || '',
                        options: options,
                        votes: votes,
                        finalized: decision.finalized || false,
                        winningOption: decision.winningOption || '',
                        isWhitelisted: isWhitelisted,
                        hasVoted: hasVoted,
                        isActive: isActive,
                        remainingTime: remainingTime
                    };
                    
                        updatedDecisions.push(decisionWithDetails);
                    console.log(`Successfully loaded decision: ${decision.id}`);
                    } catch (detailErr) {
                        console.error(`Error processing details for decision ${decision.id}:`, detailErr);
                        // Still add the decision with partial information
                        updatedDecisions.push({
                            ...decision,
                            isWhitelisted,
                            hasVoted: false,
                            isActive: false,
                            remainingTime: 0,
                            options: [],
                            votes: []
                        });
                    }
                } catch (err) {
                    console.error(`Error processing decision ${decision?.id}:`, err);
                }
            }

            console.log(`Total decisions loaded: ${updatedDecisions.length}`);
            setDecisions(updatedDecisions);
            
            if (updatedDecisions.length === 0) {
                setError('No decisions found. Please check back later.');
            }
        } catch (err) {
            console.error('Failed to load decisions:', err);
            setError('Failed to load decisions: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (decisionId, optionIndex) => {
        setSelectedOption({
            ...selectedOption,
            [decisionId]: optionIndex
        });
    };

    const submitVote = async (decisionId) => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            if (!account) {
                setError('Please connect your wallet first');
                setLoading(false);
                return;
            }
            
            const option = selectedOption[decisionId];
            if (option === undefined) {
                setError('Please select an option');
                setLoading(false);
                return;
            }

            // Mark this decision as voted in local state FIRST
            const updatedLocalVotedDecisions = {
                ...localVotedDecisions,
                [decisionId]: {
                    voted: true,
                    timestamp: Date.now(),
                    option: option
                }
            };
            setLocalVotedDecisions(updatedLocalVotedDecisions);
            
            // Then submit the vote
            const response = await decisionService.voteOnDecision(decisionId, option, account);
            
            if (response.status) {
                // Show success message to user
                setSuccess('Your vote has been submitted successfully!');
                
                // Update the decisions state
                const updatedDecisions = decisions.map(decision => {
                    if (decision.id === decisionId) {
                        return {
                            ...decision,
                            hasVoted: true
                        };
                    }
                    return decision;
                });
                
                setDecisions(updatedDecisions);
                
                // Wait for a short delay to allow the blockchain to update
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Reload the decisions to get updated data
                await loadDecisions();
                
                // If we were viewing results, refresh them
                if (selectedDecision?.id === decisionId) {
                    await fetchDecisionResults(decisionId);
                }
            } else {
                // If there was an error, remove from local voted decisions
                const revertedLocalVotedDecisions = { ...localVotedDecisions };
                delete revertedLocalVotedDecisions[decisionId];
                setLocalVotedDecisions(revertedLocalVotedDecisions);
                
                setError(response.error || 'Failed to submit vote');
            }
        } catch (err) {
            console.error('Error submitting vote:', err);
            setError(err.message || 'Failed to submit vote');
            
            // If there was an exception, remove from local voted decisions
            const revertedLocalVotedDecisions = { ...localVotedDecisions };
            delete revertedLocalVotedDecisions[decisionId];
            setLocalVotedDecisions(revertedLocalVotedDecisions);
        } finally {
            setLoading(false);
        }
    };

    // Function to clear expired votes from local storage
    const cleanupExpiredVotes = () => {
        if (!account) return;
        
        const storedVotes = localStorage.getItem(VOTED_DECISIONS_KEY);
        if (!storedVotes) return;
        
        try {
            const parsedVotes = JSON.parse(storedVotes);
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            
            const cleanedVotes = Object.entries(parsedVotes).reduce((acc, [decisionId, voteData]) => {
                // Keep votes that are less than 1 day old
                if (now - voteData.timestamp < oneDay) {
                    acc[decisionId] = voteData;
                }
                return acc;
            }, {});
            
            if (Object.keys(cleanedVotes).length !== Object.keys(parsedVotes).length) {
                localStorage.setItem(VOTED_DECISIONS_KEY, JSON.stringify(cleanedVotes));
                setLocalVotedDecisions(cleanedVotes);
            }
        } catch (e) {
            console.error('Error cleaning up expired votes:', e);
        }
    };

    // Clean up expired votes periodically
    useEffect(() => {
        const cleanup = setInterval(cleanupExpiredVotes, 60000); // Run every minute
        cleanupExpiredVotes(); // Run immediately
        return () => clearInterval(cleanup);
    }, [account]);

    const renderStatusBadge = (decision) => {
        if (decision.finalized) {
            return (
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Finalized
                </span>
            );
        } else if (decision.hasVoted) {
            return (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Voted
                </span>
            );
        } else if (decision.isActive) {
            return (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Active
                </span>
            );
        } else {
            return (
                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    Inactive
                </span>
            );
        }
    };

    const renderWhitelistBadge = (isWhitelisted) => {
        if (isWhitelisted) {
            return (
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full ml-2">
                    Whitelisted
                </span>
            );
        } else {
            return (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full ml-2">
                    Not Whitelisted
                </span>
            );
        }
    };

    const fetchDecisionResults = async (decisionId) => {
        try {
            setLoadingResults(true);
            const decision = decisions.find(d => d.id == decisionId);
            if (!decision) {
                throw new Error('Decision not found');
            }
            
            const results = await decisionService.getDecisionResults(decisionId);
            if (results.status) {
                setSelectedDecision(decision);
                setDecisionResults(results.data);
            } else {
                throw new Error(results.error || 'Failed to fetch results');
            }
        } catch (err) {
            console.error('Error fetching decision results:', err);
        } finally {
            setLoadingResults(false);
        }
    };

    const closeResults = () => {
        setSelectedDecision(null);
        setDecisionResults(null);
    };

    const DecisionResultsModal = () => {
        if (!selectedDecision || !decisionResults) return null;
        
        const totalVotes = decisionResults.votes.reduce((sum, count) => sum + parseInt(count), 0);
        
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 xl:w-2/5 shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
                    <div className="mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{selectedDecision.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{selectedDecision.description}</p>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <div className="ml-4">
                                    <h4 className="text-lg font-semibold text-gray-800">Total Votes</h4>
                                    <p className="text-2xl font-bold text-blue-600">{totalVotes}</p>
                                </div>
                            </div>
                            <div className="hidden md:block">
                                <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
                                    <span className="text-sm font-medium">Decision ID: {selectedDecision.id}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                            
                            <div className="space-y-4">
                                {decisionResults.options.map((option, index) => {
                                    const voteCount = parseInt(decisionResults.votes[index] || 0);
                                    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                            const isWinner = selectedDecision.finalized && option === selectedDecision.winningOption;
                                    
                                    return (
                                <div 
                                    key={index} 
                                    className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow duration-200"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-base font-medium text-gray-800">{option}</h4>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-semibold text-gray-600">{voteCount} votes</span>
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                                                {percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                    </div>
                                    <div className="relative pt-1">
                                        <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-gray-200">
                                                <div 
                                                    style={{ width: `${percentage}%` }}
                                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                                                ></div>
                                        </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={closeResults}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const handleCountdownComplete = async (decisionId) => {
        try {
            console.log(`Countdown completed for decision ${decisionId}`);
            // Refresh the decisions list to update status
            await loadDecisions();
        } catch (err) {
            console.error('Error handling countdown complete:', err);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Decision Making</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={loadDecisions}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-md text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-green-50 border border-green-100 rounded-md text-green-700">
                    {success}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : decisions.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                    <p className="text-gray-500">No decisions available at this time.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {decisions.map(decision => {
                        // Check if this decision is voted either from server or local state
                        const isLocallyVoted = localVotedDecisions[decision.id]?.voted;
                        const isVoted = decision.hasVoted || isLocallyVoted;
                        
                        return (
                            <div 
                                key={decision.id} 
                                className={`bg-white rounded-lg shadow-md transition-all duration-300 hover:shadow-lg ${
                                    isVoted ? 'border-l-4 border-blue-400' : 
                                    decision.finalized ? 'border-l-4 border-green-400' :
                                    decision.isActive && decision.isWhitelisted ? 'border-l-4 border-yellow-400' :
                                    'border border-gray-200'
                                }`}
                            >
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-semibold text-gray-800 truncate">{decision.name}</h3>
                                        <div className="flex items-center">
                                            {isVoted ? (
                                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                    Voted
                                                </span>
                                            ) : decision.finalized ? (
                                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                    Finalized
                                                </span>
                                            ) : decision.isActive ? (
                                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                                    Inactive
                                                </span>
                                            )}
                                            {renderWhitelistBadge(decision.isWhitelisted)}
                                        </div>
                                </div>
                                
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{decision.description}</p>
                                
                                    <div className="mb-3">
                                    {decision.isActive && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <svg className="h-4 w-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="font-medium mr-2">Ends in:</span>
                                            <CountdownTimer 
                                                    endTime={decision.endTime}
                                                compact={true}
                                                    className="text-blue-600 font-bold"
                                                    onComplete={() => handleCountdownComplete(decision.id)}
                                            />
                                        </div>
                                    )}
                                        
                                        {!decision.isActive && !decision.finalized && parseInt(decision.endTime) < Math.floor(Date.now() / 1000) && (
                                            <div className="flex items-center text-sm text-red-600">
                                                <svg className="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span className="font-medium">Decision period has ended</span>
                                        </div>
                                    )}
                                </div>
                                
                                {decision.finalized ? (
                                        <div className="mb-3 p-3 bg-green-50 rounded-md border border-green-100">
                                            <div className="flex items-center">
                                                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="text-sm font-medium text-green-700">
                                                    Winner: <span className="font-bold">{decision.winningOption}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ) : isVoted ? (
                                        <div className="mb-3 p-4 bg-blue-50 border border-blue-100 rounded-md">
                                            <div className="flex items-center mb-2">
                                                <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="font-medium text-blue-700">
                                                    You made your decision
                                                </p>
                                            </div>
                                            <div className="ml-7 space-y-1">
                                                <p className="text-sm text-blue-600">
                                                    Your vote has been recorded and will be counted in the final results.
                                                </p>
                                                <p className="text-sm text-blue-800 font-medium mt-2">
                                                    You can view the current results using the button below.
                                        </p>
                                    </div>
                                        </div>
                                    ) : decision.isActive && decision.isWhitelisted ? (
                                        <div className="mb-3">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Cast your vote:</h4>
                                        <div className="space-y-2">
                                            {decision.options.map((option, index) => (
                                                <div key={index} className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        id={`decision-${decision.id}-option-${index}`}
                                                        name={`decision-${decision.id}`}
                                                        checked={selectedOption[decision.id] === index}
                                                        onChange={() => handleOptionSelect(decision.id, index)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <label 
                                                        htmlFor={`decision-${decision.id}-option-${index}`}
                                                            className="ml-2 text-sm text-gray-700 truncate"
                                                    >
                                                        {option}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => submitVote(decision.id)}
                                            disabled={selectedOption[decision.id] === undefined}
                                                className="mt-3 w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                                        >
                                            Submit Vote
                                        </button>
                                    </div>
                                ) : null}
                                
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                    <button
                                        onClick={() => fetchDecisionResults(decision.id)}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                                isVoted 
                                                    ? 'bg-blue-700 hover:bg-blue-800 text-white shadow-md' 
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                        >
                                            <span className="flex items-center">
                                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                {isVoted ? 'See Results' : 'View Results'}
                                            </span>
                                    </button>
                                    
                                        <span className="text-xs text-gray-500">
                                            ID: {decision.id}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Results Modal */}
            {selectedDecision && <DecisionResultsModal />}
        </div>
    );
};

export default DecisionParticipation;