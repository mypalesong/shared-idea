import { TimeFormatter, DOMCache } from './utils.js';
import { CONFIG } from './config.js';

export class UIManager {
  constructor() {
    this.dom = new DOMCache();
    this.progressTimers = new Map();
    this.filterState = 'all';
    this.rowCounter = 0;
    this.answerData = new Map(); // Store full answer texts
    this.rawResponseData = new Map(); // Store raw API responses
    this.initializeElements();
    this.initializePopup();
  }
  
  initializeElements() {
    this.elements = {
      activeRequests: this.dom.get('activeRequests'),
      queuedRequests: this.dom.get('queuedRequests'),
      totalProcessed: this.dom.get('totalProcessed'),
      successRate: this.dom.get('successRate'),
      avgTime: this.dom.get('avgTime'),
      okCount: this.dom.get('okCount'),
      ngCount: this.dom.get('ngCount'),
      noneCount: this.dom.get('noneCount'),
      tableBody: this.dom.get('tableBody'),
      emptyState: this.dom.get('emptyState'),
      lineCount: this.dom.get('lineCount'),
      messageInput: this.dom.get('messageInput'),
    };
    
    this.filterButtons = {
      all: this.dom.querySelector('[data-filter="all"]'),
      ok: this.dom.querySelector('[data-filter="ok"]'),
      ng: this.dom.querySelector('[data-filter="ng"]'),
      none: this.dom.querySelector('[data-filter="none"]'),
      progress: this.dom.querySelector('[data-filter="progress"]')
    };
  }
  
  updateMetrics(metrics) {
    this.elements.activeRequests.textContent = metrics.active || 0;
    this.elements.queuedRequests.textContent = metrics.queued || 0;
    this.elements.totalProcessed.textContent = metrics.total || 0;
    
    const successRate = metrics.successRate || 0;
    this.elements.successRate.textContent = `${successRate.toFixed(1)}%`;
    
    const avgTime = metrics.avgResponseTime || 0;
    this.elements.avgTime.textContent = TimeFormatter.formatDuration(avgTime);
    
    const minTime = metrics.minResponseTime || 0;
    const maxTime = metrics.maxResponseTime || 0;
    // Min/Max time display removed
    
    this.elements.okCount.textContent = metrics.success || 0;
    this.elements.ngCount.textContent = metrics.failure || 0;
    this.elements.noneCount.textContent = metrics.unvalidated || 0;
    
    // Progress bars removed
    this.updateFilterCounts(metrics);
  }
  
  updateProgressBars(metrics) {
    // Progress bars removed - no longer needed
  }
  
  updateFilterCounts(metrics) {
    this.dom.get('allCount').textContent = metrics.total || 0;
    this.dom.get('okFilterCount').textContent = metrics.success || 0;
    this.dom.get('ngFilterCount').textContent = metrics.failure || 0;
    this.dom.get('noneFilterCount').textContent = metrics.unvalidated || 0;
    
    const progressCount = document.querySelectorAll('tr[data-status="progress"]').length;
    this.dom.get('progressCount').textContent = progressCount;
  }
  
  addTableRow(data, shouldStart = false) {
    this.rowCounter++;
    const row = document.createElement('tr');
    row.dataset.id = data.id;
    
    let status, statusText, startTimeText;
    
    if (shouldStart) {
      // 즉시 처리 시작
      const startTime = Date.now();
      startTimeText = TimeFormatter.formatTimestamp(startTime);
      status = 'progress';
      statusText = 'Processing';
      row.dataset.status = 'progress';
      row.dataset.startTime = startTime;
      
      console.log('✅ ROW CREATED WITH IMMEDIATE START:', {
        id: data.id,
        startTime: startTime,
        displayTime: startTimeText
      });
      
      // 즉시 progress 애니메이션 시작
      setTimeout(() => this.startProgressAnimation(data.id, startTime), 10);
    } else {
      // 대기 상태로 생성
      startTimeText = '-';
      status = 'ready';
      statusText = 'Ready';
      row.dataset.status = 'ready';
      
      console.log('📋 ROW CREATED IN READY STATE:', {
        id: data.id
      });
    }
    
    row.innerHTML = `<td class="col-id">${this.rowCounter}</td><td class="col-question" title="${this.escapeHtml(data.message)}">${this.escapeHtml(data.message)}</td><td class="col-ground-truth">${data.groundTruth || '-'}</td><td class="col-actual-intent">-</td><td class="col-answer" data-row-id="${data.id}">-</td><td class="col-sender">${data.sender}</td><td class="col-start-time">${startTimeText}</td><td class="col-end-time">-</td><td class="col-duration">-</td><td class="col-status"><span class="status status-${status}">${statusText}</span></td><td class="col-result"><span class="result result-none">-</span></td>`;
    
    this.elements.tableBody.appendChild(row);
    this.updateEmptyState();
    
    return row;
  }
  
