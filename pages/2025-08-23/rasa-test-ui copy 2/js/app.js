import { CONFIG } from './config.js';
import { APIClient } from './api.js';
import { RequestQueue } from './queue.js';
import { UIManager } from './ui.js';
import { Statistics, MessageParser, TimeFormatter } from './utils.js';

class Application {
  constructor() {
    this.api = new APIClient();
    this.queue = new RequestQueue();
    this.ui = new UIManager();
    this.stats = new Statistics();
    this.requestIdMap = new Map();
    
    this.initialize();
  }
  
  initialize() {
    this.setupEventListeners();
    this.setupQueueHandlers();
    this.startMetricsUpdate();
    this.loadUserPreferences();
    
    console.log('Application initialized successfully');
  }
  
  setupEventListeners() {
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');
    const messageInput = document.getElementById('messageInput');
    
    sendBtn.addEventListener('click', () => this.handleSendBatch());
    clearBtn.addEventListener('click', () => this.handleClear());
    
    messageInput.addEventListener('input', (e) => {
      this.ui.updateInputInfo(e.target.value);
      this.addTypingEffects(e.target);
    });
    
    
    messageInput.addEventListener('focus', (e) => {
      e.target.classList.add('typing');
    });
    
    messageInput.addEventListener('blur', (e) => {
      e.target.classList.remove('typing');
    });
    
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendBatch();
      }
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.ui.setFilter(filter);
      });
    });

    document.querySelectorAll('.font-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const size = e.currentTarget.dataset.size;
        this.setFontSize(size);
      });
    });

    // Sender mode toggle buttons
    const randomBtn = document.getElementById('randomBtn');
    const fixedBtn = document.getElementById('fixedBtn');
    
    randomBtn.addEventListener('click', () => {
      this.setSenderMode('random');
      randomBtn.classList.add('active');
      fixedBtn.classList.remove('active');
    });
    
    fixedBtn.addEventListener('click', () => {
      this.setSenderMode('fixed');
      fixedBtn.classList.add('active');
      randomBtn.classList.remove('active');
    });

    const themeSelector = document.getElementById('themeSelector');
    themeSelector.addEventListener('change', (e) => {
      this.setTheme(e.target.value);
    });

    const queueLimitSlider = document.getElementById('queueLimitSlider');
    const limitDisplay = document.getElementById('limitDisplay');
    
    queueLimitSlider.addEventListener('input', (e) => {
      const limit = parseInt(e.target.value);
      this.setQueueLimit(limit);
      limitDisplay.textContent = limit;
    });

    // Restart button and confirm popup
    const restartBtn = document.getElementById('restartBtn');
    const resetConfirmPopup = document.getElementById('resetConfirmPopup');
    const confirmResetBtn = document.getElementById('confirmReset');
    const cancelResetBtn = document.getElementById('cancelReset');
    
    restartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showResetConfirm();
    });
    
    confirmResetBtn.addEventListener('click', () => {
      this.hideResetConfirm();
      this.handleRestart();
    });
    
    cancelResetBtn.addEventListener('click', () => {
      this.hideResetConfirm();
    });
    
    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
      if (!resetConfirmPopup.contains(e.target) && !restartBtn.contains(e.target)) {
        this.hideResetConfirm();
      }
    });
  }
  
  setupQueueHandlers() {
    this.queue.on('queued', (request) => {
      const uiId = this.requestIdMap.get(request.id);
      if (uiId) {
        console.log('📋 REQUEST QUEUED - checking if should be queued:', {
          requestId: request.id,
          uiId: uiId,
          activeCount: this.queue.activeRequests.size,
          maxConcurrent: this.queue.maxConcurrent
        });
        
        // 실제로 queue에 대기 중일 때만 queued 상태로 변경
        if (this.queue.activeRequests.size >= this.queue.maxConcurrent) {
          this.ui.updateTableRow(uiId, {
            status: 'queued'
          });
          this.ui.stopProgressAnimation(uiId);
        }
      }
      this.updateMetrics();
    });
    
    this.queue.on('started', (request) => {
      const uiId = this.requestIdMap.get(request.id);
      
      console.log('🚀 QUEUE STARTED - setting progress with start time:', {
        requestId: request.id,
        uiId: uiId
      });
      
      if (uiId) {
        const startTime = Date.now();
        
        this.ui.updateTableRow(uiId, {
          status: 'progress',
          startTime: startTime
        });
        
        console.log('⏰ Start time set via started event:', {
          uiId: uiId,
          startTime: startTime,
          displayTime: new Date(startTime).toLocaleTimeString()
        });
      }
      this.updateMetrics();
    });
    
    this.queue.on('completed', (request) => {
      const uiId = this.requestIdMap.get(request.id);
      if (uiId) {
        const result = this.evaluateResult(
          request.data.groundTruth,
          request.result.intentAnswer
        );
        
        console.log('✅ PROCESSING COMPLETED - Setting End Time:', {
          requestId: request.id,
          completedAt: request.completedAt,
          duration: request.duration
        });
        
        this.ui.updateTableRow(uiId, {
          status: 'completed',
          intentAnswer: request.result.intentAnswer,
          answer: request.result.answer,
          endTime: request.completedAt,
          duration: request.duration,
          result: result
        });
        
        this.stats.addRequest(result, request.duration);
      }
      this.updateMetrics();
    });
    
    this.queue.on('error', (request) => {
      const uiId = this.requestIdMap.get(request.id);
      if (uiId) {
        this.ui.updateTableRow(uiId, {
          status: 'error',
          intentAnswer: 'Error',
          answer: 'Error occurred',
          endTime: request.completedAt,
          duration: request.duration,
          result: 'NG'
        });
        
        this.stats.addRequest('NG', request.duration);
      }
      this.updateMetrics();
    });
  }
  
  handleSendBatch() {
    const input = document.getElementById('messageInput').value;
    const lines = input.split('\n').filter(line => line.trim());
    
    console.log('📤 SEND BATCH:', {
      inputLength: input.length,
      linesCount: lines.length,
      lines: lines
    });
    
    if (lines.length === 0) {
      this.ui.showNotification('Please enter at least one question', 'warning');
      return;
    }
    
    const requests = lines.map(line => {
      const groundTruth = MessageParser.parseGroundTruth(line);
      const cleanMessage = MessageParser.cleanMessage(line);
      const sender = MessageParser.generateSenderId(this.senderMode || 'random');
      
      const rowData = {
        id: `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: cleanMessage,
        groundTruth: groundTruth,
        sender: sender,
        status: 'queued'
      };
      
      // 현재 active 요청 수 체크하여 즉시 시작할지 결정
      const currentActive = this.queue.activeRequests.size;
      const shouldStart = currentActive < this.queue.maxConcurrent;
      
      console.log('🔍 CHECKING CONCURRENT LIMIT:', {
        currentActive: currentActive,
        maxConcurrent: this.queue.maxConcurrent,
        shouldStart: shouldStart,
        message: cleanMessage
      });
      
      const row = this.ui.addTableRow(rowData, shouldStart);
      
      const requestId = this.queue.add({
        data: rowData,
        handler: async (request) => {
          console.log('🔄 EXECUTING REQUEST:', {
            requestId: request.id,
            message: cleanMessage,
            sender: sender
          });
          
          const payload = {
            sender: sender,
            message: cleanMessage,
            metadata: {}
          };
          
          return await this.api.sendRequest(payload, request.id);
        }
      });
      
      // requestIdMap 즉시 설정
      this.requestIdMap.set(requestId, rowData.id);
      
      console.log('➕ ADDED TO QUEUE:', {
        requestId: requestId,
        uiId: rowData.id,
        message: cleanMessage,
        mapSize: this.requestIdMap.size
      });
      
      return requestId;
    });
    
    this.ui.clearInput();
    this.ui.showNotification(`${requests.length} requests queued`, 'success');
  }
  
  handleClear() {
    if (confirm('Clear all input?')) {
      this.ui.clearInput();
    }
  }

  handleRestart() {
    // Clear fixed senders
    MessageParser.clearFixedSenders();
    
    // Clear queue
    this.queue.clear();
    
    // Clear UI
    this.ui.clearTable();
    this.ui.clearInput();
    
    // Reset statistics
    this.stats.reset();
    
    // Clear request ID mapping
    this.requestIdMap.clear();
    
    // Update metrics
    this.updateMetrics();
    
    // Show notification
    this.ui.showNotification('Session restarted successfully', 'success');
  }

  showResetConfirm() {
    const popup = document.getElementById('resetConfirmPopup');
    const restartBtn = document.getElementById('restartBtn');
    
    // Calculate position relative to the button with more padding
    const rect = restartBtn.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.top = `${rect.bottom + 16}px`;
    popup.style.right = `${window.innerWidth - rect.right}px`;
    
    popup.classList.add('show');
  }

  hideResetConfirm() {
    const popup = document.getElementById('resetConfirmPopup');
    popup.classList.remove('show');
  }
  
  evaluateResult(groundTruth, intentAnswer) {
    if (!groundTruth) {
      return 'None';
    }
    
    return groundTruth === intentAnswer ? 'OK' : 'NG';
  }
  
  updateMetrics() {
    const queueStatus = this.queue.getStatus();
    const statsMetrics = this.stats.getMetrics();
    
    this.ui.updateMetrics({
      active: queueStatus.active,
      queued: queueStatus.queued,
      total: statsMetrics.total,
      success: statsMetrics.success,
      failure: statsMetrics.failure,
      unvalidated: statsMetrics.unvalidated,
      avgResponseTime: statsMetrics.avgResponseTime,
      minResponseTime: statsMetrics.minResponseTime,
      maxResponseTime: statsMetrics.maxResponseTime,
      successRate: statsMetrics.successRate
    });
    
  }
  
  
  startMetricsUpdate() {
    setInterval(() => {
      this.updateMetrics();
    }, CONFIG.ui.chartUpdateInterval);
  }

  setFontSize(size) {
    document.querySelectorAll('.font-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-size="${size}"]`).classList.add('active');
    
    document.body.className = document.body.className.replace(/font-size-\d+/g, '');
    document.body.classList.add(`font-size-${size}`);
    
    localStorage.setItem('fontSize', size);
  }

  setQueueLimit(limit) {
    this.queue.maxConcurrent = limit;
    localStorage.setItem('queueLimit', limit);
    
    this.updateMetrics();
  }

  setSenderMode(mode) {
    // Clear current fixed sender when switching modes
    if (this.senderMode !== mode) {
      MessageParser.clearFixedSenders();
    }
    
    this.senderMode = mode;
    localStorage.setItem('senderMode', mode);
    
    // Auto-adjust concurrent limit based on sender mode
    const queueLimitSlider = document.getElementById('queueLimitSlider');
    const limitDisplay = document.getElementById('limitDisplay');
    
    if (mode === 'fixed') {
      // Fixed mode: sequential processing (limit = 1)
      this.setQueueLimit(1);
      queueLimitSlider.value = 1;
      limitDisplay.textContent = '1';
    } else {
      // Random mode: parallel processing (limit = 5)
      this.setQueueLimit(5);
      queueLimitSlider.value = 5;
      limitDisplay.textContent = '5';
    }
    
    console.log('Sender mode changed:', mode, 'Concurrent limit:', mode === 'fixed' ? 1 : 5);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    console.log('Theme changed:', theme);
  }

  addTypingEffects(input) {
    // Add typing class for enhanced effects
    input.classList.add('typing');
    
    // Create sparkle particle effect
    if (Math.random() < 0.3) { // 30% chance to create sparkle
      this.createSparkleParticle(input);
    }
    
    // Remove typing class after a delay
    clearTimeout(input.typingTimeout);
    input.typingTimeout = setTimeout(() => {
      if (!input.matches(':focus')) {
        input.classList.remove('typing');
      }
    }, 500);
  }
  
  createSparkleParticle(input) {
    const particle = document.createElement('div');
    particle.className = 'sparkle-particle';
    
    // Random position within input bounds
    const rect = input.getBoundingClientRect();
    const x = Math.random() * (rect.width - 20) + 10;
    const y = Math.random() * (rect.height - 20) + 10;
    
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    
    input.parentElement.appendChild(particle);
    
    // Remove particle after animation
    setTimeout(() => {
      if (particle.parentElement) {
        particle.parentElement.removeChild(particle);
      }
    }, 1000);
  }

  loadUserPreferences() {
    const savedFontSize = localStorage.getItem('fontSize') || '12';
    this.setFontSize(savedFontSize);
    
    const savedQueueLimit = localStorage.getItem('queueLimit') || '3';
    const limitValue = parseInt(savedQueueLimit);
    document.getElementById('queueLimitSlider').value = limitValue;
    document.getElementById('limitDisplay').textContent = limitValue;
    this.setQueueLimit(limitValue);
    
    const savedSenderMode = localStorage.getItem('senderMode') || 'random';
    this.senderMode = savedSenderMode;
    const randomBtn = document.getElementById('randomBtn');
    const fixedBtn = document.getElementById('fixedBtn');
    
    if (savedSenderMode === 'random') {
      randomBtn.classList.add('active');
      fixedBtn.classList.remove('active');
    } else {
      fixedBtn.classList.add('active');
      randomBtn.classList.remove('active');
    }
    
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const themeSelector = document.getElementById('themeSelector');
    themeSelector.value = savedTheme;
    this.setTheme(savedTheme);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new Application();
});