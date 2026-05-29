// React Router imports
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Auth Context
import { AuthProvider } from './context/AuthContext.jsx';

// Components
import Header from './components/SharedComponents/Header';
import MainSection from './components/HomePageComp/MainSection';
import ServSec from './components/HomePageComp/ServiceSection';
import Footer from './components/SharedComponents/Footer';
import XP from './components/HomePageComp/Experience';
import WhoAreU from './components/HomePageComp/WhoRU';
import BlockchainRegistration from './components/BlockchainRegistration';
import ProtectedRoute from './components/SharedComponents/ProtectedRoute';
import RoleBasedRoute from './components/SharedComponents/RoleBasedRoute';
import PageLoaderLayout from './components/SharedComponents/PageLoaderLayout';

// Login and Registration components
import Login2 from './LoginPageComp/LoginSection2';
import Register from './LoginPageComp/SignUp';
import Gov from './LoginPageComp/govWeb';

// Candidate-related components
// import Preview from './Candidate/preview';
// import CanDet from './Candidate/Candidate';

// Voter-related components
import ElectionDetail from './Voter/Election/ElectionDetail.jsx';
import VoterDash from './Voter/Election/VoterDashboard.jsx';
import VotePage from './Voter/Election/VotePage.jsx';
import DecisionList from './Voter/Decision/DecisionList.jsx';
import DecisionDetail from './Voter/Decision/DecisionDetail.jsx';

// Admin components
import AdminDashboard from './AdminComp/Election/adminDashboard';
import CreateDecision from './AdminComp/Decision/CreateDecision';

// Other pages and utilities
import ElectionManagementPage from './AdminComp/Election/ElectionManagementPage';
import WalletMonitor from './utils/WalletMonitor';

const Home = () => {
  return (
    <div className="App">
      {/* <PageLoaderLayout> */}
      <Header logoLeftPosition={30} />
      <MainSection />
      <ServSec />
      <XP />
      <WhoAreU />
      <Footer logoLeftPosition={30} />
      {/* </PageLoaderLayout> */}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App" >
          {/* WalletMonitor component for application-wide wallet address validation */}
          <WalletMonitor />
          <PageLoaderLayout>
            <Routes>
              <Route exact path="/" element={<Home />} />
              <Route exact path="/Login2" element={<Login2 />} />
              <Route exact path="/Login" element={<Login2 />} /> {/* Redirect old Login path to Login2 */}
              <Route exact path="/Register" element={<Register />} />
              {/* <Route exact path="/preview" element={<Preview />} />
              <Route exact path="/Candidate/:id" element={<CanDet />} /> */}

              {/* Admin protected routes - require authenticated user with admin role */}
              <Route exact path="/adminDashboard" element={
                <RoleBasedRoute allowedRoles="admin" redirectPath="/voterDashboard">
                  <AdminDashboard />
                </RoleBasedRoute>
              } />

              <Route exact path="/manage-countries" element={
                <RoleBasedRoute allowedRoles="admin" redirectPath="/voterDashboard">
                  <ElectionManagementPage />
                </RoleBasedRoute>
              } />

              {/* Decision Making Routes */}
              <Route exact path="/decisions" element={
                <ProtectedRoute>
                  <DecisionList />
                </ProtectedRoute>
              } />

              <Route exact path="/decisions/:decisionId" element={
                <ProtectedRoute>
                  <DecisionDetail />
                </ProtectedRoute>
              } />

              <Route exact path="/create-decision" element={
                <RoleBasedRoute allowedRoles="admin" redirectPath="/decisions">
                  <CreateDecision />
                </RoleBasedRoute>
              } />

              {/* Protected routes for all authenticated users */}
              <Route exact path="/voterDashboard" element={
                <ProtectedRoute>
                  <VoterDash />
                </ProtectedRoute>
              } />

              <Route exact path="/vote/:id" element={
                <ProtectedRoute>
                  <VotePage />
                </ProtectedRoute>
              } />

              <Route exact path="/gov" element={
                //<RoleBasedRoute allowedRoles="user" redirectPath="/voterDashboard">
                  <Gov />
              //</RoleBasedRoute>
              } />

              <Route exact path="/ElectionDetail" element={
                <ProtectedRoute>
                  <ElectionDetail />
                </ProtectedRoute>
              } />

              <Route exact path="/blockchain-test" element={
                <ProtectedRoute>
                  <BlockchainRegistration />
                </ProtectedRoute>
              } />
            </Routes>
          </PageLoaderLayout>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;