// src/utils/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // ✅ use curly braces here!

const PrivateRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/Login" replace />;
  }

  let decoded;
  try {
    decoded = jwtDecode(token);
  } catch (err) {
    console.error("Failed to decode token", err);
    return <Navigate to="/Login" replace />;
  }

  const userRole = decoded?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
