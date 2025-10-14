import 'dotenv/config';

export interface CONFIG {
  server: string;
  queueName: string;
  username: string;
  password: string;
  pollInterval: number;
}

export const config = {
  server: 'https://stepik.org/api',
  queueName: process.env.QUEUE_NAME_TESTING,
  username: process.env.QUEUE_USERNAME,
  password: process.env.QUEUE_PASSWORD,
  pollInterval: 5000,
}
