import { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef, memo } from 'react';
import { pinyin } from 'pinyin-pro';
import './Todo.css';
import { FixedSizeList as List } from 'react-window';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface TodoProps {
  onClearRequest: () => void;
}

export interface TodoRef {
  resetAllData: () => void;
}

// 添加排序类型
type SortType = 'time' | 'time-reverse' | 'name' | 'name-reverse' | 'none';

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

// 添加一个工具函数来确保列表唯一性
const ensureUniqueTodos = (todos: TodoItem[]): TodoItem[] => {
  const uniqueMap = new Map<number, TodoItem>();
  todos.forEach(todo => uniqueMap.set(todo.id, todo));
  return Array.from(uniqueMap.values());
};

// 修改常量配置
const MAX_TODOS_LENGTH = 100;   // 保持不变

// 添加常量
const MAX_HISTORY_LENGTH = 10;  // 历史记录最大长度

// 添加 TodoItemProps 接口定义
interface TodoItemProps {
  todo: TodoItem;
  editingId: number | null;
  deletingIds: Set<number>;
  onDelete: (id: number) => void;
  onEdit: (todo: TodoItem) => void;
  onToggle: (id: number) => void;
  onSaveEdit: () => void;
  style?: React.CSSProperties;
}

// 定义动作类型
type ActionType = 
  | 'ADD'           // 添加待办
  | 'DELETE'        // 删除单个
  | 'EDIT'          // 编辑内容
  | 'TOGGLE'        // 切换完成状态
  | 'COMPLETE_ALL'  // 完成所有
  | 'DELETE_ALL'    // 删除所有
  | 'RESTORE_ALL'   // 恢复所有
  | 'DELETE_COMPLETED'  // 删除已完成
  | 'RESTORE_COMPLETED' // 恢复已完成
  | 'SORT';            // 排序

// 定义历史记录项的接口
interface HistoryItem {
  type: ActionType;
  todos: TodoItem[];
  deletedTodos: TodoItem[];
  deletedCompletedTodos: TodoItem[];
  timestamp: number;
}

