export class TimeFormatter {
  static formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }
  
  static formatDuration(milliseconds) {
    if (!milliseconds && milliseconds !== 0) return '-';
    
    const totalSeconds = milliseconds / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds.toFixed(3)}s`;
    }
    return `${seconds.toFixed(3)}s`;
  }
  
  static getCurrentTimestamp() {
    return Date.now();
  }
}

export class MessageParser {
  static parseGroundTruth(message) {
    const match = message.match(/--([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  }
  
  static cleanMessage(message) {
    return message.replace(/--[a-zA-Z0-9_]+/, '').trim();
  }
  
  static generateSenderId(mode = 'random') {
    if (mode === 'fixed') {
      // Get or create single fixed sender for this session
      let currentFixedSender = localStorage.getItem('currentFixedSender');
      const usedSenders = new Set(JSON.parse(localStorage.getItem('allUsedSenders') || '[]'));
      
      if (!currentFixedSender) {
        // Create new fixed sender that hasn't been used before
        let newSender;
        let attempts = 0;
        do {
          const randomId = Math.random().toString(36).substring(2, 8);
          newSender = `fixed-${randomId}`;
          attempts++;
        } while (usedSenders.has(newSender) && attempts < 100);
        
        currentFixedSender = newSender;
        usedSenders.add(newSender);
        
        localStorage.setItem('currentFixedSender', currentFixedSender);
        localStorage.setItem('allUsedSenders', JSON.stringify(Array.from(usedSenders)));
      }
      
      // Always return the same fixed sender
      return currentFixedSender;
    }
    return 'usr_' + Math.random().toString(36).substring(2, 8);
  }
  
  static clearFixedSenders() {
    localStorage.removeItem('currentFixedSender');
    localStorage.removeItem('fixedSenders'); // Legacy cleanup
  }
}

export class Statistics {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.totalRequests = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.unvalidatedCount = 0;
    this.totalResponseTime = 0;
    this.minResponseTime = Infinity;
    this.maxResponseTime = 0;
    this.responseTimeHistory = [];
  }
  
  addRequest(result, responseTime) {
    this.totalRequests++;
    
    if (result === 'OK') {
      this.successCount++;
    } else if (result === 'NG') {
      this.failureCount++;
    } else {
      this.unvalidatedCount++;
    }
    
    if (responseTime) {
      this.totalResponseTime += responseTime;
      this.minResponseTime = Math.min(this.minResponseTime, responseTime);
      this.maxResponseTime = Math.max(this.maxResponseTime, responseTime);
      this.responseTimeHistory.push(responseTime);
      
      if (this.responseTimeHistory.length > 100) {
        this.responseTimeHistory.shift();
      }
    }
  }
  
  getAverageResponseTime() {
    if (this.totalRequests === 0) return 0;
    return this.totalResponseTime / this.totalRequests;
  }
  
  getSuccessRate() {
    const validated = this.successCount + this.failureCount;
    if (validated === 0) return 0;
    return (this.successCount / validated) * 100;
  }
  
  getMetrics() {
    return {
      total: this.totalRequests,
      success: this.successCount,
      failure: this.failureCount,
      unvalidated: this.unvalidatedCount,
      avgResponseTime: this.getAverageResponseTime(),
      minResponseTime: this.minResponseTime === Infinity ? 0 : this.minResponseTime,
      maxResponseTime: this.maxResponseTime,
      successRate: this.getSuccessRate(),
      history: [...this.responseTimeHistory]
    };
  }
}

export class DOMCache {
  constructor() {
    this.elements = new Map();
  }
  
  get(id) {
    if (!this.elements.has(id)) {
      this.elements.set(id, document.getElementById(id));
    }
    return this.elements.get(id);
  }
  
  querySelector(selector) {
    if (!this.elements.has(selector)) {
      this.elements.set(selector, document.querySelector(selector));
    }
    return this.elements.get(selector);
  }
  
  clear() {
    this.elements.clear();
  }
}