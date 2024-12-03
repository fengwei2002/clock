import React, { useCallback } from 'react';
import Modal from '../Modal/Modal';
import './Clear.css';

interface ClearProps {
  isOpen: boolean;
  onClose: () => void;
}

const Clear: React.FC<ClearProps> = ({ isOpen, onClose }) => {
  // 清除所有数据并关闭 Modal
  const handleConfirm = useCallback(() => {
    // 清除所有本地存储数据
    localStorage.removeItem('todos');
    localStorage.removeItem('timerData');
    localStorage.removeItem('countdownData');
    
    // 关闭 Modal
    onClose();
    
    // 刷新页面以重置所有状态
    window.location.reload();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="清除所有数据"
    >
      <div className="clear-content">
        <div className="clear-icon">
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#e74c3c" 
            strokeWidth="2"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </div>
        <p className="clear-message">确定要清除所有数据吗？此操作不可恢复。</p>
        <ul className="clear-details">
          <li>待办事项列表</li>
          <li>计时器设置</li>
          <li>倒数日数据</li>
        </ul>
      </div>
    </Modal>
  );
};

export default Clear;
