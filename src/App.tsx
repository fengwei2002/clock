import React, { useState } from 'react';
import Todo from './components/Todo/Todo';
import Timer from './components/Timer/Timer';
import Calendar from './components/Calendar/Calendar';
import Countdown from './components/Countdown/Countdown';
import Clear from './components/Clear/Clear';
import './App.css';

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClearRequest = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="app-container">
      <div className="main-section">
        <Todo onClearRequest={handleClearRequest} />
      </div>
      
      <div className="right-section">
        <div className="timer-section">
          <Timer />
        </div>
        <div className="bottom-widgets">
          <div className="countdown-section">
            <Countdown />
          </div>
          <div className="calendar-section">
            <Calendar />
          </div>
        </div>
      </div>

      <Clear
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default App;
