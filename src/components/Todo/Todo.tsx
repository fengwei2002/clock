import { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { pinyin } from 'pinyin-pro';
import './Todo.css';
import Modal from '../Modal/Modal';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
}

type TodoHistory = {
  todos: TodoItem[];
  timestamp: number;
} | null;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
}

const createParticles = (x: number, y: number, color: string): Particle[] => {
  const particles: Particle[] = [];
  const particleCount = 10;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount;
    const velocity = 2 + Math.random() * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: 4 + Math.random() * 4,
      color,
      opacity: 1
    });
  }

  return particles;
};

interface TodoProps {
  onClearRequest: () => void;
}

interface TodoRef {
  resetAllData: () => void;
}

// 添加排序类型
type SortType = 'time' | 'time-reverse' | 'name' | 'name-reverse' | 'none';

// 添加一个简单的获取拼音首字母的函数
const getFirstLetter = (str: string): string => {
  const pinyinMap: { [key: string]: string } = {
    '阿': 'a', '把': 'b', '从': 'c', '的': 'd', '额': 'e',
    '': 'f', '个': 'g', '好': 'h', '和': 'h', '几': 'j',
    '看': 'k', '了': 'l', '吗': 'm', '你': 'n', '哦': 'o',
    '批': 'p', '去': 'q', '人': 'r', '是': 's', '他': 't',
    '我': 'w', '想': 'x', '要': 'y', '在': 'z'
    // ... 可以根据需要添加更多映射
  };

  const firstChar = str.charAt(0);
  // 如果是英文字母，直接返回
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toLowerCase();
  }
  // 如果是中文，查找映射表
  return pinyinMap[firstChar] || firstChar;
};

