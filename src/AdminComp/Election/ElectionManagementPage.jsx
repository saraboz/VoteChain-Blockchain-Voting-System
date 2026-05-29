import React from 'react';
import ElectionManagement from '../../components/ElectionManagement';
import Header from '../../components/SharedComponents/Header';
import Footer from '../../components/SharedComponents/Footer';

const ElectionManagementPage = () => {
  return (
    <div>
      <Header />
      <ElectionManagement />
      <Footer />
    </div>
  );
};

export default ElectionManagementPage; 