  updateTableRow(id, updates) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) {
      return;
    }
    
    const cells = row.children;
    
    if (updates.status) {
      row.dataset.status = updates.status;
      const statusCell = cells[9].querySelector('.status');
      statusCell.className = `status status-${updates.status}`;
      statusCell.textContent = this.formatStatus(updates.status);
      
      if (updates.status === 'progress') {
        const startTime = updates.startTime || Date.now();
        
        // Start time이 아직 설정되지 않은 경우에만 설정
        if (!row.dataset.startTime || row.dataset.startTime === 'undefined') {
          const timeText = TimeFormatter.formatTimestamp(startTime);
          cells[6].textContent = timeText;
          row.dataset.startTime = startTime;
          
          console.log('🕐 Start time set on progress status:', {
            id: id,
            startTime: startTime,
            displayTime: timeText
          });
        }
        
        this.startProgressAnimation(id, startTime);
      } else {
        this.stopProgressAnimation(id);
      }
    }
    
    if (updates.intentAnswer !== undefined) {
      cells[3].textContent = updates.intentAnswer || '-';
    }
    
    if (updates.answer !== undefined) {
      const answerCell = cells[4];
      const fullAnswer = updates.answer || '-';
      
      // Store full answer text
      this.answerData.set(id, fullAnswer);
      
      // Store raw response data if provided
      if (updates.rawResponse) {
        this.rawResponseData.set(id, updates.rawResponse);
      }
      
      // Display truncated version with line break support
      if (fullAnswer.length > 100) {
        const truncatedText = fullAnswer.substring(0, 100);
        const htmlText = this.escapeHtml(truncatedText).replace(/\n/g, '<br>');
        answerCell.innerHTML = `<span class="answer-truncated">${htmlText}</span>`;
      } else {
        const htmlText = this.escapeHtml(fullAnswer).replace(/\n/g, '<br>');
        answerCell.innerHTML = htmlText;
      }
    }
    
    // Update start time when provided (우선순위 높게 처리)
    if (updates.startTime !== undefined && updates.startTime) {
      const timeText = TimeFormatter.formatTimestamp(updates.startTime);
      cells[6].textContent = timeText;
      row.dataset.startTime = updates.startTime;
      
      console.log('⏰ Start time explicitly updated:', {
        id: id,
        startTime: updates.startTime,
        displayTime: timeText
      });
    }
    
    if (updates.endTime !== undefined) {
      const timeText = updates.endTime ? TimeFormatter.formatTimestamp(updates.endTime) : '-';
      cells[7].textContent = timeText;
    }
    
    if (updates.duration !== undefined) {
      const durationText = updates.duration !== undefined ? TimeFormatter.formatDuration(updates.duration) : '-';
      cells[8].textContent = durationText;
    }
    
    // Start time should only be set during processing start, not overridden later
    
    if (updates.result !== undefined) {
      const resultCell = cells[10].querySelector('.result');
      resultCell.className = `result result-${updates.result.toLowerCase()}`;
      resultCell.textContent = updates.result;
      
      if (updates.result === 'NG') {
        row.classList.add('row-error');
      }
    }
    
    this.applyFilter();
  }
  
  startProgressAnimation(id, startTime) {
    this.stopProgressAnimation(id);
    
    const updateProgress = () => {
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (!row || row.dataset.status !== 'progress') {
        this.stopProgressAnimation(id);
        return;
      }
      
      const statusCell = row.children[9].querySelector('.status');
      const elapsed = Date.now() - startTime;
      const seconds = Math.floor(elapsed / 1000);
      statusCell.textContent = `Processing (${seconds}s)`;
    };
    
    updateProgress();
    const timer = setInterval(updateProgress, 1000);
    this.progressTimers.set(id, timer);
  }
  
  stopProgressAnimation(id) {
    const timer = this.progressTimers.get(id);
    if (timer) {
      clearInterval(timer);
      this.progressTimers.delete(id);
    }
  }
  
  setFilter(filter) {
    this.filterState = filter;
    
    Object.keys(this.filterButtons).forEach(key => {
      this.filterButtons[key].classList.toggle('active', key === filter);
    });
    
    this.applyFilter();
  }
  
  applyFilter() {
    const rows = this.elements.tableBody.querySelectorAll('tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
      const status = row.dataset.status;
      const resultCell = row.querySelector('.result');
      const result = resultCell ? resultCell.textContent.toLowerCase() : '';
      
      let visible = false;
      
      switch (this.filterState) {
        case 'all':
          visible = true;
          break;
        case 'ok':
          visible = result === 'ok';
          break;
        case 'ng':
          visible = result === 'ng';
          break;
        case 'none':
          visible = result === '-' || result === 'none';
          break;
        case 'progress':
          visible = status === 'progress';
          break;
      }
      
      row.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });
    
    this.updateEmptyState(visibleCount === 0);
  }
  
  updateInputInfo(text) {
    const lines = text.split('\n').filter(line => line.trim()).length;
    
    this.elements.lineCount.textContent = `(${lines} lines)`;
  }
  
  clearInput() {
    this.elements.messageInput.value = '';
    this.updateInputInfo('');
  }

  clearTable() {
    // Clear all table rows
    this.elements.tableBody.innerHTML = '';
    
    // Clear answer data
    this.answerData.clear();
    this.rawResponseData.clear();
    
    // Clear progress timers
    this.progressTimers.forEach((timer, id) => {
      clearInterval(timer);
    });
    this.progressTimers.clear();
    
    // Reset row counter
    this.rowCounter = 0;
    
    // Update empty state
    this.updateEmptyState();
    
    // Reset filter to 'all'
    this.setFilter('all');
  }
  
  updateEmptyState(forceShow = false) {
    const hasRows = this.elements.tableBody.children.length > 0;
    this.elements.emptyState.classList.toggle('show', forceShow || !hasRows);
  }
  
  formatStatus(status) {
    const statusMap = {
      'ready': 'Ready',
      'queued': 'Queued',
      'progress': 'Processing',
      'completed': 'Completed',
      'error': 'Error'
    };
    return statusMap[status] || status;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  initializePopup() {
    const popup = document.getElementById('answerPopup');
    const closeBtn = document.getElementById('closeAnswerPopup');
    const debugPopup = document.getElementById('debugPopup');
    const debugCloseBtn = document.getElementById('closeDebugPopup');
    
    // Close answer popup on close button click
    closeBtn.addEventListener('click', () => {
      this.hideAnswerPopup();
    });
    
    // Close answer popup on outside click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        this.hideAnswerPopup();
      }
    });
    
    // Close debug popup on close button click
    debugCloseBtn.addEventListener('click', () => {
      this.hideDebugPopup();
    });
    
    // Close debug popup on outside click
    debugPopup.addEventListener('click', (e) => {
      if (e.target === debugPopup) {
        this.hideDebugPopup();
      }
    });
    
    // Close popups on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (popup.classList.contains('show')) {
          this.hideAnswerPopup();
        }
        if (debugPopup.classList.contains('show')) {
          this.hideDebugPopup();
        }
      }
    });
    
    // Add click handler to answer cells
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('col-answer') || e.target.closest('.col-answer')) {
        const cell = e.target.classList.contains('col-answer') ? e.target : e.target.closest('.col-answer');
        const rowId = cell.dataset.rowId;
        const fullAnswer = this.answerData.get(rowId);
        
        if (fullAnswer && fullAnswer !== '-') {
          // Get the question from the same row
          const row = cell.closest('tr');
          const questionCell = row.querySelector('.col-question');
          const question = questionCell ? questionCell.textContent : 'Answer';
          this.showAnswerPopup(fullAnswer, question);
        }
      }
    });
    
    // Add right-click handler to answer cells for debug popup
    document.addEventListener('contextmenu', (e) => {
      if (e.target.classList.contains('col-answer') || e.target.closest('.col-answer')) {
        e.preventDefault();
        const cell = e.target.classList.contains('col-answer') ? e.target : e.target.closest('.col-answer');
        const rowId = cell.dataset.rowId;
        const rawResponse = this.rawResponseData.get(rowId);
        
        if (rawResponse) {
          this.showDebugPopup(rawResponse);
        }
      }
    });
  }
  
  showAnswerPopup(answer, question) {
    const popup = document.getElementById('answerPopup');
    const answerText = document.getElementById('answerText');
    const answerTitle = popup.querySelector('.answer-title');
    
    // Update title with the question
    if (answerTitle) {
      answerTitle.textContent = question;
    }
    
    console.log('Answer popup data:', { 
      originalAnswer: answer,
      hasNewlines: answer.includes('\n'),
      answerLength: answer.length,
      newlineCount: (answer.match(/\n/g) || []).length
    });
    
    // Markdown 렌더링 시도
    try {
      if (typeof marked !== 'undefined') {
        // Configure marked to preserve line breaks
        marked.setOptions({
          breaks: true,
          gfm: true
        });
        answerText.innerHTML = marked.parse(answer);
      } else {
        // Convert line breaks to <br> tags for plain text display
        const htmlAnswer = answer.replace(/\n/g, '<br>');
        console.log('Converted HTML:', htmlAnswer);
        answerText.innerHTML = htmlAnswer;
      }
    } catch (error) {
      console.error('Markdown parsing error:', error);
      // Convert line breaks to <br> tags for fallback
      const htmlAnswer = answer.replace(/\n/g, '<br>');
      answerText.innerHTML = htmlAnswer;
    }
    
    popup.classList.add('show');
  }
  
  hideAnswerPopup() {
    const popup = document.getElementById('answerPopup');
    popup.classList.remove('show');
  }

  showDebugPopup(rawResponse) {
    const popup = document.getElementById('debugPopup');
    const debugJson = document.getElementById('debugJson');
    
    // Pretty print JSON
    try {
      const formattedJson = JSON.stringify(rawResponse, null, 2);
      debugJson.textContent = formattedJson;
    } catch (error) {
      debugJson.textContent = 'Error formatting JSON: ' + error.message;
    }
    
    popup.classList.add('show');
  }

  hideDebugPopup() {
    const popup = document.getElementById('debugPopup');
    popup.classList.remove('show');
  }

  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}