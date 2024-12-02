import React, { useRef, useState } from 'react';
import Todo from './components/Todo/Todo';
import Timer from './components/Timer/Timer';
import Modal from './components/Modal/Modal';
import './App.css';
import type { TodoRef } from './components/Todo/Todo';
import type { TimerRef } from './components/Timer/Timer';

const App: React.FC = () => {
  const todoRef = useRef<TodoRef>(null);
  const timerRef = useRef<TimerRef>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClearRequest = () => {
    setIsModalOpen(true);
  };

  const handleConfirmClear = () => {
    todoRef.current?.resetAllData();
    timerRef.current?.clearData();
    setIsModalOpen(false);
  };

  return (
    <div className="app-container">
      <div className="todo-section">
        <Todo ref={todoRef} onClearRequest={handleClearRequest} />
      </div>
      <div className="timer-section">
        <Timer ref={timerRef} />
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmClear}
        title="确认清除"
      >
        <p>确定要清除所有数据吗？此操作不可恢复。</p>
      </Modal>
    </div>
  );
};

export default App;
