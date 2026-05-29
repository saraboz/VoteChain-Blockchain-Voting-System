import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // If needed
import { showModalAlert } from './Alert';

const ConnectWalletButton = () => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [errorMessage, setErrorMessage] = useState(""); // For storing error messages
    const [isWalletValid, setIsWalletValid] = useState(true);  // To track whether the wallet is valid
    const token = localStorage.getItem('token'); // Assuming token is stored in localStorage

    // Handle wallet connection
    const handleConnectWallet = async () => {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const currentWallet = accounts[0];

            try {
                // Check the wallet in the database
                const response = await axios.get('http://localhost:5000/api/users/check-wallet', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const dbWallet = response.data.walletAddress;

                // If wallets do not match
                if (dbWallet && currentWallet.toLowerCase() !== dbWallet.toLowerCase()) {
                    //setErrorMessage('⚠️ The connected wallet does not match the registered wallet (i am in components)');
                    setIsWalletValid(false);  // Set to false when the wallets don’t match
                } else {
                    setWalletAddress(currentWallet);  // Set wallet if valid
                    setErrorMessage("");  // Clear error if wallets match
                    setIsWalletValid(true);  // Set to true if wallet is valid
                }

            } catch (err) {
                console.error("Error checking wallet:", err);
                setErrorMessage('❌ Error verifying wallet, please try again.');
                setIsWalletValid(false);
            }
        } else {
           showModalAlert({
                type: 'warning',
                title: 'Ethereum Wallet Not Detected',
                message: 'Please ensure that an Ethereum wallet is installed.',
                buttonText: 'OK',
            });
        }
    };

    return (
        <div className="wallet-connect-container">
            <button
                onClick={handleConnectWallet}
                className="connect-wallet-btn"
            >
                Connect Wallet
            </button>

            {/* Conditionally render error message if wallet is invalid */}
            {!isWalletValid && (
                <div className="error-message" style={{ color: 'red', marginTop: '10px', fontWeight: 'bold' }}>
                    {errorMessage}
                </div>
            )}

            {/* Optionally show the connected wallet */}
            {walletAddress && (
                <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                    Connected Wallet: {walletAddress}
                </div>
            )}
        </div>
    );
};

export default ConnectWalletButton;
