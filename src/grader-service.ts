import type {CONFIG} from "./config";
import {parseSetCookie} from "./utils/parseCookie";

interface Submission {
  studentResponse: string;
  graderPayload: object;
}

interface Result {
  score: number;
  msg: string;
}

abstract class CodeExecutor {
  abstract execute(submission: Submission): Result
}

export class JavaScriptExecutor implements CodeExecutor {
  execute(submission: Submission): Result {
    return this.handleSubmission(submission.studentResponse);
  }

  handleSubmission(studentCode: string) {
    const wrongResult = {
      score: 0,
      msg: "Something is incorrect, try again!",
    }
    const correctResult = {
      score: 1,
      msg: "Good job!",
    }
    return studentCode === "42" ? correctResult : wrongResult;
  }
}

export class GraderService {
  private readonly config: CONFIG;
  private isRunning: boolean;
  sessionCookie: string;
  private executor: CodeExecutor;

  constructor(executor: CodeExecutor, config: CONFIG) {
    console.log(config);
    this.executor = executor;
    this.config = config;
    this.sessionCookie = null;
    this.isRunning = false;
  }

  async getSubmission() {
    try {
      const url = `${this.config.server}/xqueue/get_submission/?queue_name=${this.config.queueName}`;

      const response = await fetch(url, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      const data = await response.json();

      if (data.return_code === 0) {
        const json = JSON.parse(data.content);
        const body = JSON.parse(json.xqueue_body);

        const result = this.executor.execute({
          studentResponse: body.student_response,
          graderPayload: body.grader_payload,
        });

        await this.submitResult(result, json.xqueue_header);
      } else {
        console.warn(data.return_code, data.content);
        return null;
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Ошибка получения задания:', error.message);
      }
      return null;
    }
  }

  async submitResult(result: object, header: string) {
    try {
      const params = new URLSearchParams({
        xqueue_header: header,
        xqueue_body: JSON.stringify(result)
      });

      await fetch(`${this.config.server}/xqueue/put_result/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.sessionCookie
        },
        body: params.toString()
      })
    } catch (error) {
      console.log("Отправка результата проверки не удалась", error);
    }
  }

  async login() {
    try {
      const params = new URLSearchParams({
        username: this.config.username,
        password: this.config.password,
      });

      const response = await fetch(`${this.config.server}/xqueue/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const setCookieHeader = response.headers.get('set-cookie');
      this.sessionCookie = parseSetCookie(setCookieHeader);

      const data = await response.json();

      console.log(data);
      return data.return_code === 0;
    } catch (error) {
      console.log("ERROR: ", error);
    }
  }

  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    await this.login();

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.getSubmission();

        await this.sleep(this.config.pollInterval);
      } catch (error) {
        console.error('Ошибка: ', error.message);
        await this.sleep(this.config.pollInterval);
      }
    }
  }

  stop() {
    console.log('Получен сигнал остановки...');
    this.isRunning = false;
  }
}