const Todo = forwardRef<TodoRef, TodoProps>(({ onClearRequest }, ref) => {
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem('todos');
    const parsedTodos = saved ? JSON.parse(saved) : [];
    // 确保加载时最新时间排序
    return parsedTodos.sort((a: TodoItem, b: TodoItem) => b.createdAt - a.createdAt);
  });
  const [input, setInput] = useState('');
  const [deletedTodos, setDeletedTodos] = useState<TodoItem[]>([]);
  
  const [deletedCompletedTodos, setDeletedCompletedTodos] = useState<TodoItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [sortType, setSortType] = useState<SortType>('time-reverse');
  const [timeSort, setTimeSort] = useState<'asc' | 'desc'>('desc');
  const [nameSort, setNameSort] = useState<'asc' | 'desc'>('asc');
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  // 在组件内添加历史记录状态
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

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
          return pinyinA[0].localeCompare(pinyinB[0]);
        });
      case 'name-reverse':
        return sortedTodos.sort((a, b) => {
          const pinyinA = pinyin(a.text, { toneType: 'none', type: 'array' });
          const pinyinB = pinyin(b.text, { toneType: 'none', type: 'array' });
          return pinyinB[0].localeCompare(pinyinA[0]);
        });
      default:
        return sortedTodos;
    }
  }, []);

  // 先声明 addHistory
  const addHistory = useCallback((type: ActionType, newTodos: TodoItem[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      const historyItem: HistoryItem = {
        type,
        todos: newTodos,
        deletedTodos,
        deletedCompletedTodos,
        timestamp: Date.now()
      };
      const updatedHistory = [...newHistory, historyItem].slice(-MAX_HISTORY_LENGTH);
      setCurrentIndex(updatedHistory.length - 1);
      return updatedHistory;
    });
  }, [currentIndex, deletedTodos, deletedCompletedTodos]);

  // 然后再声明 updateTodos
  const updateTodos = useCallback((newTodos: TodoItem[], type: ActionType = 'ADD', shouldResetStates = true) => {
    if (newTodos.length > MAX_TODOS_LENGTH) {
      alert(`待办事项数量不能超过 ${MAX_TODOS_LENGTH} 条`);
      return;
    }

    const uniqueTodos = ensureUniqueTodos(newTodos);
    const sortedTodos = sortTodos(uniqueTodos, sortType);
    
    // 添加新的历史记录
    addHistory(type, sortedTodos);
    
    setTodos(sortedTodos);

    if (shouldResetStates) {
      setDeletedTodos([]);
      setDeletedCompletedTodos([]);
    }
  }, [sortType, sortTodos, addHistory]);

  // 修改撤销功能
  const handleUndo = useCallback(() => {
    if (currentIndex > 0) {
      const prevItem = history[currentIndex - 1];
      setTodos(prevItem.todos);
      setDeletedTodos(prevItem.deletedTodos);
      setDeletedCompletedTodos(prevItem.deletedCompletedTodos);
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, history]);

  // 修改重做功能
  const handleRedo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const nextItem = history[currentIndex + 1];
      setTodos(nextItem.todos);
      setDeletedTodos(nextItem.deletedTodos);
      setDeletedCompletedTodos(nextItem.deletedCompletedTodos);
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, history]);

  // 修改创建新待办事项的函数
  const createNewTodo = useCallback((text: string) => {
    if (text.trim()) {
      // 检查是否达到待办事项数量
      if (todos.length >= MAX_TODOS_LENGTH) {
        alert(`待办事项数量已达到上限 ${MAX_TODOS_LENGTH} 条`);
        return;
      }

      const newTodo = {
        id: Date.now(),
        text: text.trim(),
        completed: false,
        createdAt: Date.now()
      };
      
      const newTodos = [...todos, newTodo];
      setTodos(newTodos);
      addHistory('ADD', newTodos);
      setInput('');
      inputRef.current?.focus();
    }
  }, [todos, addHistory]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      createNewTodo(input);
    }
  };

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
    updateTodos(
      todos.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo),
      'TOGGLE'
    );
  };

  const deleteTodo = useCallback((id: number) => {
    if (deletingIds.has(id)) return;

    setDeletingIds(prev => new Set([...prev, id]));
    
    setTimeout(() => {
      const todoToDelete = todos.find(todo => todo.id === id);
      if (todoToDelete) {
        const newTodos = todos.filter(todo => todo.id !== id);
        updateTodos(newTodos, 'DELETE', false);
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }, 150);
  }, [todos, deletingIds, updateTodos]);

  // 完成所有/取完成所有
  const toggleAllComplete = () => {
    const allCompleted = todos.every(todo => todo.completed);
    updateTodos(
      todos.map(todo => ({ ...todo, completed: !allCompleted })),
      'COMPLETE_ALL'
    );
  };

  // 删除所有/还原所有
  const toggleDeleteAll = () => {
    if (todos.length === 0 && deletedTodos.length > 0) {
      const uniqueTodos = ensureUniqueTodos(deletedTodos);
      updateTodos(uniqueTodos, 'RESTORE_ALL', false);
      setDeletedTodos([]);
    } else {
      setDeletedTodos(ensureUniqueTodos([...deletedTodos, ...todos]));
      updateTodos([], 'DELETE_ALL', false);
    }
  };

  // 删除已完成/还原已完成
  const toggleDeleteCompleted = () => {
    const completedTodos = todos.filter(todo => todo.completed);
    
    if (completedTodos.length === 0 && deletedCompletedTodos.length > 0) {
      const uniqueTodos = ensureUniqueTodos([...todos, ...deletedCompletedTodos]);
      updateTodos(uniqueTodos, 'RESTORE_COMPLETED', false);
      setDeletedCompletedTodos([]);
    } else if (completedTodos.length > 0) {
      setDeletedCompletedTodos(prev => ensureUniqueTodos([...prev, ...completedTodos]));
      updateTodos(
        todos.filter(todo => !todo.completed),
        'DELETE_COMPLETED',
        false
      );
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

  // 修改时间排序处理函数
  const handleTimeSort = () => {
    const newSort = timeSort === 'asc' ? 'desc' : 'asc';
    setTimeSort(newSort);
    setSortType(newSort === 'asc' ? 'time' : 'time-reverse');
    const sortedTodos = sortTodos(todos, newSort === 'asc' ? 'time' : 'time-reverse');
    updateTodos(sortedTodos, 'SORT');
  };

  // 添加标题排序处理函数
  const handleNameSort = () => {
    const newSort = nameSort === 'asc' ? 'desc' : 'asc';
    setNameSort(newSort);
    setSortType(newSort === 'asc' ? 'name' : 'name-reverse');
    const sortedTodos = sortTodos(todos, newSort === 'asc' ? 'name' : 'name-reverse');
    updateTodos(sortedTodos, 'SORT');
  };

  // 在 Todo 组件内添加 SVG 图标组件
  const EditIcon = memo(() => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ));

  const DeleteIcon = memo(() => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ));

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

  // 将 TodoItem 提取为单独的组件
  const TodoItem = memo(({ 
    todo, 
    editingId, 
    deletingIds,
    onDelete, 
    onEdit, 
    onToggle, 
    onSaveEdit 
  }: TodoItemProps) => {
    const [editText, setEditText] = useState(todo.text);

    return (
      <li 
        className={`todo-item ${todo.completed ? 'completed-item' : ''} ${
          deletingIds.has(todo.id) ? 'deleting' : ''
        }`}
        data-id={todo.id}
      >
        {editingId === todo.id ? (
          <div className="edit-form">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={onSaveEdit}
              onKeyPress={(e) => e.key === 'Enter' && onSaveEdit()}
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
                onChange={() => onToggle(todo.id)}
              />
              <span className="custom-checkbox"></span>
            </div>
            <div className="todo-content">
              <div className="todo-text">
                <span 
                  className={todo.completed ? 'completed' : ''}
                  onDoubleClick={() => !todo.completed && onEdit(todo)}
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
          {!todo.completed && !editingId && !deletingIds.has(todo.id) && (
            <button
              onClick={() => onEdit(todo)}
              className="todo-action-btn todo-edit-btn"
              title="编辑"
            >
              <EditIcon />
            </button>
          )}
          <button
            onClick={() => onDelete(todo.id)}
            className="todo-action-btn todo-delete-btn"
            title="删除"
            disabled={deletingIds.has(todo.id)}
          >
            <DeleteIcon />
          </button>
        </div>
      </li>
    );
  });

  // 在组件内部添加
  useImperativeHandle(ref, () => ({
    resetAllData: () => {
      setTodos([]);
      setInput('');
      setDeletedTodos([]);
      setDeletedCompletedTodos([]);
      setEditingId(null);
      setEditText('');
      setSortType('time-reverse');
      setTimeSort('desc');
      setNameSort('asc');
      setDeletingIds(new Set());
    }
  }));

  // 在组件开始处添加初始历史记录
  useEffect(() => {
    if (todos.length > 0 && history.length === 0) {
      // 初始化历史记录
      addHistory('ADD', todos);
    }
  }, []); // 仅在��件挂载时执行

  return (
    <div className="todo-container">
      <div className="todo-header">
        <div className="header-main">
          <button
            className="clear-all-btn"
            onClick={onClearRequest}
            title="清除所有数据"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
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
            onClick={() => createNewTodo(input)}
          >
            添加
          </button>
        </div>
      </div>

      <div className="todo-header-actions">
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
          disabled={currentIndex <= 0}
          title="撤销"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="action-btn redo-btn"
          onClick={handleRedo}
          disabled={currentIndex >= history.length - 1}
          title="重做"
        >
          <RedoIcon />
        </button>
      </div>

      <List
        height={400}
        itemCount={todos.length}
        itemSize={70}
        width="100%"
        className="todo-list"
      >
        {({ index, style }) => (
          <TodoItem
            key={todos[index].id}
            todo={todos[index]}
            style={style}
            editingId={editingId}
            deletingIds={deletingIds}
            onDelete={deleteTodo}
            onEdit={startEditing}
            onToggle={toggleTodo}
            onSaveEdit={saveEdit}
          />
        )}
      </List>
    </div>
  );
});

Todo.displayName = 'Todo';

export default Todo; 