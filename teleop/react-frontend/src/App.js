import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DeviceList from './components/DeviceList';
import Control from './Control';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DeviceList />} />
        <Route path="/control" element={<Control />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;







