import { JavaScriptExecutor, GraderService } from "./grader-service";
import { config } from "./config";

const executor = new JavaScriptExecutor();
const grader = new GraderService(executor, config);

process.on('SIGINT', () => {
  grader.stop();
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  grader.stop();
  setTimeout(() => process.exit(0), 1000);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Необработанное исключение:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанный reject:', reason);
});

grader.run();