import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDecision } from '../../utils/decisionBlockchainService.js';
import AuthContext from '../../context/AuthContext.jsx';
import '../../styles/CreateDecision.css';

const CreateDecision = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    durationMinutes: 1440, // Default to 24 hours
    options: ['', ''], // Start with 2 empty options
    whitelist: [''], // Start with 1 empty address
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const handleOptionChange = (index, value) => {
    const updatedOptions = [...formData.options];
    updatedOptions[index] = value;
    setFormData({
      ...formData,
      options: updatedOptions,
    });
  };
  
  const handleWhitelistChange = (index, value) => {
    const updatedWhitelist = [...formData.whitelist];
    updatedWhitelist[index] = value;
    setFormData({
      ...formData,
      whitelist: updatedWhitelist,
    });
  };
  
  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ''],
    });
  };
  
  const removeOption = (index) => {
    if (formData.options.length <= 2) {
      setError('At least 2 options are required');
      return;
    }
    
    const updatedOptions = formData.options.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      options: updatedOptions,
    });
  };
  
  const addWhitelistAddress = () => {
    setFormData({
      ...formData,
      whitelist: [...formData.whitelist, ''],
    });
  };
  
  const removeWhitelistAddress = (index) => {
    if (formData.whitelist.length <= 1) {
      setError('At least 1 address is required in the whitelist');
      return;
    }
    
    const updatedWhitelist = formData.whitelist.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      whitelist: updatedWhitelist,
    });
  };
  
  const validateForm = () => {
    // Check for empty required fields
    if (!formData.id || !formData.name || !formData.description || !formData.durationMinutes) {
      setError('Please fill in all required fields');
      return false;
    }
    
    // Validate ID is a number
    if (isNaN(formData.id)) {
      setError('Decision ID must be a number');
      return false;
    }
    
    // Validate duration is a positive number
    if (formData.durationMinutes <= 0) {
      setError('Duration must be a positive number');
      return false;
    }
    
    // Check for empty options
    const emptyOptions = formData.options.filter(option => !option.trim());
    if (emptyOptions.length > 0) {
      setError('All options must have a value');
      return false;
    }
    
    // Check for duplicate options
    const uniqueOptions = new Set(formData.options);
    if (uniqueOptions.size !== formData.options.length) {
      setError('Options must be unique');
      return false;
    }
    
    // Check for empty whitelist addresses
    const emptyAddresses = formData.whitelist.filter(address => !address.trim());
    if (emptyAddresses.length > 0) {
      setError('All whitelist addresses must have a value');
      return false;
    }
    
    // Validate Ethereum addresses
    const invalidAddresses = formData.whitelist.filter(address => !address.match(/^0x[a-fA-F0-9]{40}$/));
    if (invalidAddresses.length > 0) {
      setError('All whitelist addresses must be valid Ethereum addresses');
      return false;
    }
    
    // Check for duplicate addresses
    const uniqueAddresses = new Set(formData.whitelist);
    if (uniqueAddresses.size !== formData.whitelist.length) {
      setError('Whitelist addresses must be unique');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setSuccess(false);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Check if user is logged in and has a wallet address
    if (!user || !user.walletAddress) {
      setError('Please connect your wallet to create a decision');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create decision
      const result = await createDecision(
        formData.id,
        formData.name,
        formData.description,
        formData.durationMinutes,
        formData.options,
        formData.whitelist,
        user.walletAddress
      );
      
      if (result.status) {
        setSuccess(true);
        // Reset form after successful submission
        setFormData({
          id: '',
          name: '',
          description: '',
          durationMinutes: 1440,
          options: ['', ''],
          whitelist: [''],
        });
        
        // Redirect to decision details page after a delay
        setTimeout(() => {
          navigate(`/decisions/${result.data.decisionId}`);
        }, 2000);
      } else {
        setError(result.error || 'Failed to create decision');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while creating the decision');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="create-decision-container">
      <h2>Create New Decision</h2>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success" role="alert">
          Decision created successfully! Redirecting to decision page...
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="create-decision-form">
        <div className="form-group mb-3">
          <label htmlFor="id" className="form-label">Decision ID *</label>
          <input
            type="text"
            className="form-control"
            id="id"
            name="id"
            value={formData.id}
            onChange={handleInputChange}
            placeholder="Enter a unique numeric ID"
            required
          />
          <small className="form-text text-muted">Must be a unique numeric identifier</small>
        </div>
        
        <div className="form-group mb-3">
          <label htmlFor="name" className="form-label">Decision Name *</label>
          <input
            type="text"
            className="form-control"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter decision name"
            required
          />
        </div>
        
        <div className="form-group mb-3">
          <label htmlFor="description" className="form-label">Description *</label>
          <textarea
            className="form-control"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
            placeholder="Enter decision description"
            required
          ></textarea>
        </div>
        
        <div className="form-group mb-3">
          <label htmlFor="durationMinutes" className="form-label">Duration (minutes) *</label>
          <input
            type="number"
            className="form-control"
            id="durationMinutes"
            name="durationMinutes"
            value={formData.durationMinutes}
            onChange={handleInputChange}
            min="1"
            required
          />
          <small className="form-text text-muted">
            Common durations: 60 (1 hour), 1440 (1 day), 10080 (1 week)
          </small>
        </div>
        
        <div className="form-group mb-4">
          <label className="form-label">Options *</label>
          <div className="options-container">
            {formData.options.map((option, index) => (
              <div className="option-input-group" key={index}>
                <input
                  type="text"
                  className="form-control"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => removeOption(index)}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary mt-2"
            onClick={addOption}
          >
            <i className="bi bi-plus"></i> Add Option
          </button>
          <small className="form-text text-muted d-block mt-1">
            At least 2 options are required
          </small>
        </div>
        
        <div className="form-group mb-4">
          <label className="form-label">Whitelist Addresses *</label>
          <div className="whitelist-container">
            {formData.whitelist.map((address, index) => (
              <div className="whitelist-input-group" key={index}>
                <input
                  type="text"
                  className="form-control"
                  value={address}
                  onChange={(e) => handleWhitelistChange(index, e.target.value)}
                  placeholder="0x..."
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => removeWhitelistAddress(index)}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary mt-2"
            onClick={addWhitelistAddress}
          >
            <i className="bi bi-plus"></i> Add Address
          </button>
          <small className="form-text text-muted d-block mt-1">
            Add Ethereum addresses of users who can vote on this decision
          </small>
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-outline-secondary me-2"
            onClick={() => navigate('/decisions')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Decision'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateDecision; 