import 'dotenv/config'

interface CONFIG {
  server: string;
  queueName: string;
  username: string;
  password: string;
  pollInterval: number;
  retryDelay: number;
  maxRetries: number;
}

class StepikGraderService {
  private readonly config: CONFIG;
  private isRunning: boolean;
  sessionCookie: string;

  constructor(config: CONFIG) {
    console.log(config)
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

        return {
          xqueue_header: json.xqueue_header,
          xqueue_files: json.xqueue_files.length > 0 ? JSON.parse(json.xqueue_files) : '',
          xqueue_body: JSON.parse(json.xqueue_body)
        }
      }

      console.log('Статус:', data);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Ошибка получения задания:', error.message);
      }
      return null;
    }
  }

  async submitResult(result: object, header: string) {
    try {

      const params = new URLSearchParams();
      params.append('xqueue_body', JSON.stringify(result));
      params.append('xqueue_header', header);


      const response = await fetch(`${this.config.server}/xqueue/put_result/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.sessionCookie
        },
        body: params.toString()
      })

      await response.json();
    } catch (error) {
    }
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

  async login() {
    try {
      const params = new URLSearchParams();
      params.append('username', this.config.username);
      params.append('password', this.config.password);

      const response = await fetch(`${this.config.server}/xqueue/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const setCookieHeader = response.headers.get('set-cookie');
      this.sessionCookie = this.parseSetCookie(setCookieHeader);

      const data = await response.json();

      return data.return_code === 0;
    } catch (error) {
      console.log("ERROR: ", error);
    }
  }

  async run() {
    this.isRunning = true;
    await this.login();

    const submission = await this.getSubmission();

    const result = this.handleSubmission(submission.xqueue_body.student_response);

    await this.submitResult(result, submission.xqueue_header);

  }

  stop() {
    console.log('Получен сигнал остановки...');
    this.isRunning = false;
  }

  parseSetCookie(setCookieHeader: string | null) {
    if (!setCookieHeader) return '';

    const cookies = [];
    const parts = setCookieHeader.split(',');

    for (const part of parts) {
      const match = part.trim().match(/^([^;]+)/);
      if (match) {
        cookies.push(match[1].trim());
      }
    }

    return cookies.join('; ');
  }
}

const grader = new StepikGraderService({
  server: 'https://stepik.org/api',
  queueName: process.env.QUEUE_NAME_TESTING,
  username: process.env.QUEUE_USERNAME,
  password: process.env.QUEUE_PASSWORD,
  pollInterval: parseInt(process.env.POLL_INTERVAL),
  retryDelay: 5000,
  maxRetries: 3
});

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