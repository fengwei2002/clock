import React, { useState, useEffect, useCallback } from 'react';
import './Countdown.css';

interface CountdownProps {
  onComplete?: () => void;
}

const Countdown: React.FC<CountdownProps> = ({ onComplete }) => {
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const calculateDaysLeft = useCallback((target: Date) => {
    const now = new Date();
    // 设置时间为当天的开始（00:00:00）
    now.setHours(0, 0, 0, 0);
    const targetDay = new Date(target);
    targetDay.setHours(0, 0, 0, 0);
    
    const difference = targetDay.getTime() - now.getTime();
    const days = Math.ceil(difference / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      onComplete?.();
      setTargetDate(null);
      setDaysLeft(null);
      return;
    }

    setDaysLeft(days);
  }, [onComplete]);

  useEffect(() => {
    if (!targetDate) return;

    calculateDaysLeft(targetDate);
    // 每天凌晨更新一次
    const timer = setInterval(() => {
      calculateDaysLeft(targetDate);
    }, 1000 * 60 * 60); // 每小时检查一次

    return () => clearInterval(timer);
  }, [targetDate, calculateDaysLeft]);

  const handleDateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dateStr = formData.get('date') as string;

    if (dateStr) {
      const target = new Date(dateStr);
      setTargetDate(target);
      calculateDaysLeft(target);
    }
  };

  return (
    <div className="countdown-container">
      <h3 className="countdown-title">倒数日</h3>
      
      <form onSubmit={handleDateSubmit} className="countdown-form">
        <div className="input-group">
          <input
            type="date"
            name="date"
            required
            min={new Date().toISOString().split('T')[0]}
            className="countdown-input"
          />
          <button type="submit" className="countdown-button">
            开始倒数
          </button>
        </div>
      </form>

      {daysLeft !== null && (
        <div className="countdown-display">
          <div className="countdown-item">
            <span className="countdown-value">{daysLeft}</span>
            <span className="countdown-label">天</span>
          </div>
        </div>
      )}

      {targetDate && (
        <button 
          className="countdown-reset" 
          onClick={() => {
            setTargetDate(null);
            setDaysLeft(null);
          }}
        >
          重置
        </button>
      )}
    </div>
  );
};

export default Countdown; 