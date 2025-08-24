import { CONFIG } from './config.js';

export class RequestQueue {
  constructor(maxConcurrent = CONFIG.api.maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.activeRequests = new Map();
    this.completedRequests = new Map();
    this.listeners = new Map();
  }
  
  add(request) {
    const queueItem = {
      ...request,
      id: request.id || this.generateId(),
      status: 'queued',
      queuedAt: Date.now()
    };
    
    console.log('🗂️ QUEUE ADD:', {
      id: queueItem.id,
      queueLength: this.queue.length,
      activeRequests: this.activeRequests.size,
      maxConcurrent: this.maxConcurrent
    });
    
    this.queue.push(queueItem);
    this.emit('queued', queueItem);
    this.processNext();
    
    return queueItem.id;
  }
  
  async processNext() {
    console.log('⚙️ PROCESS NEXT:', {
      activeSize: this.activeRequests.size,
      maxConcurrent: this.maxConcurrent,
      queueLength: this.queue.length,
      canProcess: this.activeRequests.size < this.maxConcurrent && this.queue.length > 0
    });
    
    if (this.activeRequests.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    const request = this.queue.shift();
    request.status = 'active';
    request.startedAt = Date.now();
    
    console.log('🚀 STARTING REQUEST:', {
      id: request.id,
      startedAt: request.startedAt
    });
    
    this.activeRequests.set(request.id, request);
    this.emit('started', request);
    
    try {
      const result = await this.executeRequest(request);
      this.handleSuccess(request, result);
    } catch (error) {
      this.handleError(request, error);
    }
    
    this.processNext();
  }
  
  async executeRequest(request) {
    if (request.handler) {
      return await request.handler(request);
    }
    throw new Error('No handler provided for request');
  }
  
  handleSuccess(request, result) {
    request.status = 'completed';
    request.completedAt = Date.now();
    request.duration = request.completedAt - request.startedAt;
    request.result = result;
    
    this.activeRequests.delete(request.id);
    this.completedRequests.set(request.id, request);
    
    this.emit('completed', request);
  }
  
  handleError(request, error) {
    request.status = 'error';
    request.completedAt = Date.now();
    request.duration = request.completedAt - request.startedAt;
    request.error = error;
    
    this.activeRequests.delete(request.id);
    this.completedRequests.set(request.id, request);
    
    this.emit('error', request);
  }
  
  cancel(requestId) {
    const queueIndex = this.queue.findIndex(r => r.id === requestId);
    if (queueIndex !== -1) {
      const [request] = this.queue.splice(queueIndex, 1);
      request.status = 'cancelled';
      this.emit('cancelled', request);
      return true;
    }
    
    const activeRequest = this.activeRequests.get(requestId);
    if (activeRequest && activeRequest.cancel) {
      activeRequest.cancel();
      return true;
    }
    
    return false;
  }
  
  clear() {
    const cancelled = [...this.queue];
    this.queue = [];
    
    cancelled.forEach(request => {
      request.status = 'cancelled';
      this.emit('cancelled', request);
    });
    
    this.activeRequests.forEach(request => {
      if (request.cancel) {
        request.cancel();
      }
    });
    
    // Clear all internal state
    this.activeRequests.clear();
    this.completedRequests.clear();
  }
  
  getStatus() {
    return {
      queued: this.queue.length,
      active: this.activeRequests.size,
      completed: this.completedRequests.size,
      queuedRequests: [...this.queue],
      activeRequests: [...this.activeRequests.values()],
      completedRequests: [...this.completedRequests.values()]
    };
  }
  
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
  }
  
  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  
  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  generateId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}