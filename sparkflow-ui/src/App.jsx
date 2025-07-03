// src/App.jsx
import React from 'react';
import './index.css';         
import GenForm from './components/GenForm';

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-2xl p-4">
        <GenForm />
      </div>
    </div>
  );
}

export default App;

