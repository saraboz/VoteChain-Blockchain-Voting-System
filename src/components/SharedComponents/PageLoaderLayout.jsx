// components/PageLoaderLayout.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const duration = 300;
const LoadingScreen = ({ timeout = duration }) => {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false); // New state to control fade-out

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true); // Start fading out
      // Set another timer to hide the loader after fade-out duration
      setTimeout(() => {
        setShow(false);
      }, duration); // Match this time with your fade-out duration
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 bg-gray-800 bg-opacity-100 flex items-center justify-center z-50 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
        <p className="text-white mt-4 text-xl font-medium">Loading...</p>
      </div>
    </div>
  );
};

const PageLoaderLayout = ({ children }) => {
  const location = useLocation();
  const [key, setKey] = useState(0); // Forces re-render of LoadingScreen

  useEffect(() => {
    // Trigger the loading screen on every route change
    setKey(prev => prev + 1);
  }, [location.pathname]);

  return (
    <>
      <LoadingScreen key={key} />
      {children}
    </>
  );
};

export default PageLoaderLayout;
