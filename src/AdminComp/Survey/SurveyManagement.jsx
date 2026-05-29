import React, { useState, useEffect } from 'react';
import { useBlockchain } from '../../utils/BlockchainContext';
import { 
    createSurvey, 
    addOption, 
    activateSurvey, 
    endSurvey, 
    getAllSurveys,
    getSurveyOptions,
    getSurveyResults
} from '../../utils/surveyBlockchainService';
import CountdownTimer from '../../components/SharedComponents/CountdownTimer';

const SurveyManagement = () => {
    const [surveyData, setSurveyData] = useState({
        id: '',
        title: '',
        description: '',
        duration: 60,
        maxSelectableOptions: 1
    });
    const [options, setOptions] = useState(['']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [surveys, setSurveys] = useState([]);
    const [loadingSurveys, setLoadingSurveys] = useState(false);
    const { account } = useBlockchain();
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [surveyResults, setSurveyResults] = useState(null);
    const [loadingResults, setLoadingResults] = useState(false);

    useEffect(() => {
        // Clear error when account changes
        setError('');
        if (account) {
            loadSurveys();
        }
    }, [account]);

    const loadSurveys = async () => {
        try {
            setLoadingSurveys(true);
            const result = await getAllSurveys();
            if (result.status) {
                setSurveys(result.data || []);
            } else {
                console.error('Failed to load surveys:', result.error);
            }
        } catch (err) {
            console.error('Error loading surveys:', err);
        } finally {
            setLoadingSurveys(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Convert numeric inputs to numbers
        if (name === 'duration' || name === 'maxSelectableOptions') {
            // Ensure value is a positive number or empty string
            const numValue = value === '' ? '' : Math.max(1, parseInt(value) || 1);
            setSurveyData({
                ...surveyData,
                [name]: numValue
            });
        } else {
            setSurveyData({
                ...surveyData,
                [name]: value
            });
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOptionField = () => {
        setOptions([...options, '']);
    };

    const removeOption = (index) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    const createSurveyHandler = async (e) => {
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

        // Validate inputs
        if (!surveyData.id.trim()) {
            setError('Survey ID is required');
            setLoading(false);
            return;
        }
        
        // Validate that ID has no spaces and only contains alphanumeric characters
        if (/\s/.test(surveyData.id) || !/^[a-zA-Z0-9_-]+$/.test(surveyData.id)) {
            setError('Survey ID must not contain spaces and should only include letters, numbers, underscores, and hyphens');
            setLoading(false);
            return;
        }

        if (!surveyData.title.trim()) {
            setError('Survey title is required');
            setLoading(false);
            return;
        }

        if (!surveyData.description.trim()) {
            setError('Survey description is required');
            setLoading(false);
            return;
        }

        if (!surveyData.duration || surveyData.duration < 1) {
            setError('Duration must be at least 1 minute');
            setLoading(false);
            return;
        }

        if (!surveyData.maxSelectableOptions || surveyData.maxSelectableOptions < 1) {
            setError('Max selectable options must be at least 1');
            setLoading(false);
            return;
        }

        if (!options[0].trim()) {
            setError('Please add at least one option');
            setLoading(false);
            return;
        }

        try {
            console.log("Preparing to create survey with data:", {
                id: surveyData.id.trim(),
                title: surveyData.title.trim(),
                description: surveyData.description.trim(),
                duration: parseInt(surveyData.duration) * 60,
                maxSelectableOptions: parseInt(surveyData.maxSelectableOptions)
            });
            
            // Create survey with account address
            const createResponse = await createSurvey(
                surveyData.id.trim(),
                surveyData.title.trim(),
                surveyData.description.trim(),
                parseInt(surveyData.duration) * 60, // Convert minutes to seconds and ensure it's an integer
                parseInt(surveyData.maxSelectableOptions),
                account // Pass account address
            );

            if (!createResponse.status) {
                throw new Error(createResponse.error || 'Failed to create survey');
            }

            // Add options
            const validOptions = options.filter(opt => opt.trim());
            for (const option of validOptions) {
                const optionResponse = await addOption(surveyData.id, option.trim(), account); // Pass account address
                if (!optionResponse.status) {
                    throw new Error(`Failed to add option: ${option}`);
                }
                console.log(`Added option: ${option}, response:`, optionResponse);
            }

            // Reset form
            setSurveyData({
                id: '',
                title: '',
                description: '',
                duration: 60,
                maxSelectableOptions: 1
            });
            setOptions(['']);
            setSuccess('Survey created successfully! Transaction hash: ' + 
                (createResponse.data && createResponse.data.transactionHash 
                    ? createResponse.data.transactionHash 
                    : 'Pending')
            );
            
            // Reload the surveys list
            await loadSurveys();
        } catch (err) {
            console.error('Error in survey creation:', err);
            setError(err.message || 'Failed to create survey. Please make sure your wallet is connected and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleActivateSurvey = async (surveyId) => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            const response = await activateSurvey(surveyId, account); // Pass account address
            
            if (response.status) {
                setSuccess(`Survey ${surveyId} activated successfully!`);
                await loadSurveys(); // Reload the list
            } else {
                setError(`Failed to activate survey: ${response.error}`);
            }
        } catch (err) {
            console.error('Error activating survey:', err);
            setError(`Failed to activate survey: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleEndSurvey = async (surveyId) => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            const response = await endSurvey(surveyId, account); // Pass account address
            
            if (response.status) {
                setSuccess(`Survey ${surveyId} ended successfully!`);
                await loadSurveys(); // Reload the list
            } else {
                setError(`Failed to end survey: ${response.error}`);
            }
        } catch (err) {
            console.error('Error ending survey:', err);
            setError(`Failed to end survey: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCountdownComplete = async (surveyId) => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            const response = await endSurvey(surveyId, account); // Pass account address
            
            if (response.status) {
                setSuccess(`Survey ${surveyId} has ended automatically`);
                await loadSurveys(); // Reload the list
            } else {
                // If the survey is already inactive, treat it as a success
                if (response.error === 'Survey is already inactive') {
                    setSuccess(`Survey ${surveyId} is already marked as inactive`);
                    await loadSurveys(); // Reload the list to reflect current state
                } else {
                    setError(`Failed to end survey: ${response.error}`);
                }
            }
        } catch (err) {
            console.error('Error ending survey:', err);
            setError(`Failed to end survey: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };
    
    const renderSurveyStatus = (survey) => {
        if (!survey.active) {
            return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Inactive</span>;
        }
        
        const now = Math.floor(Date.now() / 1000);
        const startTime = Number(survey.startTime);
        const endTime = startTime + Number(survey.duration);
        
        if (now < startTime) {
            return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Scheduled</span>;
        } else if (now >= startTime && now <= endTime) {
            return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
        } else {
            return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Ended</span>;
        }
    };

    const fetchSurveyResults = async (surveyId) => {
        try {
            setLoadingResults(true);
            setError('');
            
            const response = await getSurveyResults(surveyId);
            if (!response.status) {
                throw new Error(response.error || 'Failed to fetch survey results');
            }

            setSurveyResults(response.data);
            setSelectedSurvey(surveys.find(s => s.id === surveyId));
        } catch (err) {
            console.error('Error fetching survey results:', err);
            setError('Failed to fetch survey results: ' + err.message);
        } finally {
            setLoadingResults(false);
        }
    };

    const closeResults = () => {
        setSelectedSurvey(null);
        setSurveyResults(null);
    };

    // Add this new component for rendering survey results
    const SurveyResultsModal = () => {
        if (!selectedSurvey || !surveyResults) return null;

        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 xl:w-2/5 shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
                    <div className="mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{surveyResults.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{surveyResults.description}</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <div className="ml-4">
                                    <h4 className="text-lg font-semibold text-gray-800">Total Responses</h4>
                                    <p className="text-2xl font-bold text-blue-600">{surveyResults.totalVotes}</p>
                                </div>
                            </div>
                            <div className="hidden md:block">
                                <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
                                    <span className="text-sm font-medium">Survey ID: {surveyResults.surveyId}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {surveyResults.results.map((result, index) => (
                            <div key={index} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow duration-200">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-base font-medium text-gray-800">{result.option}</h4>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-semibold text-gray-600">{result.votes} votes</span>
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                                            {result.percentage}%
                                        </span>
                                    </div>
                                </div>
                                <div className="relative pt-1">
                                    <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-gray-200">
                                        <div 
                                            style={{ width: `${result.percentage}%` }}
                                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
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

    return (
        <div className="space-y-8">
            {/* Survey creation form */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Survey</h2>
                
                {error && (
                    <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="p-4 mb-4 bg-green-100 text-green-700 rounded-lg border border-green-200">
                        {success}
                    </div>
                )}

                <form onSubmit={createSurveyHandler} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Survey ID</label>
                            <input
                                type="text"
                                name="id"
                                value={surveyData.id}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">Enter a unique identifier (no spaces). This ID is used by the blockchain to identify your survey.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <input
                                type="text"
                                name="title"
                                value={surveyData.title}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            name="description"
                            value={surveyData.description}
                            onChange={handleChange}
                            rows="3"
                            className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                            <div className="relative mt-1">
                                <input
                                    type="number"
                                    name="duration"
                                    value={surveyData.duration}
                                    onChange={handleChange}
                                    min="1"
                                    className="block w-full rounded-md border border-blue-200 bg-white pl-10 pr-12 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 flex">
                                    <button
                                        type="button"
                                        onClick={() => handleChange({ target: { name: 'duration', value: surveyData.duration + 1 } })}
                                        className="px-2 h-1/2 bg-blue-50 hover:bg-blue-100 border-l border-t border-blue-200 rounded-tr-md flex items-center justify-center"
                                    >
                                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleChange({ target: { name: 'duration', value: Math.max(1, surveyData.duration - 1) } })}
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
                            <label className="block text-sm font-medium text-gray-700">Max Selectable Options</label>
                            <div className="relative mt-1">
                                <input
                                    type="number"
                                    name="maxSelectableOptions"
                                    value={surveyData.maxSelectableOptions}
                                    onChange={handleChange}
                                    min="1"
                                    className="block w-full rounded-md border border-blue-200 bg-white pl-10 pr-12 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 flex">
                                    <button
                                        type="button"
                                        onClick={() => handleChange({ target: { name: 'maxSelectableOptions', value: surveyData.maxSelectableOptions + 1 } })}
                                        className="px-2 h-1/2 bg-blue-50 hover:bg-blue-100 border-l border-t border-blue-200 rounded-tr-md flex items-center justify-center"
                                    >
                                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleChange({ target: { name: 'maxSelectableOptions', value: Math.max(1, surveyData.maxSelectableOptions - 1) } })}
                                        className="px-2 h-1/2 bg-blue-50 hover:bg-blue-100 border-l border-b border-blue-200 rounded-br-md flex items-center justify-center"
                                    >
                                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11h10m-5-5v10" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                        {options.map((option, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                    placeholder={`Option ${index + 1}`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => removeOption(index)}
                                    className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                                    disabled={options.length === 1}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addOptionField}
                            className="mt-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
                        >
                            Add Option
                        </button>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || !account}
                            className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                loading || !account ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {loading ? 'Creating...' : 'Create Survey'}
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Surveys list */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Manage Surveys</h2>
                    <button
                        onClick={loadSurveys}
                        className="flex items-center px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                        disabled={loadingSurveys}
                    >
                        <svg
                            className={`h-5 w-5 mr-2 ${loadingSurveys ? 'animate-spin' : ''}`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        {loadingSurveys ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
                
                {loadingSurveys ? (
                    <div className="flex justify-center items-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : surveys.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        No surveys found. Create your first survey above.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Title
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Time Remaining
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {surveys.map((survey) => (
                                    <tr key={survey.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {survey.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {survey.title}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {renderSurveyStatus(survey)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {survey.active && (
                                                <CountdownTimer 
                                                    endTime={Number(survey.startTime) + Number(survey.duration)}
                                                    compact={true}
                                                    className="text-sm text-blue-600 font-medium"
                                                    onComplete={() => handleCountdownComplete(survey.id)}
                                                />
                                            )}
                                            {!survey.active && (
                                                <span className="text-sm text-gray-500">
                                                    {survey.startTime ? 'Finished' : 'Not Started'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                {!survey.active && (
                                                    <button
                                                        onClick={() => handleActivateSurvey(survey.id)}
                                                        className="text-white bg-green-600 px-3 py-1 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                        disabled={loading}
                                                    >
                                                        Activate
                                                    </button>
                                                )}
                                                {survey.active && (
                                                    <button
                                                        onClick={() => handleEndSurvey(survey.id)}
                                                        className="text-white bg-red-600 px-3 py-1 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                        disabled={loading}
                                                    >
                                                        End
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => fetchSurveyResults(survey.id)}
                                                    className="text-white bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    disabled={loadingResults}
                                                >
                                                    {loadingResults && selectedSurvey?.id === survey.id ? 'Loading...' : 'View Results'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Survey Results Modal */}
            {selectedSurvey && surveyResults && <SurveyResultsModal />}
        </div>
    );
};

export default SurveyManagement; 