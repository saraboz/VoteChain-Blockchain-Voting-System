import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showModalAlert } from '../components/SharedComponents/Alert';

// TODO: I think you should remove this file, it doesn't seem to be doing much of nothing, since the wallet is connected with wassim's code.
// Try removing it and test to see what happens.
// After more consideration, it's only used in the header, it was implemented there for testing purposes, i think u can safely remove it.


const ConnectWalletButton = () => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [isWalletLinked, setIsWalletLinked] = useState(false);

    useEffect(() => {
        // Fetch linked wallet address from the backend
        const checkLinkedWallet = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const response = await axios.get('http://localhost:5000/api/users/check-wallet', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.walletAddress) {
                    setWalletAddress(response.data.walletAddress);
                    setIsWalletLinked(true);
                } else {
                    setWalletAddress(null);
                    setIsWalletLinked(false);
                }
            } catch (err) {
                console.error('Error fetching linked wallet:', err);
            }
        };

        checkLinkedWallet();
    }, []);

    const connectWallet = async () => {
        const token = localStorage.getItem('token');

        if (!window.ethereum) {
           showModalAlert({
                type: 'error',
                title: 'MetaMask Not Installed',
                message: 'Please install MetaMask to connect your wallet.',
                buttonText: 'Install MetaMask',
            });
            return;
        }

        if (isWalletLinked) {
            showModalAlert({
                type: 'success',
                title: 'Wallet Already Linked',
                message: 'Your wallet is already linked to your account.',
                buttonText: 'OK',
            });
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];

            // Save to localStorage and update UI
            localStorage.setItem('walletAddress', address);
            setWalletAddress(address);

            if (!token) {
                showModalAlert({
                type: 'warning',
                title: 'Wallet Connected, But..',
                message: 'but not linked to an account (no token found).',
                buttonText: 'OK',
            });
                return;
            }

            // Link wallet to the user's account in the backend
            try {
                const res = await axios.post(
                    'http://localhost:5000/api/users/link-wallet',
                    { walletAddress: address },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                showModalAlert({
                    type: 'success',
                    title: 'Wallet Linked Successfully',
                    message: res.data.message || 'Your wallet has been linked successfully!',
                    buttonText: 'OK',
                });
                setIsWalletLinked(true);

            } catch (err) {
                const serverMessage = err.response?.data?.message;

                if (serverMessage === 'Wallet already linked') {
                    showModalAlert({
                        type: 'info',
                        title: 'Wallet Already Linked',
                        message: 'Your wallet is already linked to your account.',
                        buttonText: 'OK',
                    });
                } else if (serverMessage === 'User not found') {
                    showModalAlert({
                        type: 'error',
                        title: 'User Not Found',
                        message: 'User not found. Please make sure you are logged in.',
                        buttonText: 'OK',
                    });
                } else if (serverMessage === 'Invalid or expired token') {
                    showModalAlert({
                        type: 'error',
                        title: 'Session Expired',
                        message: 'Your session has expired. Please log in again.',
                        buttonText: 'OK',
                    });
                } else {
                    showModalAlert({
                        type: 'error',
                        title: 'Wallet Linking Failed',
                        message: 'Something went wrong linking your wallet. Please try again.',
                        buttonText: 'OK',
                    });
                }
            }

        } catch (err) {
            console.error('Wallet connection error:', err);
            showModalAlert({
                type: 'error',
                title: 'Wallet Connection Failed',
                message: 'Failed to connect wallet. Please try again.',
                buttonText: 'Try Again',
            });
        }
    };

    const getShortAddress = (addr) => {
        return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
    };

    return (
        <div className="flex flex-col items-start">
            {isWalletLinked ? (
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md text-sm font-medium shadow-sm">
                    Needed Wallet: {getShortAddress(walletAddress)}
                </div>
            ) : (
                <button
                    onClick={connectWallet}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition"
                >
                    Connect Wallet
                </button>
            )}
        </div>
    );
};

export default ConnectWalletButton;
