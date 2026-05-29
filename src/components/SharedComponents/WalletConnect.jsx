import { useState } from 'react';
import { useBlockchain } from '../../utils/BlockchainContext';

const WalletConnect = ({ className = '' }) => {
  const { 
    isConnected, 
    account, 
    connectWallet, 
    disconnectWallet, 
    isLoading, 
    error, 
    formatAddress,
    isRegistered,
    refreshRegistrationStatus
  } = useBlockchain();

  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleConnectClick = async () => {
    if (connecting) return;
    
    setConnecting(true);
    try {
      if (isConnected) {
        await disconnectWallet();
      } else {
        await connectWallet();
      }
    } catch (error) {
      console.error("Connection action failed:", error);
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshClick = async () => {
    if (!isConnected) return;
    
    setRefreshing(true);
    try {
      await refreshRegistrationStatus();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex gap-2">
        <button
          onClick={handleConnectClick}
          disabled={isLoading || connecting}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center transition-colors duration-200 ${
            isConnected
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } ${(isLoading || connecting) ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading || connecting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {connecting ? (isConnected ? 'Disconnecting...' : 'Connecting...') : 'Loading...'}
            </span>
          ) : isConnected ? (
            <>Disconnect {formatAddress(account)}</>
          ) : (
            <>Connect Wallet</>
          )}
        </button>

        {isConnected && (
          <button
            onClick={handleRefreshClick}
            disabled={refreshing}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm font-medium flex items-center justify-center transition-colors duration-200"
          >
            {refreshing ? (
              <svg className="animate-spin h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-2 text-red-500 text-xs">
          {error}
        </div>
      )}

      {isConnected && (
        <div className="mt-2 text-xs">
          <div className="flex flex-col">
            <span className="text-gray-500">
              Status: <span className="font-medium text-gray-700">Connected</span>
            </span>
            <span className="text-gray-500">
              Wallet: <span className="font-medium text-gray-700">{formatAddress(account)}</span>
            </span>
            <span className="text-gray-500">
              Registration: <span className={`font-medium ${isRegistered ? 'text-green-600' : 'text-yellow-600'}`}>
                {isRegistered ? 'Registered' : 'Not Registered'}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 