// 添加时间格式化函数
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year} 年 ${month} 月 ${day} 日 ${hours}:${minutes}:${seconds}`;
};

const Todo = forwardRef<TodoRef, TodoProps>(({ onClearRequest }, ref) => {
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem('todos');
    const parsedTodos = saved ? JSON.parse(saved) : [];
    // 确保加载时按最新时间排序
    return parsedTodos.sort((a: TodoItem, b: TodoItem) => b.createdAt - a.createdAt);
  });
  const [input, setInput] = useState('');
  const [deletedTodos, setDeletedTodos] = useState<TodoItem[]>([]);
  const [deletedCompletedTodos, setDeletedCompletedTodos] = useState<TodoItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [undoStack, setUndoStack] = useState<TodoItem[][]>([]);
  const [redoStack, setRedoStack] = useState<TodoItem[][]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sortType, setSortType] = useState<SortType>('time-reverse');
  const [timeSort, setTimeSort] = useState<'asc' | 'desc'>('desc');
  const [nameSort, setNameSort] = useState<'asc' | 'desc'>('asc');
  const [lastState, setLastState] = useState<TodoHistory>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 保存到本地存储
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  // 修改排序函数
  const sortTodos = useCallback((todos: TodoItem[], type: SortType) => {
    const sortedTodos = [...todos];
    switch (type) {
      case 'time':
        return sortedTodos.sort((a, b) => a.createdAt - b.createdAt);
      case 'time-reverse':
        return sortedTodos.sort((a, b) => b.createdAt - a.createdAt);
      case 'name':
        return sortedTodos.sort((a, b) => {
          const pinyinA = pinyin(a.text, { toneType: 'none', type: 'array' });
          const pinyinB = pinyin(b.text, { toneType: 'none', type: 'array' });
          
          const minLength = Math.min(pinyinA.length, pinyinB.length);
          for (let i = 0; i < minLength; i++) {
            const compareResult = pinyinA[i].localeCompare(pinyinB[i]);
            if (compareResult !== 0) {
              return compareResult;
            }
          }
          return pinyinA.length - pinyinB.length;
        });
      case 'name-reverse':
        return sortedTodos.sort((a, b) => {
          const pinyinA = pinyin(a.text, { toneType: 'none', type: 'array' });
          const pinyinB = pinyin(b.text, { toneType: 'none', type: 'array' });
          
          const minLength = Math.min(pinyinA.length, pinyinB.length);
          for (let i = 0; i < minLength; i++) {
            const compareResult = pinyinB[i].localeCompare(pinyinA[i]);
            if (compareResult !== 0) {
              return compareResult;
            }
          }
          return pinyinB.length - pinyinA.length;
        });
      default:
        return sortedTodos;
    }
  }, []);

  // 修改 updateTodos 函数
  const updateTodos = useCallback((newTodos: TodoItem[], shouldResetStates = true) => {
    setUndoStack(stack => [...stack, todos]);
    setRedoStack([]);
    
    const sortedTodos = sortTodos(newTodos, sortType);
    setTodos(sortedTodos);

    if (shouldResetStates) {
      setDeletedTodos([]);
      setDeletedCompletedTodos([]);
    }
  }, [todos, sortType, sortTodos]);

  // 添加排序切换处理函数
  const handleSortChange = (type: SortType) => {
    setSortType(type);
    updateTodos(todos, false);
  };

  // 修改撤销功能
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const prevState = undoStack[undoStack.length - 1];
      const newUndoStack = undoStack.slice(0, -1);
      
      setRedoStack(stack => [...stack, todos]);
      setTodos(prevState);
      setUndoStack(newUndoStack);

      // 重新计算删除状态
      const currentCompleted = todos.filter(todo => todo.completed);
      const prevCompleted = prevState.filter(todo => todo.completed);

      // 处理全部删除/还原的情况
      if (todos.length === 0 && prevState.length > 0) {
        // 从空状态恢复到有内容，清除删除状态
        setDeletedTodos([]);
      } else if (todos.length > 0 && prevState.length === 0) {
        // 从有内容变成空，设置删除状态
        setDeletedTodos(todos);
      }

      // 处理已完成项的删除/还原
      if (currentCompleted.length === 0 && prevCompleted.length > 0) {
        // 从无已完成恢复到有已完成，清除已完成删除状态
        setDeletedCompletedTodos([]);
      } else if (currentCompleted.length > 0 && prevCompleted.length === 0) {
        // 从有已完成变成无已完成，设置已完成删除状态
        setDeletedCompletedTodos(currentCompleted);
      }
    }
  }, [todos, undoStack]);

  // 修改重做功能，使用相同的逻辑
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      const newRedoStack = redoStack.slice(0, -1);
      
      setUndoStack(stack => [...stack, todos]);
      setTodos(nextState);
      setRedoStack(newRedoStack);

      // 重新算删除状态
      const currentCompleted = todos.filter(todo => todo.completed);
      const nextCompleted = nextState.filter(todo => todo.completed);

      // 处理全部删除/还原的情况
      if (todos.length === 0 && nextState.length > 0) {
        // 从空状态恢复到有内容，清除删除状态
        setDeletedTodos([]);
      } else if (todos.length > 0 && nextState.length === 0) {
        // 从有内容变成空，设置删除状态
        setDeletedTodos(todos);
      }

      // 处理已完成项的删除/还原
      if (currentCompleted.length === 0 && nextCompleted.length > 0) {
        // 从无已完成恢复到有已完成，清除已完成删除状态
        setDeletedCompletedTodos([]);
      } else if (currentCompleted.length > 0 && nextCompleted.length === 0) {
        // 从有已完成变成无已完成，设置已完成删除状态
        setDeletedCompletedTodos(currentCompleted);
      }
    }
  }, [todos, redoStack]);

  const addTodo = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const newTodo = {
        id: Date.now(),
        text: input.trim(),
        completed: false,
        createdAt: Date.now()
      };
      
      const newTodos = [...todos, newTodo];
      updateTodos(newTodos);
      setInput('');
      inputRef.current?.focus();
    }
  }, [input, todos, updateTodos]);

  const startEditing = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (editingId && editText.trim()) {
      updateTodos(todos.map(todo =>
        todo.id === editingId ? { ...todo, text: editText.trim() } : todo
      ));
    }
    setEditingId(null);
    setEditText('');
  };

  const toggleTodo = (id: number) => {
    updateTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    const todoElement = document.querySelector(`[data-id="${id}"]`);
    if (todoElement) {
      const rect = todoElement.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      setParticles(prev => [...prev, ...createParticles(x, y, 'rgba(44, 62, 80, 0.8)')]);
      updateTodos(todos.filter(todo => todo.id !== id), false);
    }
  };

  // 完成所有/取消完成所有
  const toggleAllComplete = () => {
    const allCompleted = todos.every(todo => todo.completed);
    updateTodos(todos.map(todo => ({
      ...todo,
      completed: !allCompleted
    })));
  };

  // 删除所有/还原所有
  const toggleDeleteAll = () => {
    if (todos.length === 0 && deletedTodos.length > 0) {
      // 还原所有
      updateTodos(deletedTodos, false);
      setDeletedTodos([]);
    } else {
      // 删除所有
      setDeletedTodos(todos);
      updateTodos([], false);
    }
  };

  // 删除已完成/还原已完成
  const toggleDeleteCompleted = () => {
    const completedTodos = todos.filter(todo => todo.completed);
    if (completedTodos.length === 0 && deletedCompletedTodos.length > 0) {
      // 还原已完成
      updateTodos([...todos, ...deletedCompletedTodos], false);
      setDeletedCompletedTodos([]);
    } else {
      // 删除已完成
      setDeletedCompletedTodos(completedTodos);
      updateTodos(todos.filter(todo => !todo.completed), false);
    }
  };

  // 计算按钮状态
  const allCompleted = todos.length > 0 && todos.every(todo => todo.completed);
  const hasCompletedTodos = todos.some(todo => todo.completed);
  const hasDeletedTodos = deletedTodos.length > 0;
  const hasDeletedCompletedTodos = deletedCompletedTodos.length > 0;

  // 计算统计信息
  const stats = {
    total: todos.length,
    completed: todos.filter(todo => todo.completed).length,
    active: todos.filter(todo => !todo.completed).length
  };

  useEffect(() => {
    if (particles.length > 0 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        setParticles(prevParticles => {
          const newParticles = prevParticles
            .map(p => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              vy: p.vy + 0.1,
              opacity: p.opacity - 0.02
            }))
            .filter(p => p.opacity > 0);

          // 绘制粒子
          newParticles.forEach(p => {
            if (!ctx) return;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(44, 62, 80, ${p.opacity})`;
            ctx.fill();
          });

          return newParticles;
        });

        if (particles.length > 0) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }
  }, [particles]);

  // 暴露重置方法给父组件
  useImperativeHandle(ref, () => ({
    resetAllData: () => {
      setTodos([]);
      setInput('');
      setDeletedTodos([]);
      setDeletedCompletedTodos([]);
      setEditingId(null);
      setEditText('');
      setUndoStack([]);
      setRedoStack([]);
      setParticles([]);
      // 重置排序状态
      setSortType('time-reverse');
      setTimeSort('desc');
      setNameSort('asc');
    }
  }));

  // 添加处理回车键的函数
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        const newTodo = {
          id: Date.now(),
          text: input.trim(),
          completed: false,
          createdAt: Date.now()
        };
        
        const newTodos = [...todos, newTodo];
        updateTodos(newTodos);
        setInput('');
        inputRef.current?.focus();
      }
    }
  };

  // 修改时间排序处理函数
  const handleTimeSort = () => {
    const newSort = timeSort === 'asc' ? 'desc' : 'asc';
    setTimeSort(newSort);
    setSortType(newSort === 'asc' ? 'time' : 'time-reverse');
    const sortedTodos = sortTodos(todos, newSort === 'asc' ? 'time' : 'time-reverse');
    setTodos(sortedTodos);
  };

  // 添加标题排序处理函数
  const handleNameSort = () => {
    const newSort = nameSort === 'asc' ? 'desc' : 'asc';
    setNameSort(newSort);
    setSortType(newSort === 'asc' ? 'name' : 'name-reverse');
    const sortedTodos = sortTodos(todos, newSort === 'asc' ? 'name' : 'name-reverse');
    setTodos(sortedTodos);
  };

  useEffect(() => {
    if (todos.length > 0) {
      setLastState({
        todos: [...todos],
        timestamp: Date.now()
      });
    }
  }, [todos]);

  // 在 Todo 组件内添加 SVG 图标组件
  const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const DeleteIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );

  const ClearIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );

  const SortIcon = ({ direction }: { direction: 'asc' | 'desc' }) => (
    <svg 
      width="12" 
      height="12" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ 
        transform: direction === 'desc' ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.3s ease'
      }}
    >
      <path d="M12 20V4" />
      <path d="M5 11l7-7 7 7" />
    </svg>
  );

  const UndoIcon = () => (
    <svg 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="9,14 4,9 9,4" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  );

  const RedoIcon = () => (
    <svg 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="15,14 20,9 15,4" />
      <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
    </svg>
  );

  useEffect(() => {
    // 页面加载时自动聚焦
    inputRef.current?.focus();
  }, []); // 空依赖数组意味着只在组件挂载时执行

  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // 如果当前焦点不在输入框或编辑框上，且按下了回车键
      const activeElement = document.activeElement;
      const isInputActive = activeElement instanceof HTMLInputElement || 
                           activeElement instanceof HTMLTextAreaElement;
      
      if (!isInputActive && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    // 添加事件监听器
    document.addEventListener('keypress', handleGlobalKeyPress);

    // 清理函数
    return () => {
      document.removeEventListener('keypress', handleGlobalKeyPress);
    };
  }, []); // 空依赖数组，只在组件挂载和卸载时执行

  return (
    <div className="todo-container">
      <div className="todo-header">
        <div className="header-main">
          <button
            className="clear-all-btn"
            onClick={onClearRequest}
            title="清除所有数据"
          >
            <ClearIcon />
          </button>
          <div className="todo-stats">
            <span>总计: {stats.total}</span>
            <span>已完成: {stats.completed}</span>
            <span>未完成: {stats.active}</span>
          </div>
        </div>
        <div className="input-section">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入框。"
            className="todo-input"
          />
          <button 
            type="button" 
            className="todo-add-btn" 
            onClick={() => handleKeyPress({ key: 'Enter', shiftKey: false } as React.KeyboardEvent<HTMLInputElement>)}
          >
            添加
          </button>
        </div>
      </div>

      <div className="todo-actions">
        <button
          type="button"
          className={`action-btn ${allCompleted ? 'active' : ''}`}
          onClick={toggleAllComplete}
          disabled={todos.length === 0}
        >
          {allCompleted ? '还原所有' : '完成所有'}
        </button>
        <button
          type="button"
          className={`action-btn ${hasDeletedTodos ? 'restore' : ''}`}
          onClick={toggleDeleteAll}
        >
          {hasDeletedTodos ? '恢复所有' : '删除所有'}
        </button>
        <button
          type="button"
          className={`action-btn ${hasDeletedCompletedTodos ? 'restore' : ''}`}
          onClick={toggleDeleteCompleted}
          disabled={!hasCompletedTodos && !hasDeletedCompletedTodos}
        >
          {hasDeletedCompletedTodos ? '恢复已完成' : '删除已完成'}
        </button>
        <button
          type="button"
          className="action-btn time-sort"
          onClick={handleTimeSort}
          title={timeSort === 'asc' ? '当前按时间升序' : '当前按时间降序'}
        >
          时间
          <SortIcon direction={timeSort} />
        </button>
        <button
          type="button"
          className="action-btn name-sort"
          onClick={handleNameSort}
          title={nameSort === 'asc' ? '当前按标题升序' : '当前按标题降序'}
        >
          标题
          <SortIcon direction={nameSort} />
        </button>
        <button
          type="button"
          className="action-btn undo-btn"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          title="撤销"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="action-btn redo-btn"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          title="恢复"
        >
          <RedoIcon />
        </button>
      </div>

      <ul className="todo-list">
        {todos.map(todo => (
          <li 
            key={todo.id} 
            className={`todo-item ${todo.completed ? 'completed-item' : ''}`}
            data-id={todo.id}
          >
            {editingId === todo.id ? (
              <div className="edit-form">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={saveEdit}
                  onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                  autoFocus
                  className="edit-input"
                />
              </div>
            ) : (
              <label className="todo-label">
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                  />
                  <span className="custom-checkbox"></span>
                </div>
                <div className="todo-content">
                  <div className="todo-text">
                    <span 
                      className={todo.completed ? 'completed' : ''}
                      onDoubleClick={() => !todo.completed && startEditing(todo)}
                    >
                      {todo.text}
                    </span>
                  </div>
                  <span className="todo-timestamp">
                    {formatTimestamp(todo.createdAt)}
                  </span>
                </div>
              </label>
            )}
            <div className="todo-actions">
              {!todo.completed && !editingId && (
                <button
                  onClick={() => startEditing(todo)}
                  className="todo-action-btn todo-edit-btn"
                  title="编辑"
                >
                  <EditIcon />
                </button>
              )}
              <button
                onClick={() => deleteTodo(todo.id)}
                className="todo-action-btn todo-delete-btn"
                title="删除"
              >
                <DeleteIcon />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <canvas
        ref={canvasRef}
        className="particles-canvas"
        width={window.innerWidth}
        height={window.innerHeight}
      />
    </div>
  );
});

Todo.displayName = 'Todo';

export default Todo; 