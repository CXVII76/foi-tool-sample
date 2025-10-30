import React from 'react';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        {/* Use /logo.svg from public/ folder */}
        <img src="/logo.svg" className="App-logo" alt="logo" />
        <h1>FOI Redaction Tool – DevSecOps Demo</h1>
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <button
          style={{ padding: '10px 20px', fontSize: '16px', marginTop: '20px' }}
          onClick={() => alert('GitHub Flow works!')}
        >
          Click Me on Main (v2)
        </button>
      </header>
    </div>
  );
};

export default App;