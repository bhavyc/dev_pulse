import { logger } from '../utils/logger';

export class WorkerPool {
  private activeChecks: Set<string> = new Set();
  private maxConcurrency: number;
  private runningCount = 0;
  private queue: (() => Promise<void>)[] = [];

  constructor(maxConcurrency = 10) {
    this.maxConcurrency = maxConcurrency;
  }

  isMonitorRunning(monitorId: string): boolean {
    return this.activeChecks.has(monitorId);
  }

  async runTask(monitorId: string, task: () => Promise<void>): Promise<void> {
    if (this.activeChecks.has(monitorId)) {
      logger.debug(`Skipping probe for monitor ${monitorId}: check already in progress.`);
      return;
    }

    this.activeChecks.add(monitorId);

    const execute = async () => {
      this.runningCount++;
      try {
        await task();
      } catch (err) {
        logger.error(`Error executing probe for monitor ${monitorId}:`, err);
      } finally {
        this.activeChecks.delete(monitorId);
        this.runningCount--;
        this.processNext();
      }
    };

    if (this.runningCount < this.maxConcurrency) {
      execute();
    } else {
      this.queue.push(execute);
    }
  }

  private processNext() {
    if (this.runningCount < this.maxConcurrency && this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  getActiveCount(): number {
    return this.runningCount;
  }
}
