import React, { useState } from 'react';
import { useBlockchain } from '../utils/BlockchainContext';
import { registerUser, checkUserRegistered } from '../utils/blockchainService';
import WalletConnect from '../components/SharedComponents/WalletConnect';

const BlockchainRegistration = () => {
  const [uuid, setUuid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);
  
  const { account, isConnected, isRegistered } = useBlockchain();
  
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!uuid.trim()) {
      setError('Please enter a UUID');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await registerUser(uuid, account);
      console.log('Registration result:', result);
      
      if (result.status) {
        setSuccess(`Registration successful! Transaction hash: ${result.transactionHash}`);
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCheck = async () => {
    if (!uuid.trim()) {
      setError('Please enter a UUID to check');
      return;
    }
    
    setChecking(true);
    setError('');
    setCheckResult(null);
    
    try {
      const result = await checkUserRegistered(uuid);
      console.log('Check result:', result);
      setCheckResult(result.registered);
    } catch (err) {
      console.error('Check error:', err);
      setError(err.message || 'Check failed');
    } finally {
      setChecking(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Direct Blockchain Registration</h1>
      
      <div className="mb-6">
        <WalletConnect />
      </div>
      
      <form onSubmit={handleRegister} className="mb-8">
        <div className="mb-4">
          <label htmlFor="uuid" className="block text-sm font-medium text-gray-700 mb-1">
            User UUID
          </label>
          <input
            type="text"
            id="uuid"
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter UUID to register"
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading || !isConnected}
            className={`px-4 py-2 ${loading || !isConnected ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md font-medium flex items-center`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Registering...
              </>
            ) : (
              'Register in Blockchain'
            )}
          </button>
          
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className={`px-4 py-2 ${checking ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md font-medium flex items-center`}
          >
            {checking ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Checking...
              </>
            ) : (
              'Check Registration'
            )}
          </button>
        </div>
      </form>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md">
          {success}
        </div>
      )}
      
      {checkResult !== null && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 font-medium">
            UUID <span className="font-bold">{uuid}</span> is{' '}
            {checkResult ? (
              <span className="text-green-600 font-bold">registered</span>
            ) : (
              <span className="text-red-600 font-bold">not registered</span>
            )}{' '}
            in the blockchain.
          </p>
        </div>
      )}
      
      <div className="mt-6 text-gray-600 text-sm">
        <h3 className="font-medium text-gray-700 mb-1">Current Status:</h3>
        <ul className="list-disc ml-5 space-y-1">
          <li>Wallet Connected: <span className="font-medium">{isConnected ? 'Yes' : 'No'}</span></li>
          <li>Wallet Address: <span className="font-medium">{account || 'Not connected'}</span></li>
          <li>Registration Status: <span className={`font-medium ${isRegistered ? 'text-green-600' : 'text-yellow-600'}`}>
            {isRegistered ? 'Registered' : 'Not Registered'}
          </span></li>
        </ul>
      </div>
    </div>
  );
};

export default BlockchainRegistration; 