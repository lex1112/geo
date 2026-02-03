import { Job } from "./Job";
import { Task } from "../models/Task";
import { sleep } from "../utils/sleep";

export class EmailNotificationJob implements Job {
  async run(task: Task): Promise<void> {
    console.log(
      `EmailNotificationJob is running for task with input ${task.input}...`,
    );
    // Perform notification work
    await sleep();
    console.log("Email sent!");
  }
}
