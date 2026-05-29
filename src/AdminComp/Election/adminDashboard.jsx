import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/SharedComponents/Header";
import Footer from "../../components/SharedComponents/Footer";
import { Link } from "react-router-dom";
import { createElection as createElectionAPI, getAdminElections } from '../../utils/api';
import { 
    createElection as createBlockchainElection,
    addCandidate as addBlockchainCandidate,
    getAllElections,
    getResults,
    getResultsVisibility,
    getTotalVotes,
    getWinner,
    endElection as endBlockchainElection,
    activateElection
} from '../../utils/blockchainService';
import { useBlockchain } from '../../utils/BlockchainContext';
import WalletConnect from '../../components/SharedComponents/WalletConnect';
import ManageCountries from './ManageCountries';
import ActivateElection from './ActivateElection';
import EndElection from './EndElection';
import ManageResultVisibility from './ManageResultVisibility';
import CountdownTimer from '../../components/SharedComponents/CountdownTimer';
import SurveyManagement from '../Survey/SurveyManagement';
import DecisionManagement from '../Decision/DecisionManagement';

const AdminDashboard = ({ initialSection = 'dashboard' }) => {
    const [activeSection, setActiveSection] = useState(initialSection);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showManageCountries, setShowManageCountries] = useState(false);
    const [showCandidatesForm, setShowCandidatesForm] = useState(false);
    const [showActivateElection, setShowActivateElection] = useState(false);
    const [showEndElection, setShowEndElection] = useState(false);
    const [showResultVisibility, setShowResultVisibility] = useState(false);
    const [showSurveyManagement, setShowSurveyManagement] = useState(false);
    const [showDecisionManagement, setShowDecisionManagement] = useState(false);
    const [electionData, setElectionData] = useState({
        id: '',
        name: '',
        durationMinutes: 60,
        ipfsHash: '',
        candidates: []
    });
    const [candidatesFormData, setCandidatesFormData] = useState({
        electionId: '',
        candidate: '',
        addedCandidates: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [success, setSuccess] = useState('');
    const [currentElections, setCurrentElections] = useState([]);
    const [loadingElections, setLoadingElections] = useState(false);
    const [electionResults, setElectionResults] = useState([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get blockchain context for wallet connection
    const { account, isConnected, isRegistered } = useBlockchain();

    // Fetch all elections for the dashboard
    useEffect(() => {
        const fetchElections = async () => {
            setLoadingElections(true);
            setError('');
            
            try {
                console.log("Attempting to fetch elections from blockchain service...");
                
                // Try blockchain service first
                try {
                    const blockchainResponse = await getAllElections();
                    console.log("Response from blockchain getAllElections:", blockchainResponse);
                    
                    if (blockchainResponse.status && blockchainResponse.data && blockchainResponse.data.elections) {
                        console.log("Successfully loaded elections from blockchain:", blockchainResponse.data.elections);
                        
                        // Get expired elections from localStorage
                        let expiredElectionIds = [];
                        try {
                            const savedExpiredElections = localStorage.getItem('expiredElections');
                            if (savedExpiredElections) {
                                expiredElectionIds = JSON.parse(savedExpiredElections);
                                console.log('Loaded expired elections from localStorage:', expiredElectionIds);
                            }
                        } catch (err) {
                            console.error('Error loading expired elections from localStorage:', err);
                        }
                        
                        // Process the elections to check if any have ended based on time
                        const processedElections = blockchainResponse.data.elections.map(election => {
                            const hasEnded = hasElectionEnded(election.startTime, election.duration, election.active);
                            const isInExpiredList = expiredElectionIds.includes(election.id);
                            
                            // If the election has ended by time or is in our expired list, 
                            // but is still marked active in the blockchain, we'll mark it as 
                            // hasEnded and inactive locally
                            return {
                                ...election,
                                active: election.active && !hasEnded && !isInExpiredList,
                                hasEnded: hasEnded || isInExpiredList
                            };
                        });
                        
                        setCurrentElections(processedElections);
                        return; // Exit early if successful
                    } else {
                        console.warn('Failed to load elections from blockchain, will try API fallback', blockchainResponse);
                    }
                } catch (blockchainError) {
                    console.error('Error accessing blockchain:', blockchainError);
                }
                
                // If blockchain service fails, try regular API
                console.log("Attempting to fetch elections from backend API...");
                const apiResponse = await getAdminElections();
                console.log("Response from API getAdminElections:", apiResponse);
                
                if (apiResponse.success) {
                    console.log("API response successful:", apiResponse);
                    // Process the elections to check if any have ended based on time
                    const processedElections = (apiResponse.elections || []).map(election => {
                        const hasEnded = hasElectionEnded(election.startTime, election.duration, election.active);
                        return {
                            ...election,
                            hasEnded: hasEnded
                        };
                    });
                    
                    setCurrentElections(processedElections);
                    
                    // If there's a message but no elections, show as a warning not an error
                    if (apiResponse.message && (!apiResponse.elections || apiResponse.elections.length === 0)) {
                        setWarning(apiResponse.message);
                    }
                } else {
                    console.error('Failed to load elections from both blockchain and API');
                    setError(`Failed to load elections: ${apiResponse?.message || 'Connection error'}`);
                    // Initialize with empty array rather than leaving as null/undefined
                    setCurrentElections([]);
                }
            } catch (err) {
                console.error('Error fetching elections:', err);
                setError(`Failed to load elections: ${err.message}`);
                // Initialize with empty array rather than leaving as null/undefined
                setCurrentElections([]);
            } finally {
                setLoadingElections(false);
            }
        };

        fetchElections();
        
        // Set up a timer to check for any elections that might have ended
        const checkExpiredElectionsTimer = setInterval(() => {
            setCurrentElections(prevElections => {
                // Check if any elections have ended since we last checked
                let hasChanges = false;
                const updatedElections = prevElections.map(election => {
                    const hasEnded = hasElectionEnded(election.startTime, election.duration, election.active);
                    // If the election has newly ended, update its status
                    if (hasEnded && election.active && !election.hasEnded) {
                        hasChanges = true;
                        console.log(`Election ${election.id} has ended based on time check. Updating local state.`);
                        
                        // Save to localStorage
                        try {
                            const savedExpiredElections = localStorage.getItem('expiredElections');
                            let expiredElectionIds = savedExpiredElections ? JSON.parse(savedExpiredElections) : [];
                            if (!expiredElectionIds.includes(election.id)) {
                                expiredElectionIds.push(election.id);
                                localStorage.setItem('expiredElections', JSON.stringify(expiredElectionIds));
                            }
                        } catch (err) {
                            console.error('Error saving expired election to localStorage:', err);
                        }
                        
                        return { 
                            ...election, 
                            active: false,
                            hasEnded: true 
                        };
                    }
                    return election;
                });
                
                return hasChanges ? updatedElections : prevElections;
            });
        }, 30000); // Check every 30 seconds
        
        // Clean up the timer when component unmounts
        return () => {
            clearInterval(checkExpiredElectionsTimer);
        };
    }, []);

    // Fetch election results when activeSection is 'results'
    useEffect(() => {
        if (activeSection === 'results') {
            fetchElectionResults();
        }
    }, [activeSection]);

    // Helper function to process blockchain responses consistently
    const processBlockchainResponse = (response, successCallback, errorCallback) => {
        console.log("Processing blockchain response:", response);
        
        // If response is undefined or null
        if (!response) {
            errorCallback("Received empty response from blockchain service");
            return;
        }
        
        // If response indicates an error
        if (!response.status && response.error) {
            // Check for specific error codes
            if (response.code === 'DUPLICATE_ELECTION_ID') {
                errorCallback(`${response.error}. Please use a different election ID.`);
            } else {
                errorCallback(response.error);
            }
            return;
        }
        
        // If we got a non-JSON response
        if (response.rawResponse) {
            console.warn("Received non-JSON response from blockchain:", response.rawResponse);
            
            // Try to determine if it looks like a success response
            if (response.rawResponse.includes("success") || 
                response.rawResponse.includes("created") ||
                response.rawResponse.includes("OK")) {
                
                successCallback("Operation appears to be successful (non-standard response)");
            } else {
                // Extract first 100 chars for error message to avoid overlong errors
                const errorText = response.rawResponse.substring(0, 100) + 
                                (response.rawResponse.length > 100 ? "..." : "");
                errorCallback("Non-standard response: " + errorText);
            }
            return;
        }
        
        // If we got a proper success response
        if (response.status) {
            successCallback("Operation completed successfully");
            return;
        }
        
        // Fallback for any other unexpected response format
        errorCallback("Unexpected response format from blockchain service");
    };

    useEffect(() => {
        // Handle section changes based on URL
        const path = location.pathname;
        if (path.includes('election-results')) {
            setActiveSection('results');
        } else if (path.includes('vote-history')) {
            setActiveSection('history');
        }
    }, [location]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setElectionData(prev => ({
            ...prev,
            [name]: name === 'durationMinutes' ? parseInt(value) || '' : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!electionData.id || !electionData.name || !electionData.durationMinutes) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        // Check if wallet is connected
        if (!isConnected) {
            setError('Please connect your blockchain wallet first');
            setLoading(false);
            return;
        }

        try {
            // Convert minutes to seconds for blockchain
            const durationSeconds = electionData.durationMinutes * 60;
            
            // Ensure ipfsHash is always a valid string
            // If empty, use a default value that your backend expects
            const ipfsHash = electionData.ipfsHash && electionData.ipfsHash.trim() ? 
                            electionData.ipfsHash.trim() : 
                            'QmDefaultElectionDataHash';
            
            console.log("Account being used for transaction:", account);
            
            // Make sure account is properly formatted
            if (!account || !account.startsWith('0x')) {
                throw new Error('Invalid wallet address. Please ensure your wallet is properly connected.');
            }
            
            console.log("Creating election in blockchain with params:", {
                id: electionData.id,
                name: electionData.name,
                duration: durationSeconds,
                ipfsHash,
                from: account
            });
            
            // Only call blockchain service directly
            const blockchainResponse = await createBlockchainElection(
                electionData.id,
                electionData.name,
                durationSeconds,
                ipfsHash,
                account
            );
            
            // Check for blockchain errors
            if (!blockchainResponse.status) {
                // If there was a blockchain error, show it and stop
                setError(blockchainResponse.error || 'Failed to create election in blockchain');
                setLoading(false);
                return;
            }
            
            // Create succeeded
            setSuccess('Election created successfully in blockchain!');
            // Reset form
            setElectionData({
                id: '',
                name: '',
                durationMinutes: 60,
                ipfsHash: '',
                candidates: []
            });
        } catch (err) {
            // Handle any exceptions during the process
            console.error('Election creation error:', err);
            setError(`Failed to create election: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCandidatesChange = (e) => {
        const { name, value } = e.target;
        setCandidatesFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const addCandidate = () => {
        if (!candidatesFormData.candidate.trim()) {
            return; // Don't add empty candidates
        }
        
        setCandidatesFormData(prev => ({
            ...prev,
            addedCandidates: [...prev.addedCandidates, prev.candidate],
            candidate: '' // Clear the input field
        }));
    };

    const removeCandidate = (index) => {
        setCandidatesFormData(prev => ({
            ...prev,
            addedCandidates: prev.addedCandidates.filter((_, i) => i !== index)
        }));
    };

    const handleCandidatesSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (candidatesFormData.addedCandidates.length === 0) {
            setError('Please add at least one candidate');
            setLoading(false);
            return;
        }

        // Check if wallet is connected
        if (!isConnected) {
            setError('Please connect your blockchain wallet first');
            setLoading(false);
            return;
        }

        try {
            // Process each candidate one by one
            const results = [];
            let hasErrors = false;

            for (const candidate of candidatesFormData.addedCandidates) {
                try {
                    console.log(`Adding candidate "${candidate}" to election ${candidatesFormData.electionId}`);
                    
                    const result = await addBlockchainCandidate(
                        candidatesFormData.electionId, 
                        candidate,
                        account
                    );
                    
                    // Use our helper to process the response
                    let candidateSuccess = false;
                    
                    processBlockchainResponse(
                        result,
                        // Success callback
                        (message) => {
                            candidateSuccess = true;
                            results.push({
                                candidate,
                                success: true,
                                message
                            });
                        },
                        // Error callback
                        (errorMsg) => {
                            hasErrors = true;
                            results.push({
                                candidate,
                                success: false,
                                error: errorMsg
                            });
                        }
                    );
                } catch (err) {
                    console.error(`Error adding candidate "${candidate}":`, err);
                    results.push({
                        candidate,
                        success: false,
                        error: err.message
                    });
                    hasErrors = true;
                }
            }

            // Generate success/error message based on results
            if (hasErrors) {
                const failedCandidates = results
                    .filter(r => !r.success)
                    .map(r => `${r.candidate} (${r.error})`)
                    .join(', ');
                    
                setError(`Some candidates failed to be added: ${failedCandidates}`);
                
                // If at least one succeeded, it's a partial success
                if (results.some(r => r.success)) {
                    setSuccess(`Successfully added ${results.filter(r => r.success).length} out of ${results.length} candidates`);
                }
            } else {
                setSuccess('All candidates successfully added to the blockchain!');
                // Reset form after successful submission
                setCandidatesFormData({
                    electionId: '',
                    candidate: '',
                    addedCandidates: []
                });
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Add candidates error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSidebarClick = (section) => {
        setActiveSection(section);
        setShowCreateForm(false);
        setShowManageCountries(false);
        setShowCandidatesForm(false);
        setShowActivateElection(false);
        setShowEndElection(false);
        setShowResultVisibility(false);
        setShowSurveyManagement(false);
        setShowDecisionManagement(false);
        resetAlerts();

        // Special handling for certain sections
        if (section === 'create') {
            setShowCreateForm(true);
        } else if (section === 'countries') {
            setShowManageCountries(true);
        } else if (section === 'candidates') {
            setShowCandidatesForm(true);
        } else if (section === 'activate') {
            setShowActivateElection(true);
        } else if (section === 'end') {
            setShowEndElection(true);
        } else if (section === 'visibility') {
            setShowResultVisibility(true);
        } else if (section === 'surveys') {
            setShowSurveyManagement(true);
        } else if (section === 'decisions') {
            setShowDecisionManagement(true);
        }
    };

    // Helper function to format timestamp to date
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(Number(timestamp) * 1000);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Helper function to calculate end date from start time and duration
    const calculateEndDate = (startTime, durationSeconds) => {
        if (!startTime || !durationSeconds) return 'N/A';
        const endTime = Number(startTime) + Number(durationSeconds);
        return formatDate(endTime);
    };

    // Update the hasElectionEnded function to check if current time exceeds end time
    const hasElectionEnded = (startTime, durationSeconds, isActive) => {
        if (!isActive) return true; // If election is marked inactive, consider it ended
        
        if (!startTime || !durationSeconds) return false;
        
        const endTime = parseInt(startTime) + parseInt(durationSeconds);
        const currentTime = Math.floor(Date.now() / 1000);
        return currentTime >= endTime;
    };

    // Add a function to update blockchain when countdown completes
    const updateBlockchainElectionStatus = async (electionId) => {
        if (!isConnected || !account) {
            setWarning('Wallet not connected. Cannot update blockchain status.');
            return false;
        }

        setLoading(true);
        try {
            console.log(`Attempting to end election ${electionId} on blockchain...`);
            
            const response = await endBlockchainElection(electionId, account);
            
            if (response.status) {
                console.log(`Successfully ended election ${electionId} on blockchain`);
                setSuccess(`Election ${electionId} has been ended on the blockchain.`);
                return true;
            } else {
                console.error(`Failed to end election ${electionId} on blockchain:`, response.error);
                setError(`Failed to end election on blockchain: ${response.error || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            console.error(`Error ending election ${electionId} on blockchain:`, error);
            setError(`Error ending election: ${error.message || 'Unknown error'}`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Update the handleCountdownComplete function to call our new function
    const handleCountdownComplete = async (electionId) => {
        console.log(`Countdown completed for election ${electionId}`);
        
        // Always update local state to mark election as inactive
        setCurrentElections(prevElections => {
            const updatedElections = prevElections.map(election => 
                election.id === electionId 
                    ? { ...election, active: false, status: 'Inactive', hasEnded: true } 
                    : election
            );
            console.log(`Updated elections after countdown complete:`, updatedElections);
            
            // Save this updated state to localStorage for persistence
            try {
                localStorage.setItem('expiredElections', JSON.stringify(
                    updatedElections
                        .filter(e => !e.active || e.hasEnded)
                        .map(e => e.id)
                ));
            } catch (err) {
                console.error('Error saving expired elections to localStorage:', err);
            }
            
            return updatedElections;
        });
        
        // Force a refresh of the component to ensure UI updates
        setTimeout(() => {
            // This state update forces a re-render, ensuring the UI reflects the change
            setCurrentElections(current => [...current]);
        }, 500);
        
        // Also attempt to update the blockchain status if connected
        if (isConnected && account) {
            // Try to update the blockchain status
            try {
                const success = await updateBlockchainElectionStatus(electionId);
                
                if (success) {
                    setSuccess(`Election ${electionId} has ended. Status updated on blockchain.`);
                } else {
                    setWarning(`Election ${electionId} has ended locally, but blockchain update failed. You may need to end it manually.`);
                }
            } catch (error) {
                console.error(`Error updating blockchain for election ${electionId}:`, error);
                setWarning(`Election ${electionId} has ended, but blockchain update encountered an error. Please try ending it manually.`);
            }
        } else {
            console.log(`Election ${electionId} countdown completed, marked as inactive locally only.`);
            setWarning(`Election ${electionId} has ended and is marked inactive in the UI. Connect your wallet to update the blockchain status.`);
        }
    };

    // Function to fetch election results
    const fetchElectionResults = async () => {
        try {
            setLoadingResults(true);
            
            // First get all elections
            const electionsResponse = await getAllElections();
            
            if (!electionsResponse.status || !electionsResponse.elections) {
                console.error('Failed to load elections for results');
                setLoadingResults(false);
                return;
            }
            
            const resultsData = [];
            
            // For each election, try to get its results
            for (const election of electionsResponse.elections) {
                try {
                    // Check if results are visible
                    const visibilityResponse = await getResultsVisibility(election.id);
                    const isVisible = visibilityResponse.visible || false;
                    
                    // If results are not visible, add basic info with null result data
                    if (!isVisible) {
                        resultsData.push({
                            id: election.id,
                            name: election.name,
                            startTime: election.startTime,
                            duration: election.duration,
                            winner: null,
                            totalVotes: 0,
                            visible: false
                        });
                        continue;
                    }
                    
                    // Get results data
                    const winnerResponse = await getWinner(election.id).catch(() => ({ winner: "No winner" }));
                    const totalVotesResponse = await getTotalVotes(election.id).catch(() => ({ totalVotes: "0" }));
                    
                    resultsData.push({
                        id: election.id,
                        name: election.name,
                        startTime: election.startTime,
                        duration: election.duration,
                        winner: winnerResponse.winner || "Not available",
                        totalVotes: totalVotesResponse.totalVotes || "0",
                        visible: true
                    });
                } catch (err) {
                    console.error(`Error fetching results for election ${election.id}:`, err);
                    // Add election with error state
                    resultsData.push({
                        id: election.id,
                        name: election.name,
                        startTime: election.startTime,
                        duration: election.duration,
                        winner: "Error",
                        totalVotes: "Error",
                        visible: false,
                        error: true
                    });
                }
            }
            
            setElectionResults(resultsData);
        } catch (err) {
            console.error('Error fetching election results:', err);
        } finally {
            setLoadingResults(false);
        }
    };

    // Reset alert states when component changes
    const resetAlerts = () => {
        setError('');
        setSuccess('');
        setWarning('');
    };

    // Add a refreshElections function to fetch updated data from blockchain
    const refreshElections = async () => {
        setLoadingElections(true);
        setError('');
        
        try {
            console.log("Refreshing elections data from blockchain...");
            
            // Try blockchain service first
            const blockchainResponse = await getAllElections();
            console.log("Response from blockchain getAllElections:", blockchainResponse);
            
            if (blockchainResponse.status && blockchainResponse.data && blockchainResponse.data.elections) {
                console.log("Successfully refreshed elections from blockchain:", blockchainResponse.data.elections);
                
                // Process the elections to check if any have ended based on time
                const processedElections = blockchainResponse.data.elections.map(election => {
                    const hasEnded = hasElectionEnded(election.startTime, election.duration, election.active);
                    return {
                        ...election,
                        hasEnded: hasEnded
                    };
                });
                
                setCurrentElections(processedElections);
                setSuccess("Elections data refreshed successfully.");
            } else {
                console.warn('Failed to refresh elections from blockchain', blockchainResponse);
                setWarning('Could not refresh elections data from blockchain. Please try again later.');
            }
        } catch (err) {
            console.error('Error refreshing elections:', err);
            setError(`Failed to refresh elections: ${err.message}`);
        } finally {
            setLoadingElections(false);
        }
    };

    // Add functions to handle activating and ending elections from the table
    const activateElectionFromTable = async (electionId) => {
        if (!isConnected || !account) {
            setWarning('Please connect your wallet to activate an election.');
            return;
        }
        
        setLoading(true);
        try {
            console.log(`Attempting to activate election ${electionId}...`);
            
            // Call the blockchain service to activate the election
            const response = await activateElection(electionId, account);
            
            if (response.status) {
                // Update the local state to reflect the change
                setCurrentElections(prevElections => 
                    prevElections.map(election => 
                        election.id === electionId 
                            ? { ...election, active: true } 
                            : election
                    )
                );
                
                setSuccess(`Election ${electionId} has been activated successfully.`);
                // Refresh elections data to ensure UI is in sync with blockchain
                await refreshElections();
            } else {
                setError(`Failed to activate election: ${response.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(`Error activating election ${electionId}:`, error);
            setError(`Error activating election: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const endElectionFromTable = async (electionId) => {
        if (!isConnected || !account) {
            setWarning('Please connect your wallet to end an election.');
            return;
        }
        
        setLoading(true);
        try {
            console.log(`Attempting to end election ${electionId}...`);
            
            // Use the existing function to update blockchain
            const success = await updateBlockchainElectionStatus(electionId);
            
            if (success) {
                // Update already handled in updateBlockchainElectionStatus
                setSuccess(`Election ${electionId} has been ended successfully.`);
                // Refresh elections data to ensure UI is in sync with blockchain
                await refreshElections();
            }
            // Error handling already in updateBlockchainElectionStatus
        } catch (error) {
            console.error(`Error ending election ${electionId}:`, error);
            setError(`Error ending election: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        switch(activeSection) {
            case 'results':
                return (
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-700">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Election Results</h2>
                        
                        {loadingResults ? (
                            <div className="flex justify-center items-center p-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-blue-50">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Election ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Election</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Winner</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Total Votes</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-blue-100">
                                        {electionResults.length > 0 ? (
                                            electionResults.map(result => (
                                                <tr key={result.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">{result.id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{result.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                                                        {result.visible ? result.winner : (
                                                            <span className="text-yellow-600 italic">Results hidden</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                                                        {result.visible ? result.totalVotes : "-"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                                                        {formatDate(result.startTime)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            result.visible 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {result.visible ? 'Visible' : 'Hidden'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                                    No election results found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        <div className="mt-4 flex justify-end">
                            <button 
                                onClick={fetchElectionResults}
                                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh Results
                            </button>
                        </div>
                    </div>
                );
            default:
                return (
                    <>
                        {/* Existing dashboard content */}
                        {showCreateForm && (
                            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-700">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Election</h2>
                                
                                {/* Wallet Connection Section */}
                                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-700 mb-2">Blockchain Connection</h4>
                                            <p className="text-sm text-gray-600 mb-1">
                                                Connect your blockchain wallet to create an election
                                            </p>
                                            <p className="text-xs text-yellow-600">
                                              
                                            </p>
                                        </div>
                                        <WalletConnect />
                                    </div>
                                </div>
                                
                                {error && (
                                    <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
                                        <p className="text-sm">{error}</p>
                                    </div>
                                )}
                                {warning && (
                                    <div className="p-4 mb-4 bg-yellow-100 text-yellow-700 rounded-lg border border-yellow-200">
                                        <p className="text-sm">{warning}</p>
                                    </div>
                                )}
                                {success && (
                                    <div className="p-4 mb-4 bg-green-100 text-green-700 rounded-lg border border-green-200">
                                        <p className="text-sm">{success}</p>
                                    </div>
                                )}
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="id" className="block text-sm font-medium text-gray-700">Election ID*</label>
                                            <input
                                                type="text"
                                                name="id"
                                                id="id"
                                                className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                                placeholder="E.g. E001"
                                                value={electionData.id}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Election Name*</label>
                                            <input
                                                type="text"
                                                name="name"
                                                id="name"
                                                className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                                placeholder="E.g. Presidential Election 2025"
                                                value={electionData.name}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700">Duration (minutes)*</label>
                                            <div className="relative mt-1">
                                                <input
                                                    type="number"
                                                    name="durationMinutes"
                                                    id="durationMinutes"
                                                    min="1"
                                                    className="block w-full rounded-md border border-blue-200 bg-white pl-10 pr-12 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="Duration in minutes"
                                                    value={electionData.durationMinutes}
                                                    onChange={handleChange}
                                                    required
                                                />
                                                <div className="absolute inset-y-0 right-0 flex">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange({ target: { name: 'durationMinutes', value: electionData.durationMinutes + 1 } })}
                                                        className="px-2 h-1/2 bg-blue-50 hover:bg-blue-100 border-l border-t border-blue-200 rounded-tr-md flex items-center justify-center"
                                                    >
                                                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange({ target: { name: 'durationMinutes', value: Math.max(1, electionData.durationMinutes - 1) } })}
                                                        className="px-2 h-1/2 bg-blue-50 hover:bg-blue-100 border-l border-b border-blue-200 rounded-br-md flex items-center justify-center"
                                                    >
                                                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="ipfsHash" className="block text-sm font-medium text-gray-700">IPFS Hash (CID)</label>
                                            <input
                                                type="text"
                                                name="ipfsHash"
                                                id="ipfsHash"
                                                className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                                placeholder="E.g. QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX"
                                                value={electionData.ipfsHash}
                                                onChange={handleChange}
                                            />
                                            <p className="mt-1 text-xs text-gray-500"></p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateForm(false)}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading || !isConnected}
                                            className={`px-4 py-2 ${loading || !isConnected ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 shadow-md`}
                                        >
                                            {loading ? (
                                                <>
                                                    <svg className="animate-spin inline-block h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Creating...
                                                </>
                                            ) : 'Create Election'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                        {showManageCountries && (
                            <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border-l-4 border-blue-700">
                                <h2 className="text-lg font-bold text-gray-800 mb-4">Manage Countries</h2>
                                <ManageCountries />
                            </div>
                        )}
                        {showCandidatesForm && (
                            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-purple-700">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Candidates</h2>
                                
                                {/* Wallet Connection Section */}
                                <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-700 mb-2">Blockchain Connection</h4>
                                            <p className="text-sm text-gray-600 mb-1">
                                                Connect your blockchain wallet to add candidates
                                            </p>
                                            <p className="text-xs text-yellow-600">
                                                
                                            </p>
                                        </div>
                                        <WalletConnect />
                                    </div>
                                </div>
                                
                                {error && (
                                    <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
                                        <p className="text-sm">{error}</p>
                                    </div>
                                )}
                                {warning && (
                                    <div className="p-4 mb-4 bg-yellow-100 text-yellow-700 rounded-lg border border-yellow-200">
                                        <p className="text-sm">{warning}</p>
                                    </div>
                                )}
                                {success && (
                                    <div className="p-4 mb-4 bg-green-100 text-green-700 rounded-lg border border-green-200">
                                        <p className="text-sm">{success}</p>
                                    </div>
                                )}
                                <form onSubmit={handleCandidatesSubmit} className="space-y-6">
                                    <div>
                                        <label htmlFor="electionId" className="block text-sm font-medium text-gray-700">Election ID</label>
                                        <input
                                            type="text"
                                            name="electionId"
                                            id="electionId"
                                            className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                            placeholder="Enter existing election ID"
                                            value={candidatesFormData.electionId}
                                            onChange={handleCandidatesChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="border-t border-b border-gray-200 py-4">
                                        <div className="flex items-end space-x-3">
                                            <div className="flex-grow">
                                                <label htmlFor="candidate" className="block text-sm font-medium text-gray-700">Candidate Name</label>
                                                <input
                                                    type="text"
                                                    name="candidate"
                                                    id="candidate"
                                                    className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                                    placeholder="Enter candidate name"
                                                    value={candidatesFormData.candidate}
                                                    onChange={handleCandidatesChange}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addCandidate}
                                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 shadow-md"
                                            >
                                                <span className="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg>
                                                    Add
                                                </span>
                                            </button>
                                        </div>
                                        
                                        {/* List of added candidates */}
                                        {candidatesFormData.addedCandidates.length > 0 && (
                                            <div className="mt-4">
                                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Added Candidates:</h3>
                                                <ul className="bg-gray-50 rounded-lg p-2 max-h-60 overflow-y-auto">
                                                    {candidatesFormData.addedCandidates.map((candidate, index) => (
                                                        <li 
                                                            key={index} 
                                                            className="flex justify-between items-center px-3 py-2 bg-white rounded-md shadow-sm mb-2 hover:bg-blue-50 transition-colors"
                                                        >
                                                            <span>{candidate}</span>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => removeCandidate(index)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="mt-2 text-xs text-gray-500">Total: {candidatesFormData.addedCandidates.length} candidates</div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCandidatesForm(false)}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading || !isConnected || candidatesFormData.addedCandidates.length === 0}
                                            className={`px-4 py-2 ${loading || !isConnected || candidatesFormData.addedCandidates.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 shadow-md`}
                                        >
                                            {loading ? (
                                                <>
                                                    <svg className="animate-spin inline-block h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : 'Save All Candidates'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                        {!showCreateForm && !showManageCountries && !showCandidatesForm && !showActivateElection && !showEndElection && (
                            <>
                                {/* Status Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1 font-medium">Active Elections</p>
                                                <h3 className="text-2xl font-bold text-gray-800">3</h3>
                                            </div>
                                            <div className="bg-green-100 p-3 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none"
                                                    viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-cyan-500 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1 font-medium">Total Voters</p>
                                                <h3 className="text-2xl font-bold text-gray-800">1,247</h3>
                                            </div>
                                            <div className="bg-cyan-100 p-3 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-600" fill="none"
                                                    viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1 font-medium">Total Votes Cast</p>
                                                <h3 className="text-2xl font-bold text-gray-800">893</h3>
                                            </div>
                                            <div className="bg-blue-100 p-3 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none"
                                                    viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Active Elections Table */}
                        {!showActivateElection && !showEndElection && !showCandidatesForm && !showResultVisibility && !showManageCountries && !showCreateForm && (
                          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-700">
                              <div className="flex justify-between items-center mb-6">
                                  <h2 className="text-lg font-bold text-gray-800">Current Elections</h2>
                                  <button
                                      onClick={refreshElections}
                                      disabled={loadingElections}
                                      className={`px-4 py-2 ${loadingElections ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-100 hover:bg-blue-200'} text-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300`}
                                  >
                                      {loadingElections ? (
                                          <span className="flex items-center">
                                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                              Refreshing...
                                          </span>
                                      ) : (
                                          <span className="flex items-center">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                              </svg>
                                              Refresh
                                          </span>
                                      )}
                                  </button>
                              </div>
                              {loadingElections ? (
                                <div className="flex justify-center items-center p-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full">
                                      <thead>
                                          <tr className="bg-blue-50">
                                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Election ID</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Election Name</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Status</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Lifecycle</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Countdown</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Start Date</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">End Date</th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Actions</th>
                                          </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-blue-100">
                                          {currentElections.length > 0 ? (
                                            currentElections.map((election) => {
                                              const isEnded = hasElectionEnded(election.startTime, election.duration, election.active);
                                              const endTime = Number(election.startTime) + Number(election.duration);
                                              
                                              return (
                                                <tr key={election.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">{election.id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{election.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            election.active && !isEnded
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {election.active && !isEnded ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            isEnded || election.hasEnded
                                                                ? 'bg-red-100 text-red-800' 
                                                                : election.active ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {isEnded || election.hasEnded ? 'Ended' : election.active ? 'Ongoing' : 'Not Started'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {!isEnded && election.active ? (
                                                            <CountdownTimer 
                                                                endTime={endTime} 
                                                                compact={true} 
                                                                onComplete={() => handleCountdownComplete(election.id)}
                                                            />
                                                        ) : (
                                                            <span className="text-sm text-gray-500">
                                                                {isEnded ? 'Finished' : 'Not Active'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                                                        {formatDate(election.startTime)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                                                        {calculateEndDate(election.startTime, election.duration)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex space-x-2">
                                                            {!election.active && !isEnded && (
                                                                <button
                                                                    onClick={() => activateElectionFromTable(election.id)}
                                                                    disabled={loading || !isConnected}
                                                                    className={`px-3 py-1 rounded-md text-xs font-medium ${loading || !isConnected ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                                                                    title={isConnected ? "Activate this election" : "Connect wallet to activate"}
                                                                >
                                                                    Activate
                                                                </button>
                                                            )}
                                                            {election.active && !isEnded && (
                                                                <button
                                                                    onClick={() => endElectionFromTable(election.id)}
                                                                    disabled={loading || !isConnected}
                                                                    className={`px-3 py-1 rounded-md text-xs font-medium ${loading || !isConnected ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                                                    title={isConnected ? "End this election" : "Connect wallet to end"}
                                                                >
                                                                    End
                                                                </button>
                                                            )}
                                                            {isEnded && (
                                                                <span className="px-3 py-1 text-xs text-gray-500">
                                                                    No actions available
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                              );
                                            })
                                          ) : (
                                            <tr>
                                              <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                                No elections found
                                              </td>
                                            </tr>
                                          )}
                                      </tbody>
                                  </table>
                                </div>
                              )}
                          </div>
                        )}

                        {/* Activate Election Component */}
                        {showActivateElection && (
                            <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border-l-4 border-green-700">
                                <h2 className="text-lg font-bold text-gray-800 mb-4">Activate Election</h2>
                                <ActivateElection refreshElections={refreshElections} />
                            </div>
                        )}

                        {/* End Election Component */}
                        {showEndElection && (
                            <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border-l-4 border-red-700">
                                <h2 className="text-lg font-bold text-gray-800 mb-4">End Election</h2>
                                <EndElection />
                            </div>
                        )}

                        {/* Result Visibility Component */}
                        {showResultVisibility && (
                            <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border-l-4 border-blue-700">
                                <ManageResultVisibility />
                            </div>
                        )}
                    </>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 min-w-screen">
            <Header/>
            <div className="flex flex-grow">
                {/* Sidebar */}
                <div className="w-64 bg-gradient-to-b from-blue-900 to-indigo-900 shadow-xl hidden md:block min-h-screen">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-white mb-6 pl-4 border-l-4 border-cyan-400">Admin Portal</h2>
                        <nav className="space-y-2">
                            <Link to="#" 
                                onClick={() => handleSidebarClick('dashboard')} 
                                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${activeSection === 'dashboard' ? 'bg-white text-blue-900 shadow-md' : 'text-white hover:bg-blue-800 hover:bg-opacity-30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span className="font-medium">Dashboard</span>
                            </Link>

                            <Link to="#" onClick={() => handleSidebarClick('create')} 
                                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${showCreateForm ? 'bg-white text-blue-900 shadow-md' : 'text-white hover:bg-blue-800 hover:bg-opacity-30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="font-medium">Create Election</span>
                            </Link>

                            <Link to="#" onClick={() => handleSidebarClick('candidates')} 
                                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${showCandidatesForm ? 'bg-white text-blue-900 shadow-md' : 'text-white hover:bg-blue-800 hover:bg-opacity-30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="font-medium">Add Candidates</span>
                            </Link>

                            <Link to="#" onClick={() => handleSidebarClick('activate')} 
                                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${showActivateElection ? 'bg-white text-blue-900 shadow-md' : 'text-white hover:bg-blue-800 hover:bg-opacity-30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="font-medium">Activate Election</span>
                            </Link>

                            <Link to="#" onClick={() => handleSidebarClick('end')} 
                                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${showEndElection ? 'bg-white text-blue-900 shadow-md' : 'text-white hover:bg-blue-800 hover:bg-opacity-30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="font-medium">End Election</span>
                            </Link>

                            <Link to="#" onClick={() => handleSidebarClick('countries')} 
                                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${showManageCountries ? 'bg-white text-blue-900 shadow-md' : 'text-white hover:bg-blue-800 hover:bg-opacity-30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">Manage Countries</span>
                            </Link>

                            <Link to="#" onClick={() => handleSidebarClick('visibility')} 
                                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${showResultVisibility ? 'bg-white text-blue-900 shadow-md' : 'text-white hover:bg-blue-800 hover:bg-opacity-30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="font-medium">Results Visibility</span>
                            </Link>

                            <Link to="#" 
                                onClick={() => handleSidebarClick('results')} 
                                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${activeSection === 'results' ? 'bg-white text-blue-900 shadow-md' : 'text-white hover:bg-blue-800 hover:bg-opacity-30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span className="font-medium">Election Results</span>
                            </Link>

                            <Link to="#" onClick={() => handleSidebarClick('surveys')} 
                                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${showSurveyManagement ? 'bg-white text-blue-900 shadow-md' : 'text-white hover:bg-blue-800 hover:bg-opacity-30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span className="font-medium">Manage Surveys</span>
                            </Link>
                            
                            <Link to="#" onClick={() => handleSidebarClick('decisions')} 
                                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${showDecisionManagement ? 'bg-white text-blue-900 shadow-md' : 'text-white hover:bg-blue-800 hover:bg-opacity-30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <span className="font-medium">Manage Decisions</span>
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-4 overflow-y-auto">
                    <div className="container mx-auto">
                        {/* Progress bar with gradient */}
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                        
                        {/* Header section */}
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold text-gray-800 border-l-4 border-cyan-400 pl-3">
                                {activeSection === 'dashboard' && 'Admin Dashboard'}
                                {activeSection === 'results' && 'Election Results'}
                                {activeSection === 'history' && 'Vote History'}
                                {showCreateForm && 'Create Election'}
                                {showManageCountries && 'Manage Countries'}
                                {showCandidatesForm && 'Add Candidates'}
                                {showActivateElection && 'Activate Election'}
                                {showEndElection && 'End Election'}
                                {showResultVisibility && 'Manage Results Visibility'}
                                {showSurveyManagement && 'Manage Surveys'}
                                {showDecisionManagement && 'Manage Decisions'}
                            </h1>
                            <div className="flex space-x-3">
                                <div className="relative">
                                    <input type="text" placeholder="Search elections..."
                                        className="pl-8 pr-4 py-1 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm text-gray-700 text-sm" />
                                    <svg xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 text-blue-500 absolute left-2 top-2" fill="none" viewBox="0 0 24 24"
                                        stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic content based on active section */}
                        {showSurveyManagement ? (
                            <SurveyManagement />
                        ) : showDecisionManagement ? (
                            <DecisionManagement />
                        ) : (
                            renderContent()
                        )}
                    </div>
                </div>
            </div>
            <Footer logoLeftPosition={30}/>
        </div>
    );
}

export default AdminDashboard;