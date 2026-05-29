import React, { useState, useEffect } from 'react';
import { useBlockchain } from '../../utils/BlockchainContext';
import { 
    createDecision, 
    getAllDecisions, 
    getDecisionDetails,
    getDecisionResults,
    finalizeDecision
} from '../../utils/decisionBlockchainService';
import CountdownTimer from '../../components/SharedComponents/CountdownTimer';

const DecisionManagement = () => {
    const [decisionData, setDecisionData] = useState({
        id: '',
        name: '',
        description: '',
        durationMinutes: 1440, // Default to 24 hours
        options: ['', ''], // Start with 2 empty options
        whitelist: [''], // Start with 1 empty address
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [decisions, setDecisions] = useState([]);
    const [loadingDecisions, setLoadingDecisions] = useState(false);
    const { account } = useBlockchain();
    const [selectedDecision, setSelectedDecision] = useState(null);
    const [decisionResults, setDecisionResults] = useState(null);
    const [loadingResults, setLoadingResults] = useState(false);
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'create'

    useEffect(() => {
        // Clear error when account changes
        setError('');
        if (account) {
            loadDecisions();
        }
    }, [account]);

    const loadDecisions = async () => {
        try {
            setLoadingDecisions(true);
            const result = await getAllDecisions();
            console.log("Decisions API response:", result);
            
            // Our service now always returns data as an array
            setDecisions(result.data || []);
        } catch (err) {
            console.error('Error loading decisions:', err);
            setDecisions([]);
        } finally {
            setLoadingDecisions(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Convert numeric inputs to numbers
        if (name === 'durationMinutes') {
            // Ensure value is a positive number or empty string
            const numValue = value === '' ? '' : Math.max(1, parseInt(value) || 1);
            setDecisionData({
                ...decisionData,
                [name]: numValue
            });
        } else {
            setDecisionData({
                ...decisionData,
                [name]: value
            });
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...decisionData.options];
        newOptions[index] = value;
        setDecisionData({
            ...decisionData,
            options: newOptions
        });
    };

    const addOption = () => {
        setDecisionData({
            ...decisionData,
            options: [...decisionData.options, '']
        });
    };

    const removeOption = (index) => {
        if (decisionData.options.length <= 2) {
            setError('At least 2 options are required');
            return;
        }
        
        const newOptions = decisionData.options.filter((_, i) => i !== index);
        setDecisionData({
            ...decisionData,
            options: newOptions
        });
    };

    const handleWhitelistChange = (index, value) => {
        const newWhitelist = [...decisionData.whitelist];
        newWhitelist[index] = value;
        setDecisionData({
            ...decisionData,
            whitelist: newWhitelist
        });
    };

    const addWhitelistAddress = () => {
        setDecisionData({
            ...decisionData,
            whitelist: [...decisionData.whitelist, '']
        });
    };

    const removeWhitelistAddress = (index) => {
        if (decisionData.whitelist.length <= 1) {
            setError('At least 1 address is required in the whitelist');
            return;
        }
        
        const newWhitelist = decisionData.whitelist.filter((_, i) => i !== index);
        setDecisionData({
            ...decisionData,
            whitelist: newWhitelist
        });
    };

    const validateForm = () => {
        // Check for empty required fields
        if (!decisionData.id || !decisionData.name || !decisionData.description || !decisionData.durationMinutes) {
            setError('Please fill in all required fields');
            return false;
        }
        
        // Validate ID is a number
        if (isNaN(decisionData.id)) {
            setError('Decision ID must be a number');
            return false;
        }
        
        // Validate duration is a positive number
        if (decisionData.durationMinutes <= 0) {
            setError('Duration must be a positive number');
            return false;
        }
        
        // Check for empty options
        const emptyOptions = decisionData.options.filter(option => !option.trim());
        if (emptyOptions.length > 0) {
            setError('All options must have a value');
            return false;
        }
        
        // Check for duplicate options
        const uniqueOptions = new Set(decisionData.options);
        if (uniqueOptions.size !== decisionData.options.length) {
            setError('Options must be unique');
            return false;
        }
        
        // Check for empty whitelist addresses
        const emptyAddresses = decisionData.whitelist.filter(address => !address.trim());
        if (emptyAddresses.length > 0) {
            setError('All whitelist addresses must have a value');
            return false;
        }
        
        // Validate Ethereum addresses
        const invalidAddresses = decisionData.whitelist.filter(address => !address.match(/^0x[a-fA-F0-9]{40}$/));
        if (invalidAddresses.length > 0) {
            setError('All whitelist addresses must be valid Ethereum addresses');
            return false;
        }
        
        // Check for duplicate addresses
        const uniqueAddresses = new Set(decisionData.whitelist);
        if (uniqueAddresses.size !== decisionData.whitelist.length) {
            setError('Whitelist addresses must be unique');
            return false;
        }
        
        return true;
    };

    const createDecisionHandler = async (e) => {
        e.preventDefault();
        
        // Reset states
        setLoading(true);
        setError('');
        setSuccess('');

        // Validate wallet connection
        if (!account) {
            setError('Please connect your wallet first');
            setLoading(false);
            return;
        }

        // Validate form
        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            console.log("Creating decision with data:", {
                id: decisionData.id,
                name: decisionData.name,
                description: decisionData.description,
                durationMinutes: decisionData.durationMinutes,
                options: decisionData.options,
                whitelist: decisionData.whitelist
            });
            
            // Create decision
            const response = await createDecision(
                decisionData.id,
                decisionData.name,
                decisionData.description,
                decisionData.durationMinutes,
                decisionData.options,
                decisionData.whitelist,
                account
            );
            
            if (response.status) {
                setSuccess('Decision created successfully!');
                
                // Reset form
                setDecisionData({
                    id: '',
                    name: '',
                    description: '',
                    durationMinutes: 1440,
                    options: ['', ''],
                    whitelist: ['']
                });
                
                // Reload decisions list
                await loadDecisions();
                
                // Switch to list view
                setActiveTab('list');
            } else {
                throw new Error(response.error || 'Failed to create decision');
            }
        } catch (err) {
            console.error('Error creating decision:', err);
            setError(err.message || 'Failed to create decision');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalizeDecision = async (decisionId) => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            const response = await finalizeDecision(decisionId, account);
            
            if (response.status) {
                setSuccess(`Decision ${decisionId} finalized successfully!`);
                await loadDecisions();
            } else {
                throw new Error(response.error || 'Failed to finalize decision');
            }
        } catch (err) {
            console.error('Error finalizing decision:', err);
            setError(err.message || 'Failed to finalize decision');
        } finally {
            setLoading(false);
        }
    };

    const handleCountdownComplete = async (decisionId) => {
        try {
            // Refresh the decisions list to update status
            await loadDecisions();
        } catch (err) {
            console.error('Error handling countdown complete:', err);
        }
    };

    const renderDecisionStatus = (decision) => {
        const now = Math.floor(Date.now() / 1000);
        
        if (decision.finalized) {
            return (
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Finalized
                </span>
            );
        } else if (now > decision.endTime) {
            return (
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Ended (Not Finalized)
                </span>
            );
        } else if (now < decision.startTime) {
            return (
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Not Started
                </span>
            );
        } else {
            return (
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                </span>
            );
        }
    };

    const fetchDecisionResults = async (decisionId) => {
        try {
            setLoadingResults(true);
            
            const detailsResponse = await getDecisionDetails(decisionId);
            if (!detailsResponse.status) {
                throw new Error('Failed to fetch decision details');
            }
            
            const resultsResponse = await getDecisionResults(decisionId);
            if (!resultsResponse.status) {
                throw new Error('Failed to fetch decision results');
            }
            
            setSelectedDecision(detailsResponse.data);
            setDecisionResults(resultsResponse.data);
        } catch (err) {
            console.error('Error fetching decision results:', err);
            setError(err.message || 'Failed to fetch results');
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

                    {selectedDecision.finalized && (
                        <div className="bg-green-50 rounded-lg p-4 mb-6">
                            <div className="flex items-center">
                                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="ml-4">
                                    <h4 className="text-lg font-semibold text-gray-800">Winning Option</h4>
                                    <p className="text-xl font-bold text-green-600">{selectedDecision.winningOption}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {decisionResults.options.map((option, index) => {
                            const voteCount = parseInt(decisionResults.votes[index] || 0);
                            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                            
                            return (
                                <div key={index} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow duration-200">
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
                                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                                                    selectedDecision.finalized && option === selectedDecision.winningOption
                                                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                                }`}
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

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Decision Management</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-md transition-colors ${
                            activeTab === 'list' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                    >
                        Decision List
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-4 py-2 rounded-md transition-colors ${
                            activeTab === 'create' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                    >
                        Create Decision
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

            {activeTab === 'list' ? (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Decision List</h3>
                        <button
                            onClick={loadDecisions}
                            className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm leading-5 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:border-blue-400 focus:shadow-outline-blue active:bg-blue-200 transition ease-in-out duration-150"
                            disabled={loadingDecisions}
                        >
                            <svg className={`mr-2 h-4 w-4 ${loadingDecisions ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {loadingDecisions ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                    
                    {loadingDecisions ? (
                        <div className="flex justify-center items-center p-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : decisions.length === 0 ? (
                        <div className="text-center p-8">
                            <p className="text-gray-500">No decisions found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-blue-50">
                                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Start Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">End Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Countdown</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-blue-100">
                                    {decisions.map(decision => {
                                        const now = Math.floor(Date.now() / 1000);
                                        const canFinalize = !decision.finalized && now > decision.endTime;
                                        const isActive = now >= decision.startTime && now <= decision.endTime && !decision.finalized;
                                        
                                        return (
                                            <tr key={decision.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-800">{decision.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{decision.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-800">{formatTime(decision.startTime)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-800">{formatTime(decision.endTime)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                                                    {isActive ? (
                                                        <CountdownTimer 
                                                            endTime={decision.endTime} 
                                                            onComplete={() => handleCountdownComplete(decision.id)}
                                                            className="text-sm font-medium text-blue-600"
                                                            compact={true}
                                                        />
                                                    ) : (
                                                        <span className="text-sm text-gray-500">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {renderDecisionStatus(decision)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => fetchDecisionResults(decision.id)}
                                                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                                                        >
                                                            Results
                                                        </button>
                                                        
                                                        {canFinalize && (
                                                            <button
                                                                onClick={() => handleFinalizeDecision(decision.id)}
                                                                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
                                                                disabled={loading}
                                                            >
                                                                Finalize
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-700">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Create New Decision</h3>
                    
                    <form onSubmit={createDecisionHandler} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="id" className="block text-sm font-medium text-gray-700">Decision ID*</label>
                                <input
                                    type="text"
                                    name="id"
                                    id="id"
                                    className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                    placeholder="E.g. 1"
                                    value={decisionData.id}
                                    onChange={handleChange}
                                    required
                                />
                                <p className="mt-1 text-sm text-gray-500">Must be a numeric ID</p>
                            </div>
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Decision Name*</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                    placeholder="E.g. Budget Allocation"
                                    value={decisionData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description*</label>
                            <textarea
                                name="description"
                                id="description"
                                rows="3"
                                className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                placeholder="Describe the decision to be made"
                                value={decisionData.description}
                                onChange={handleChange}
                                required
                            ></textarea>
                        </div>
                        
                        <div>
                            <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700">Duration (minutes)*</label>
                            <div className="relative mt-1">
                                <input
                                    type="number"
                                    name="durationMinutes"
                                    id="durationMinutes"
                                    min="1"
                                    className="block w-full rounded-md border border-blue-200 bg-white pl-10 pr-12 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={decisionData.durationMinutes}
                                    onChange={handleChange}
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 flex">
                                    <button
                                        type="button"
                                        onClick={() => handleChange({ target: { name: 'durationMinutes', value: decisionData.durationMinutes + 1 } })}
                                        className="px-2 h-1/2 bg-blue-50 hover:bg-blue-100 border-l border-t border-blue-200 rounded-tr-md flex items-center justify-center"
                                    >
                                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleChange({ target: { name: 'durationMinutes', value: Math.max(1, decisionData.durationMinutes - 1) } })}
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
                            <p className="mt-1 text-sm text-gray-500">
                                Common durations: 60 (1 hour), 1440 (1 day), 10080 (1 week)
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Options*</label>
                            <div className="space-y-2">
                                {decisionData.options.map((option, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            className="block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                            placeholder={`Option ${index + 1}`}
                                            value={option}
                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeOption(index)}
                                            className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                                            disabled={decisionData.options.length <= 2}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={addOption}
                                className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                            >
                                Add Option
                            </button>
                            <p className="mt-1 text-sm text-gray-500">At least 2 options are required</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Whitelist*</label>
                            <div className="space-y-2">
                                {decisionData.whitelist.map((address, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            className="block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                            placeholder="0x..."
                                            value={address}
                                            onChange={(e) => handleWhitelistChange(index, e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeWhitelistAddress(index)}
                                            className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                                            disabled={decisionData.whitelist.length <= 1}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={addWhitelistAddress}
                                className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                            >
                                Add Address
                            </button>
                            <p className="mt-1 text-sm text-gray-500">Add Ethereum addresses of users who can vote</p>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setActiveTab('list')}
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Decision'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {/* Results Modal */}
            {selectedDecision && <DecisionResultsModal />}
        </div>
    );
};

export default DecisionManagement; 