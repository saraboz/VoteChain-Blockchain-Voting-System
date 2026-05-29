import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllDecisions, getActiveDecisions } from '../../utils/decisionBlockchainService';
import '../../styles/DecisionList.css';

const DecisionList = () => {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, completed

  useEffect(() => {
    const fetchDecisions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let result;
        if (filter === 'active') {
          result = await getActiveDecisions();
        } else {
          result = await getAllDecisions();
        }
        
        if (result.status) {
          // Filter decisions based on the selected filter
          let filteredDecisions = result.data || [];
          
          if (filter === 'completed') {
            filteredDecisions = filteredDecisions.filter(decision => decision.finalized);
          }
          
          setDecisions(filteredDecisions);
        } else {
          setError(result.error || 'Failed to fetch decisions');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching decisions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDecisions();
  }, [filter]);
  
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  const getStatusBadge = (decision) => {
    const now = Math.floor(Date.now() / 1000);
    
    if (decision.finalized) {
      return <span className="badge bg-success">Completed</span>;
    } else if (now < decision.startTime) {
      return <span className="badge bg-warning">Not Started</span>;
    } else if (now > decision.endTime) {
      return <span className="badge bg-danger">Ended (Not Finalized)</span>;
    } else {
      return <span className="badge bg-primary">Active</span>;
    }
  };
  
  return (
    <div className="decision-list-container">
      <h2>Decision Making</h2>
      
      <div className="filter-buttons mb-4">
        <button 
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'} me-2`}
          onClick={() => handleFilterChange('all')}
        >
          All Decisions
        </button>
        <button 
          className={`btn ${filter === 'active' ? 'btn-primary' : 'btn-outline-primary'} me-2`}
          onClick={() => handleFilterChange('active')}
        >
          Active Decisions
        </button>
        <button 
          className={`btn ${filter === 'completed' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => handleFilterChange('completed')}
        >
          Completed Decisions
        </button>
      </div>
      
      {loading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : decisions.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No {filter === 'all' ? '' : filter} decisions found.
        </div>
      ) : (
        <div className="decision-list">
          {decisions.map((decision) => (
            <div className="decision-card" key={decision.id}>
              <div className="decision-header">
                <h3>{decision.name}</h3>
                {getStatusBadge(decision)}
              </div>
              <p className="decision-description">{decision.description}</p>
              <div className="decision-details">
                <p><strong>Start:</strong> {formatTimestamp(decision.startTime)}</p>
                <p><strong>End:</strong> {formatTimestamp(decision.endTime)}</p>
                <p><strong>Options:</strong> {decision.options.length}</p>
                {decision.finalized && (
                  <p><strong>Winner:</strong> {decision.winningOption}</p>
                )}
              </div>
              <Link to={`/decisions/${decision.id}`} className="btn btn-primary">
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DecisionList; 