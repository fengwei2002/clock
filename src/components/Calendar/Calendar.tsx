import React from 'react';
import './Calendar.css';

const Calendar = () => {
  const date = new Date();
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();
  const currentDay = date.getDate();
  const currentWeekDay = date.getDay();

  // 获取当前周的起始和结束日期
  const getWeekDays = () => {
    const start = currentDay - currentWeekDay + (currentWeekDay === 0 ? -6 : 1);
    const end = start + 6;
    return { start, end };
  };

  const { start: weekStart, end: weekEnd } = getWeekDays();

  // 获取当月第一天是星期几
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const firstDayAdjusted = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  // 获取上个月的最后几天
  const lastMonth = new Date(currentYear, currentMonth, 0);
  const lastMonthDays = lastMonth.getDate();
  
  // 获取当月天数
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // 生成日历数组
  const days = [];
  // 添加上个月的日期
  for (let i = firstDayAdjusted - 1; i >= 0; i--) {
    days.push({
      day: lastMonthDays - i,
      type: 'prev'
    });
  }
  // 添加当月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      type: 'current'
    });
  }
  // 添加下个月的日期（填充到42个格子）
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      type: 'next'
    });
  }

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                     '七月', '八月', '九月', '十月', '十一月', '十二月'];

  // 判断是否是当前周
  const isCurrentWeek = (day: number, type: string) => {
    if (type !== 'current') return false;
    return day >= weekStart && day <= weekEnd;
  };

  // 判断是否是今天
  const isToday = (day: number, type: string) => {
    return type === 'current' && day === currentDay;
  };

  // 判断是否是周末
  const isWeekend = (index: number) => {
    // 考虑到日历是从周一开始的，所以第6和第7个是周末
    return index % 7 === 5 || index % 7 === 6;
  };

  // 添加中文月份和数字转中文的函数
  const getChineseMonth = (month: number) => {
    const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    return months[month] + '月';
  };

  // 修改获取完整日期的函数
  const getFullDate = () => {
    return `${currentYear} 年 ${currentMonth + 1} 月 ${currentDay} 日`;
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-title">
          {getFullDate()}
        </div>
      </div>
      <div className="calendar-body">
        <div className="calendar-weekdays">
          {['一', '二', '三', '四', '五', '六', '日'].map((day, index) => (
            <div 
              key={day} 
              className={`calendar-weekday ${
                index === currentWeekDay - 1 || 
                (currentWeekDay === 0 && index === 6) ? 'current' : ''
              } ${isWeekend(index) ? 'weekend' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-days">
          {days.map((item, index) => (
            <div 
              key={index} 
              className={`calendar-day ${
                isToday(item.day, item.type) ? 'today' : ''
              } ${
                isCurrentWeek(item.day, item.type) ? 'current-week' : ''
              } ${
                item.type !== 'current' ? 'other-month' : ''
              } ${
                isWeekend(index) ? 'weekend' : ''
              }`}
            >
              {item.day}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar; 