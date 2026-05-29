import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

/**
 * RoleBasedRoute - A component that enforces role-based access control
 * It checks if:
 * 1. User is authenticated (via ProtectedRoute)
 * 2. User has the required role to access the route
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string|string[]} props.allowedRoles - Role or array of roles allowed to access this route
 * @param {string} props.redirectPath - Path to redirect to if user doesn't have permission
 */
const RoleBasedRoute = ({ children, allowedRoles, redirectPath = '/' }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check user role against allowed roles
    const checkPermission = () => {
      const userRole = localStorage.getItem('role');
      
      // If allowedRoles is an array, check if user's role is in the array
      // Otherwise check if user's role matches the allowed role
      const hasRole = Array.isArray(allowedRoles) 
        ? allowedRoles.includes(userRole)
        : userRole === allowedRoles;
      
      setHasPermission(hasRole);
      setLoading(false);
    };
    
    checkPermission();
  }, [allowedRoles]);

  if (loading) {
    return <div>Checking permissions...</div>;
  }

  // Render the protected route with permission check
  return (
    <ProtectedRoute>
      {hasPermission ? children : <Navigate to={redirectPath} />}
    </ProtectedRoute>
  );
};

export default RoleBasedRoute; 