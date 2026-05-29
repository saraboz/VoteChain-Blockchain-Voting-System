import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getDecisionDetails, 
  getDecisionResults, 
  isUserWhitelisted,
  hasUserVoted,
  voteOnDecision,
  isVotingActive,
  getRemainingTime,
  finalizeDecision
} from '../../utils/decisionBlockchainService';
import AuthContext from '../../context/AuthContext.jsx';
import '../../styles/DecisionDetail.css';

const DecisionDetail = () => {
  const { decisionId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [decision, setDecision] = useState(null);
  const [results, setResults] = useState({ options: [], votes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [whitelisted, setWhitelisted] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [voteError, setVoteError] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false); // Assuming admin check is done by role

  useEffect(() => {
    const fetchDecisionData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get decision details
        const decisionResult = await getDecisionDetails(decisionId);
        if (!decisionResult.status || !decisionResult.data) {
          throw new Error(decisionResult.error || 'Failed to fetch decision details');
        }
        
        setDecision(decisionResult.data);
        
        // Get results
        const resultsData = await getDecisionResults(decisionId);
        if (resultsData.status && resultsData.data) {
          setResults(resultsData.data);
        }

        // Get voting status
        const activeResult = await isVotingActive(decisionId);
        if (activeResult.status) {
          setIsActive(activeResult.data.active);
        }
        
        // Get remaining time
        if (activeResult.data?.active) {
          const timeResult = await getRemainingTime(decisionId);
          if (timeResult.status) {
            setRemainingTime(parseInt(timeResult.data.remainingTime));
          }
        }
        
        // If user is logged in, check whitelist status and if already voted
        if (user && user.walletAddress) {
          // Check whitelist
          const whitelistResult = await isUserWhitelisted(decisionId, user.walletAddress);
          if (whitelistResult.status) {
            setWhitelisted(whitelistResult.data.whitelisted);
          }
          
          // Check if already voted
          const votedResult = await hasUserVoted(decisionId, user.walletAddress);
          if (votedResult.status) {
            setHasVoted(votedResult.data.voted);
          }
          
          // Check if user is admin (simple check for demo)
          setIsAdmin(user.role === 'admin');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching decision data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDecisionData();
    
    // Set up timer to update remaining time
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [decisionId, user]);
  
  const handleVote = async () => {
    if (!user || !user.walletAddress) {
      setVoteError('Please connect your wallet to vote');
      return;
    }
    
    if (selectedOption === null) {
      setVoteError('Please select an option to vote');
      return;
    }
    
    try {
      setVoteSubmitting(true);
      setVoteError(null);
      
      const result = await voteOnDecision(decisionId, selectedOption, user.walletAddress);
      
      if (result.status) {
        setHasVoted(true);
        setSelectedOption(null);
        
        // Refresh results
        const updatedResults = await getDecisionResults(decisionId);
        if (updatedResults.status && updatedResults.data) {
          setResults(updatedResults.data);
        }
      } else {
        setVoteError(result.error || 'Failed to cast vote');
      }
    } catch (err) {
      setVoteError(err.message || 'An error occurred while casting vote');
    } finally {
      setVoteSubmitting(false);
    }
  };
  
  const handleFinalize = async () => {
    try {
      if (!user || !user.walletAddress) {
        setError('Please connect your wallet to finalize');
        return;
      }
      
      setLoading(true);
      
      const result = await finalizeDecision(decisionId, user.walletAddress);
      
      if (result.status) {
        // Refresh decision data
        const updatedDecision = await getDecisionDetails(decisionId);
        if (updatedDecision.status && updatedDecision.data) {
          setDecision(updatedDecision.data);
        }
        
        // Refresh results
        const updatedResults = await getDecisionResults(decisionId);
        if (updatedResults.status && updatedResults.data) {
          setResults(updatedResults.data);
        }
      } else {
        setError(result.error || 'Failed to finalize decision');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while finalizing decision');
    } finally {
      setLoading(false);
    }
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  const formatRemainingTime = (seconds) => {
    if (seconds <= 0) return 'Voting has ended';
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}m ` : ''}${secs}s`;
  };
  
  const calculatePercentage = (votes, totalVotes) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };
  
  if (loading) {
    return (
      <div className="decision-detail-container text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="decision-detail-container">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/decisions')}>
          Back to Decisions
        </button>
      </div>
    );
  }
  
  if (!decision) {
    return (
      <div className="decision-detail-container">
        <div className="alert alert-warning" role="alert">
          Decision not found
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/decisions')}>
          Back to Decisions
        </button>
      </div>
    );
  }
  
  const totalVotes = results.votes.reduce((sum, votes) => sum + parseInt(votes), 0);
  
  return (
    <div className="decision-detail-container">
      <button className="btn btn-outline-primary mb-3" onClick={() => navigate('/decisions')}>
        &larr; Back to Decisions
      </button>
      
      <h2 className="mb-3">{decision.name}</h2>
      <p className="decision-description">{decision.description}</p>
      
      <div className="decision-meta">
        <div className="meta-item">
          <span className="meta-label">Start Time:</span>
          <span className="meta-value">{formatTimestamp(decision.startTime)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">End Time:</span>
          <span className="meta-value">{formatTimestamp(decision.endTime)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Status:</span>
          <span className="meta-value">
            {decision.finalized ? (
              <span className="badge bg-success">Completed</span>
            ) : isActive ? (
              <span className="badge bg-primary">Active</span>
            ) : remainingTime > 0 ? (
              <span className="badge bg-warning">Not Started</span>
            ) : (
              <span className="badge bg-danger">Ended (Not Finalized)</span>
            )}
          </span>
        </div>
        {isActive && (
          <div className="meta-item">
            <span className="meta-label">Time Remaining:</span>
            <span className="meta-value">{formatRemainingTime(remainingTime)}</span>
          </div>
        )}
      </div>
      
      <hr className="my-4" />
      
      {decision.finalized ? (
        <div className="results-section">
          <h3>Final Results</h3>
          <div className="alert alert-success">
            <strong>Winning Option:</strong> {decision.winningOption}
          </div>
          
          <div className="results-list">
            {results.options.map((option, index) => (
              <div className="result-item" key={index}>
                <div className="result-header">
                  <span className="result-option">{option}</span>
                  <span className="result-votes">{results.votes[index]} votes ({calculatePercentage(parseInt(results.votes[index]), totalVotes)}%)</span>
                </div>
                <div className="progress">
                  <div 
                    className={`progress-bar ${option === decision.winningOption ? 'bg-success' : 'bg-primary'}`} 
                    role="progressbar" 
                    style={{ width: `${calculatePercentage(parseInt(results.votes[index]), totalVotes)}%` }} 
                    aria-valuenow={calculatePercentage(parseInt(results.votes[index]), totalVotes)} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !isActive && remainingTime <= 0 ? (
        <div className="results-section">
          <h3>Preliminary Results</h3>
          <p>The voting period has ended, but the decision has not been finalized yet.</p>
          
          <div className="results-list">
            {results.options.map((option, index) => (
              <div className="result-item" key={index}>
                <div className="result-header">
                  <span className="result-option">{option}</span>
                  <span className="result-votes">{results.votes[index]} votes ({calculatePercentage(parseInt(results.votes[index]), totalVotes)}%)</span>
                </div>
                <div className="progress">
                  <div 
                    className="progress-bar bg-primary" 
                    role="progressbar" 
                    style={{ width: `${calculatePercentage(parseInt(results.votes[index]), totalVotes)}%` }} 
                    aria-valuenow={calculatePercentage(parseInt(results.votes[index]), totalVotes)} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          {isAdmin && (
            <div className="mt-4">
              <button 
                className="btn btn-success" 
                onClick={handleFinalize}
                disabled={voteSubmitting}
              >
                {voteSubmitting ? 'Finalizing...' : 'Finalize Decision'}
              </button>
              <p className="text-muted mt-2">As an admin, you can finalize this decision to determine the winner.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="voting-section">
          <h3>Voting Options</h3>
          
          {!user || !user.walletAddress ? (
            <div className="alert alert-warning">
              Please connect your wallet to check if you can vote.
            </div>
          ) : !whitelisted ? (
            <div className="alert alert-danger">
              Your address is not whitelisted for this decision.
            </div>
          ) : hasVoted ? (
            <div className="alert alert-info">
              You have already voted in this decision.
            </div>
          ) : !isActive ? (
            <div className="alert alert-warning">
              Voting is not currently active.
            </div>
          ) : (
            <div className="voting-options">
              {voteError && (
                <div className="alert alert-danger">
                  {voteError}
                </div>
              )}
              
              <p>Select an option and cast your vote:</p>
              
              <div className="options-list">
                {decision.options.map((option, index) => (
                  <div className="option-item" key={index}>
                    <input 
                      type="radio" 
                      id={`option-${index}`} 
                      name="voteOption" 
                      value={index} 
                      checked={selectedOption === index}
                      onChange={() => setSelectedOption(index)}
                      className="form-check-input"
                    />
                    <label className="form-check-label ms-2" htmlFor={`option-${index}`}>
                      {option}
                    </label>
                  </div>
                ))}
              </div>
              
              <button 
                className="btn btn-primary mt-3" 
                onClick={handleVote} 
                disabled={selectedOption === null || voteSubmitting}
              >
                {voteSubmitting ? 'Submitting...' : 'Cast Vote'}
              </button>
            </div>
          )}
          
          {isActive && (
            <div className="current-results mt-4">
              <h4>Current Results</h4>
              <p className="text-muted">These results will update as votes come in.</p>
              
              <div className="results-list">
                {results.options.map((option, index) => (
                  <div className="result-item" key={index}>
                    <div className="result-header">
                      <span className="result-option">{option}</span>
                      <span className="result-votes">{results.votes[index]} votes ({calculatePercentage(parseInt(results.votes[index]), totalVotes)}%)</span>
                    </div>
                    <div className="progress">
                      <div 
                        className="progress-bar bg-primary" 
                        role="progressbar" 
                        style={{ width: `${calculatePercentage(parseInt(results.votes[index]), totalVotes)}%` }} 
                        aria-valuenow={calculatePercentage(parseInt(results.votes[index]), totalVotes)} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DecisionDetail; 