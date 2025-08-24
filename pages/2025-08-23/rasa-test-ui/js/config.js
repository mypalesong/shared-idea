export const CONFIG = {
  api: {
    webhookUrl: 'http://localhost:30916/webhooks/myio/webhook',
    maxConcurrent: 3,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  ui: {
    updateInterval: 100,
    progressUpdateInterval: 100,
    chartUpdateInterval: 1000,
    maxTableRows: 1000,
    animationDuration: 200
  },
  
  performance: {
    enableMetrics: true,
    metricsBufferSize: 100,
    chartDataPoints: 20
  }
};