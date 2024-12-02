import React from 'react';

interface ClearProps {
  onClear: () => void;
}

const Clear: React.FC<ClearProps> = ({ onClear }) => {
  return (
    <button className="clear-button" onClick={onClear}>
      Clear All
    </button>
  );
};

export default Clear;
