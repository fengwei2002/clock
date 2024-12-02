import React, { forwardRef } from 'react';
import { useState, useEffect, useCallback, useRef, useImperativeHandle } from 'react';
import './Timer.css';
import Countdown from '../Countdown/Countdown';

type TimerMode = 'countdown' | 'stopwatch';

export interface TimerRef {
  clearData: () => void;
}

const Timer = forwardRef<TimerRef>((_, ref) => {
  const [mode, setMode] = useState<TimerMode>('countdown');
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<number>();

  useEffect(() => {
    let timer: number | undefined;

    if (isRunning) {
      timer = window.setInterval(() => {
        setTime(prev => {
          if (mode === 'countdown') {
            if (prev <= 0) {
              setIsRunning(false);
              return 0;
            }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
      timerRef.current = timer;
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isRunning, mode]);

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(Math.abs(seconds) / 60);
    const remainingSeconds = Math.abs(seconds) % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const handleStartPause = () => {
    if (mode === 'countdown' && time === 0 && !isRunning) {
      setTime(25 * 60);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(mode === 'countdown' ? 25 * 60 : 0);
  };

  const adjustTime = (minutes: number) => {
    if (!isRunning) {
      setTime(prev => {
        const newTime = prev + minutes * 60;
        return Math.max(0, newTime);
      });
    }
  };

  const toggleMode = () => {
    if (!isRunning) {
      setMode(prev => prev === 'countdown' ? 'stopwatch' : 'countdown');
      setTime(mode === 'stopwatch' ? 25 * 60 : 0);
    }
  };

  // 添加清除计时器数据的函数
  const clearTimerData = useCallback(() => {
    // 重置所有状态
    setTime(25 * 60);
    setIsRunning(false);
    setMode('countdown');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  // 在组件中暴露清除方法
  useImperativeHandle(ref, () => ({
    clearData: clearTimerData
  }));

  return (
    <div className="timer-section">
      <div className="timer-container">
        <div className="mode-switch">
          <button 
            className={`mode-btn ${mode === 'countdown' ? 'active' : ''}`}
            onClick={toggleMode}
            disabled={isRunning}
          >
            倒计时
          </button>
          <button 
            className={`mode-btn ${mode === 'stopwatch' ? 'active' : ''}`}
            onClick={toggleMode}
            disabled={isRunning}
          >
            正计时
          </button>
        </div>

        <div className="timer-display-section">
          <div className="time-adjust left">
            <button onClick={() => adjustTime(-5)} disabled={isRunning}>-5:00</button>
            <button onClick={() => adjustTime(-10)} disabled={isRunning}>-10:00</button>
            <button onClick={() => adjustTime(-30)} disabled={isRunning}>-30:00</button>
          </div>

          <div 
            className={`timer-display ${isHovered ? 'hover' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {formatTime(time)}
          </div>

          <div className="time-adjust right">
            <button onClick={() => adjustTime(5)} disabled={isRunning}>+5:00</button>
            <button onClick={() => adjustTime(10)} disabled={isRunning}>+10:00</button>
            <button onClick={() => adjustTime(30)} disabled={isRunning}>+30:00</button>
          </div>
        </div>

        <div className="main-controls">
          <button 
            className={`control-btn ${isRunning ? 'pause' : 'start'}`}
            onClick={handleStartPause}
          >
            {isRunning ? 'PAUSE' : 'START'}
          </button>
          <button 
            className="control-btn reset"
            onClick={handleReset}
          >
            RESET
          </button>
        </div>
      </div>
      <Countdown />
    </div>
  );
});

Timer.displayName = 'Timer';

export default Timer; 