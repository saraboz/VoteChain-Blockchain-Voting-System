import React, { useState, useEffect } from 'react';

/**
 * CountdownTimer component that displays time remaining until endTime
 * @param {Object} props - Component props
 * @param {number|string} props.endTime - UNIX timestamp in seconds for when the countdown ends
 * @param {string} props.className - Optional CSS classes for styling
 * @param {boolean} props.showLabels - Whether to show day/hour/minute/second labels (default: true)
 * @param {boolean} props.compact - Whether to show in compact format (default: false)
 * @param {Function} props.onComplete - Optional callback when countdown reaches zero
 */
const CountdownTimer = ({ endTime, className = '', showLabels = true, compact = false, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });
  
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Ensure endTime is a number
    const endTimeNumber = parseInt(endTime);
    
    if (isNaN(endTimeNumber) || endTimeNumber <= 0) {
      console.error(`Invalid endTime value: ${endTime}`);
      setIsExpired(true);
      return;
    }
    
    console.log(`CountdownTimer: End time set to ${endTimeNumber} (${new Date(endTimeNumber * 1000).toLocaleString()})`);
    
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const difference = endTimeNumber - now;
      
      if (difference <= 0) {
        // Countdown expired
        console.log(`CountdownTimer: Countdown expired at ${now} (${new Date(now * 1000).toLocaleString()})`);
        setIsExpired(true);
        if (onComplete) onComplete();
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0
        };
      }
      
      // Calculate time parts
      const days = Math.floor(difference / (60 * 60 * 24));
      const hours = Math.floor((difference % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((difference % (60 * 60)) / 60);
      const seconds = Math.floor(difference % 60);
      
      return {
        days,
        hours,
        minutes,
        seconds,
        total: difference
      };
    };
    
    // Initial calculation
    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);
    
    // If already expired on initial calculation, call onComplete
    if (initialTimeLeft.total <= 0 && onComplete) {
      onComplete();
    }
    
    // Update every second
    const timer = setInterval(() => {
      const updatedTimeLeft = calculateTimeLeft();
      setTimeLeft(updatedTimeLeft);
      
      // Clear interval if expired
      if (updatedTimeLeft.total <= 0) {
        clearInterval(timer);
      }
    }, 1000);
    
    // Cleanup on unmount
    return () => clearInterval(timer);
  }, [endTime, onComplete]);
  
  if (isExpired) {
    return <span className={className}>Expired</span>;
  }
  
  if (compact) {
    return (
      <span className={className}>
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {timeLeft.hours.toString().padStart(2, '0')}:
        {timeLeft.minutes.toString().padStart(2, '0')}:
        {timeLeft.seconds.toString().padStart(2, '0')}
      </span>
    );
  }
  
  return (
    <div className={`flex space-x-2 ${className}`}>
      <div className="text-center">
        <span className="font-medium">{timeLeft.days}</span>
        {showLabels && <div className="text-xs text-gray-500">days</div>}
      </div>
      <div className="text-center">
        <span className="font-medium">{timeLeft.hours.toString().padStart(2, '0')}</span>
        {showLabels && <div className="text-xs text-gray-500">hrs</div>}
      </div>
      <div className="text-center">
        <span className="font-medium">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        {showLabels && <div className="text-xs text-gray-500">min</div>}
      </div>
      <div className="text-center">
        <span className="font-medium">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        {showLabels && <div className="text-xs text-gray-500">sec</div>}
      </div>
    </div>
  );
};

export default CountdownTimer; 