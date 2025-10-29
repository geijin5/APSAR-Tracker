import { format, parseISO, isValid, formatDistance, startOfDay, endOfDay } from 'date-fns';

/**
 * Centralized date/time formatting utilities to ensure consistency across the app
 */

// Standard date format: MM/DD/YYYY
export const formatDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return 'N/A';
    
    return format(dateObj, 'MM/dd/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

// Standard time format: 12-hour with AM/PM
export const formatTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return 'N/A';
    
    return format(dateObj, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'N/A';
  }
};

// Combined date and time format: MM/DD/YYYY h:mm AM/PM
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return 'N/A';
    
    return format(dateObj, 'MM/dd/yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'N/A';
  }
};

// Compact date format for tables: MMM DD, YYYY
export const formatDateCompact = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return 'N/A';
    
    return format(dateObj, 'MMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting compact date:', error);
    return 'N/A';
  }
};

// Relative time format: "2 hours ago", "in 3 days"
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return 'N/A';
    
    return formatDistance(dateObj, new Date(), { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'N/A';
  }
};

// Get current date in MM/DD/YYYY format for form auto-fill
export const getCurrentDate = () => {
  return format(new Date(), 'MM/dd/yyyy');
};

// Get current time in 12-hour format for form auto-fill
export const getCurrentTime = () => {
  return format(new Date(), 'h:mm a');
};

// Get current date and time for database storage (ISO string)
export const getCurrentISOString = () => {
  return new Date().toISOString();
};

// Format date for HTML input[type="date"] (YYYY-MM-DD)
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
};

// Format time for HTML input[type="time"] (HH:mm)
export const formatTimeForInput = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, 'HH:mm');
  } catch (error) {
    console.error('Error formatting time for input:', error);
    return '';
  }
};

// Check if a date is overdue (past current date)
export const isOverdue = (date) => {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    const today = startOfDay(new Date());
    const targetDate = startOfDay(dateObj);
    
    return targetDate < today;
  } catch (error) {
    console.error('Error checking if date is overdue:', error);
    return false;
  }
};

// Check if a date is today
export const isToday = (date) => {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    const today = startOfDay(new Date());
    const targetDate = startOfDay(dateObj);
    
    return today.getTime() === targetDate.getTime();
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
};

// Get start of day for date range filtering
export const getStartOfDay = (date) => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    return startOfDay(dateObj).toISOString();
  } catch (error) {
    console.error('Error getting start of day:', error);
    return null;
  }
};

// Get end of day for date range filtering
export const getEndOfDay = (date) => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    return endOfDay(dateObj).toISOString();
  } catch (error) {
    console.error('Error getting end of day:', error);
    return null;
  }
};

// Create a Date object from various input formats
export const parseDate = (dateInput) => {
  if (!dateInput) return null;
  
  try {
    if (typeof dateInput === 'string') {
      // Handle ISO strings
      if (dateInput.includes('T') || dateInput.includes('Z')) {
        return parseISO(dateInput);
      }
      // Handle other date strings
      return new Date(dateInput);
    }
    
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    return new Date(dateInput);
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

export default {
  formatDate,
  formatTime,
  formatDateTime,
  formatDateCompact,
  formatRelativeTime,
  getCurrentDate,
  getCurrentTime,
  getCurrentISOString,
  formatDateForInput,
  formatTimeForInput,
  isOverdue,
  isToday,
  getStartOfDay,
  getEndOfDay,
  parseDate
};
