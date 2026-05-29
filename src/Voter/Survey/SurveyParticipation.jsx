import React, { useState, useEffect } from 'react';
import { useBlockchain } from '../../utils/BlockchainContext';
// import CountdownTimer from '../../components/SharedComponents/CountdownTimer';
import * as surveyService from '../../utils/surveyBlockchainService';

const SurveyParticipation = () => {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedOptions, setSelectedOptions] = useState({});
    const { account } = useBlockchain();
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [surveyResults, setSurveyResults] = useState(null);
    const [loadingResults, setLoadingResults] = useState(false);

    useEffect(() => {
        if (account) {
            loadSurveys();
        }
    }, [account]);

    const loadSurveys = async () => {
        try {
            setLoading(true);
            setError('');
            
            console.log('Getting all surveys...');
            if (!account) {
                setError('Please connect your wallet to view surveys.');
                setLoading(false);
                return;
            }

            // Get all surveys
            const allSurveysResult = await surveyService.getAllSurveys();
            
            if (!allSurveysResult.status) {
                console.warn('Failed to get surveys:', allSurveysResult.error);
                setError('Failed to load surveys: ' + allSurveysResult.error);
                setLoading(false);
                return;
            }
            
            const allSurveys = Array.isArray(allSurveysResult.data) ? allSurveysResult.data : [];
            console.log(`Found ${allSurveys.length} surveys:`, allSurveys);
            
            if (allSurveys.length === 0) {
                setError('No surveys found. Please check back later.');
                setLoading(false);
                return;
            }
            
            // Process the surveys to add options and participation info
            const loadedSurveys = [];
            
            for (const survey of allSurveys) {
                try {
                    // Skip invalid survey objects
                    if (!survey || !survey.id) {
                        console.warn('Skipping invalid survey object:', survey);
                        continue;
                    }
                    
                    console.log(`Getting options for survey ${survey.id}...`);
                    // Get options for this survey
                    const optionsResult = await surveyService.getSurveyOptions(survey.id);
                    
                    if (!optionsResult.status) {
                        console.warn(`Failed to get options for survey ${survey.id}:`, optionsResult.error);
                        continue;
                    }
                    
                    // Get valid options and votes
                    const options = optionsResult.data?.options || [];
                    const votes = optionsResult.data?.votes || [];
                    
                    // Skip surveys with no options
                    if (options.length === 0) {
                        console.log(`Skipping survey ${survey.id} because it has no options`);
                        continue;
                    }
                    
                    console.log(`Checking participation for user ${account} in survey ${survey.id}...`);
                    // Check if user has participated
                    const participationResult = await surveyService.hasUserParticipated(survey.id, account);
                    
                    const surveyWithOptions = {
                        id: survey.id,
                        title: survey.title || 'Untitled Survey',
                        description: survey.description || 'No description available',
                        startTime: survey.startTime || '0',
                        duration: survey.duration || '0',
                        active: Boolean(survey.active),
                        maxSelectableOptions: Number(survey.maxSelectableOptions) || 1,
                        options: options.map((text, index) => ({
                            id: index,
                            text: text || `Option ${index + 1}`,
                            votes: votes[index] || '0'
                        })),
                        hasParticipated: participationResult.status && participationResult.participated
                    };
                    
                        loadedSurveys.push(surveyWithOptions);
                        console.log(`Successfully loaded survey: ${survey.id}`);
                } catch (err) {
                    console.error(`Error processing survey ${survey.id}:`, err);
                }
            }

            console.log(`Total surveys loaded: ${loadedSurveys.length}`);
            setSurveys(loadedSurveys);
            
            if (loadedSurveys.length === 0) {
                setError('No surveys with options found. Please check back later.');
            }
        } catch (err) {
            console.error('Failed to load surveys:', err);
            setError('Failed to load surveys: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (surveyId, optionId) => {
        setSelectedOptions(prev => {
            const currentSelected = prev[surveyId] || [];
            const survey = surveys.find(s => s.id === surveyId);
            
            if (!survey) return prev;

            if (currentSelected.includes(optionId)) {
                return {
                    ...prev,
                    [surveyId]: currentSelected.filter(id => id !== optionId)
                };
            } else if (currentSelected.length < survey.maxSelectableOptions) {
                return {
                    ...prev,
                    [surveyId]: [...currentSelected, optionId]
                };
            }
            
            return prev;
        });
    };

    const submitResponse = async (surveyId) => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            
            if (!account) {
                setError('Please connect your wallet first');
                setLoading(false);
                return;
            }
            
            const options = selectedOptions[surveyId] || [];
            if (options.length === 0) {
                setError('Please select at least one option');
                setLoading(false);
                return;
            }

            // Submit the response
            const response = await surveyService.submitSurveyResponse(surveyId, options, account);
            
            if (response.status) {
                setSuccess('Response submitted successfully!');
                setSelectedOptions(prev => ({ ...prev, [surveyId]: [] }));
                
                // Wait for a short delay to allow the blockchain to update
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Reload the surveys to get updated data
                await loadSurveys();
                
                // If we were viewing results, refresh them
                if (selectedSurvey?.id === surveyId) {
                    await fetchSurveyResults(surveyId);
                }
            } else {
                setError(response.error || 'Failed to submit response');
            }
        } catch (err) {
            console.error('Error submitting response:', err);
            setError(err.message || 'Failed to submit response');
        } finally {
            setLoading(false);
        }
    };

    const renderStatusBadge = (survey) => {
        if (survey.hasParticipated) {
            return (
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Participated
                </span>
            );
        } else if (!survey.active) {
            return (
                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    Inactive
                </span>
            );
        } else {
            return (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Active
                </span>
            );
        }
    };

    const fetchSurveyResults = async (surveyId) => {
        try {
            setLoadingResults(true);
            setError('');
            
            const response = await surveyService.getSurveyResults(surveyId);
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

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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

            {surveys.length === 0 ? (
                <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-500">
                    No surveys available
                </div>
            ) : (
                surveys.map(survey => (
                    <div key={survey.id} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <h2 className="text-xl font-bold text-gray-800">{survey.title}</h2>
                                    {renderStatusBadge(survey)}
                                </div>
                                <p className="text-gray-600 mt-1">{survey.description}</p>
                            </div>
                            <button
                                onClick={() => fetchSurveyResults(survey.id)}
                                className="text-white bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={loadingResults}
                            >
                                {loadingResults && selectedSurvey?.id === survey.id ? 'Loading...' : 'View Results'}
                            </button>
                        </div>

                        {survey.hasParticipated ? (
                            <div className="p-4 bg-green-50 text-green-700 rounded-lg">
                                You have already participated in this survey
                            </div>
                        ) : !survey.active ? (
                            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
                                This survey is currently inactive
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 mt-4">
                                    {survey.options.map(option => (
                                        <div key={option.id} className="flex items-center">
                                            <input
                                                type={survey.maxSelectableOptions > 1 ? "checkbox" : "radio"}
                                                id={`${survey.id}-${option.id}`}
                                                name={survey.id}
                                                checked={(selectedOptions[survey.id] || []).includes(option.id)}
                                                onChange={() => handleOptionSelect(survey.id, option.id)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                disabled={!survey.active}
                                            />
                                            <label htmlFor={`${survey.id}-${option.id}`} className="ml-3 block text-gray-700">
                                                {option.text}
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4">
                                    <button
                                        onClick={() => submitResponse(survey.id)}
                                        disabled={loading || !(selectedOptions[survey.id] || []).length}
                                        className={`w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                            loading || !(selectedOptions[survey.id] || []).length ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {loading ? 'Submitting...' : 'Submit Response'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))
            )}

            {/* Survey Results Modal */}
            {selectedSurvey && surveyResults && <SurveyResultsModal />}
        </div>
    );
};

export default SurveyParticipation; 