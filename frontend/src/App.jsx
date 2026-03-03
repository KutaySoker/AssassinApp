import React from 'react';

import TitleBar from './components/TitleBar';
import ScanPage from './pages/ScanPage';
import ScanReport from './components/ScanReport';
import './index.css';


function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <ScanPage />
      <TitleBar />
      <ScanReport />
    </div>
  );
}

export default App;