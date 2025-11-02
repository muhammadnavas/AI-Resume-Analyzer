/**
 * Memory Management Utilities
 * Handles memory optimization, garbage collection, and performance monitoring
 */

export class MemoryManager {
  constructor() {
    this.memoryUsageHistory = [];
    this.performanceMetrics = new Map();
    this.gcThreshold = 100 * 1024 * 1024; // 100MB threshold for GC suggestion
    this.monitoringInterval = null;
  }

  /**
   * Get current memory usage information
   */
  getMemoryUsage() {
    if (!performance.memory) {
      return {
        supported: false,
        message: 'Memory API not supported in this browser'
      };
    }

    const memInfo = {
      supported: true,
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      usedMB: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      totalMB: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
      usagePercentage: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100),
      timestamp: Date.now()
    };

    // Add to history for trending
    this.memoryUsageHistory.push(memInfo);
    
    // Keep only last 50 measurements
    if (this.memoryUsageHistory.length > 50) {
      this.memoryUsageHistory = this.memoryUsageHistory.slice(-50);
    }

    return memInfo;
  }

  /**
   * Check if memory usage is high and needs attention
   */
  isMemoryUsageHigh() {
    const usage = this.getMemoryUsage();
    if (!usage.supported) return false;

    return usage.usagePercentage > 80 || usage.used > this.gcThreshold;
  }

  /**
   * Suggest garbage collection if available
   */
  suggestGarbageCollection() {
    // Modern browsers don't expose window.gc() by default
    // This is mainly for development with --js-flags="--expose-gc"
    if (typeof window !== 'undefined' && window.gc) {
      console.log('🗑️ Suggesting garbage collection...');
      window.gc();
      return true;
    }

    // Alternative: Create temporary objects to trigger GC
    this.forceLightGarbageCollection();
    return false;
  }

  /**
   * Force light garbage collection by creating and releasing objects
   */
  forceLightGarbageCollection() {
    // Create and immediately release large objects to hint GC
    try {
      const largeArrays = [];
      for (let i = 0; i < 10; i++) {
        largeArrays.push(new Array(1000).fill(null));
      }
      // Let them go out of scope
      largeArrays.length = 0;
    } catch (error) {
      console.warn('Light GC hint failed:', error);
    }
  }

  /**
   * Monitor memory usage continuously
   */
  startMemoryMonitoring(callback, interval = 5000) {
    if (this.monitoringInterval) {
      this.stopMemoryMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      const usage = this.getMemoryUsage();
      
      if (callback) {
        callback(usage);
      }

      // Auto-suggest GC if memory is high
      if (this.isMemoryUsageHigh()) {
        console.warn(`⚠️ High memory usage detected: ${usage.usedMB}MB (${usage.usagePercentage}%)`);
        this.suggestGarbageCollection();
      }
    }, interval);

    console.log('📊 Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('📊 Memory monitoring stopped');
    }
  }

  /**
   * Get memory usage trends
   */
  getMemoryTrend() {
    if (this.memoryUsageHistory.length < 2) {
      return { trend: 'insufficient_data', change: 0 };
    }

    const recent = this.memoryUsageHistory.slice(-5); // Last 5 measurements
    const older = this.memoryUsageHistory.slice(-10, -5); // Previous 5 measurements

    if (older.length === 0) {
      return { trend: 'insufficient_data', change: 0 };
    }

    const recentAvg = recent.reduce((sum, item) => sum + item.used, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.used, 0) / older.length;
    
    const change = recentAvg - olderAvg;
    const changePercentage = Math.round((change / olderAvg) * 100);

    let trend;
    if (Math.abs(changePercentage) < 5) {
      trend = 'stable';
    } else if (changePercentage > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return {
      trend,
      change: changePercentage,
      recentAvgMB: Math.round(recentAvg / 1024 / 1024),
      olderAvgMB: Math.round(olderAvg / 1024 / 1024)
    };
  }

  /**
   * Clean up large objects and references
   */
  cleanup(objectsToClean = []) {
    try {
      // Clear provided objects
      objectsToClean.forEach(obj => {
        if (obj && typeof obj === 'object') {
          // Clear arrays
          if (Array.isArray(obj)) {
            obj.length = 0;
          }
          // Clear object properties
          else if (obj.constructor === Object) {
            Object.keys(obj).forEach(key => {
              delete obj[key];
            });
          }
        }
      });

      // Clear internal caches
      this.memoryUsageHistory = this.memoryUsageHistory.slice(-10); // Keep only last 10
      
      // Suggest garbage collection after cleanup
      setTimeout(() => {
        this.suggestGarbageCollection();
      }, 100);

      console.log('🧹 Memory cleanup completed');
    } catch (error) {
      console.error('Memory cleanup error:', error);
    }
  }

  /**
   * Optimize file processing memory usage
   */
  optimizeForFileProcessing() {
    return {
      // Recommended chunk sizes based on available memory
      getRecommendedChunkSize: () => {
        const usage = this.getMemoryUsage();
        if (!usage.supported) return 700; // Default

        const availableMB = usage.limitMB - usage.usedMB;
        
        if (availableMB > 500) return 1000; // Large chunks for lots of memory
        if (availableMB > 200) return 700;  // Default chunks
        if (availableMB > 100) return 500;  // Smaller chunks for limited memory
        return 300; // Very small chunks for low memory
      },

      // Check if we can process multiple files concurrently
      canProcessConcurrently: () => {
        const usage = this.getMemoryUsage();
        if (!usage.supported) return true; // Allow if we can't measure

        return usage.usagePercentage < 60; // Only if using less than 60% of memory
      },

      // Recommended processing mode
      getRecommendedProcessingMode: () => {
        const usage = this.getMemoryUsage();
        if (!usage.supported) return 'standard';

        if (usage.usagePercentage > 70) return 'memory_saver';
        if (usage.usagePercentage > 50) return 'balanced';
        return 'performance';
      }
    };
  }

  /**
   * Performance metrics tracking
   */
  startPerformanceTracking(operationName) {
    this.performanceMetrics.set(operationName, {
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
      name: operationName
    });
  }

  finishPerformanceTracking(operationName) {
    const metric = this.performanceMetrics.get(operationName);
    if (!metric) return null;

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    
    const result = {
      name: operationName,
      duration: Math.round(endTime - metric.startTime),
      memoryDelta: endMemory.supported ? endMemory.usedMB - metric.startMemory.usedMB : 0,
      startMemoryMB: metric.startMemory.usedMB || 0,
      endMemoryMB: endMemory.usedMB || 0,
      timestamp: Date.now()
    };

    this.performanceMetrics.delete(operationName);
    
    console.log(`📊 Performance: ${operationName} took ${result.duration}ms, memory delta: ${result.memoryDelta}MB`);
    
    return result;
  }

  /**
   * Get memory recommendations for the user
   */
  getMemoryRecommendations() {
    const usage = this.getMemoryUsage();
    const trend = this.getMemoryTrend();
    const recommendations = [];

    if (!usage.supported) {
      return [{
        type: 'info',
        message: 'Memory monitoring not available in this browser'
      }];
    }

    // High memory usage
    if (usage.usagePercentage > 80) {
      recommendations.push({
        type: 'warning',
        message: `High memory usage (${usage.usagePercentage}%). Consider closing other tabs or restarting the browser.`
      });
    }

    // Increasing memory trend
    if (trend.trend === 'increasing' && trend.change > 20) {
      recommendations.push({
        type: 'warning',
        message: 'Memory usage is increasing rapidly. Consider processing smaller files or fewer files at once.'
      });
    }

    // Memory optimization tips
    if (usage.usagePercentage > 60) {
      recommendations.push({
        type: 'tip',
        message: 'For better performance, try processing one file at a time and close unused browser tabs.'
      });
    }

    // Good memory state
    if (usage.usagePercentage < 50 && recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        message: `Memory usage is optimal (${usage.usagePercentage}%). You can process multiple files efficiently.`
      });
    }

    return recommendations;
  }

  /**
   * Memory-aware file processing configuration
   */
  getOptimalProcessingConfig() {
    const usage = this.getMemoryUsage();
    const optimizer = this.optimizeForFileProcessing();

    return {
      chunkSize: optimizer.getRecommendedChunkSize(),
      maxConcurrentFiles: optimizer.canProcessConcurrently() ? 2 : 1,
      processingMode: optimizer.getRecommendedProcessingMode(),
      streamingEnabled: usage.supported ? usage.usagePercentage < 70 : true,
      memoryUsage: usage,
      recommendations: this.getMemoryRecommendations()
    };
  }

  /**
   * Cleanup and destroy the memory manager
   */
  destroy() {
    this.stopMemoryMonitoring();
    this.memoryUsageHistory = [];
    this.performanceMetrics.clear();
    console.log('💥 Memory manager destroyed');
  }
}

// Create global instance
export const memoryManager = new MemoryManager();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryManager.destroy();
  });
}

export default MemoryManager;