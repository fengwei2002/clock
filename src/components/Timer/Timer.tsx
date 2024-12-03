import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef, type ReactElement } from 'react';
import './Timer.css';

export interface TimerRef {
  clearData: () => void;
}

type TimerMode = 'countdown' | 'stopwatch';

interface TimerProps {}

const Timer = forwardRef<TimerRef, TimerProps>((_, ref): ReactElement => {
  const [mode, setMode] = useState<TimerMode>('countdown');
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
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
        if (minutes < 0 && Math.abs(minutes * 60) > prev) {
          return prev;
        }
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

  // 添加键盘事件处理函数
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // 检查是否有输入框在焦点中
    const activeElement = document.activeElement;
    const isInputFocused = activeElement instanceof HTMLInputElement || 
                          activeElement instanceof HTMLTextAreaElement;

    // 如果输入框在焦点中，不处理键盘事件
    if (isInputFocused) return;

    switch (event.code) {
      case 'Space':
        event.preventDefault(); // 防止页面滚动
        handleStartPause();
        break;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        handleReset();
        break;
    }
  }, [handleStartPause, handleReset]);

  // 添加键盘事件监听
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const handleTimeAdjust = (minutes: number) => {
    adjustTime(minutes);
  };

  return (
    <div 
      className="timer-container"
      tabIndex={0}
    >
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
          <button 
            onClick={() => handleTimeAdjust(-5)} 
            disabled={isRunning || time < 5 * 60}
            title="减少 5 分钟"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="time-value">5</span>
          </button>
          <button 
            onClick={() => handleTimeAdjust(-10)} 
            disabled={isRunning || time < 10 * 60}
            title="减少 10 分钟"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="time-value">10</span>
          </button>
          <button 
            onClick={() => handleTimeAdjust(-30)} 
            disabled={isRunning || time < 30 * 60}
            title="减少 30 分钟"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="time-value">30</span>
          </button>
        </div>

        <div 
          className={`timer-display ${
            isRunning ? 'running' : 'paused'
          }`}
        >
          {formatTime(time)}
        </div>

        <div className="time-adjust right">
          <button 
            onClick={() => handleTimeAdjust(5)} 
            disabled={isRunning}
            title="增加 5 分钟"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="time-value">5</span>
          </button>
          <button 
            onClick={() => handleTimeAdjust(10)} 
            disabled={isRunning}
            title="增加 10 分钟"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="time-value">10</span>
          </button>
          <button 
            onClick={() => handleTimeAdjust(30)} 
            disabled={isRunning}
            title="增加 30 分钟"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="time-value">30</span>
          </button>
        </div>
      </div>

      <div className="main-controls">
        <button 
          className={`control-btn ${isRunning ? 'pause' : 'start'}`}
          onClick={handleStartPause}
        >
          {isRunning ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
              </svg>
              <span>暂停</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" fill="currentColor"/>
              </svg>
              <span>开始</span>
            </>
          )}
        </button>
        <button 
          className="control-btn reset"
          onClick={handleReset}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
          </svg>
          <span>重置</span>
        </button>
      </div>
    </div>
  );
});

Timer.displayName = 'Timer';

export default Timer; 