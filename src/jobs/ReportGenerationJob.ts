import { Task, TaskStatus } from "../models/Task";
import { sleep } from "../utils/sleep";
import { Job } from "./Job";

export class ReportGenerationJob implements Job {
  async run(task: Task): Promise<void> {
    console.log(
      `ReportGenerationJob is running...`,
    );
    const workflow = task.workflow;

    // Validate that workflow and tasks exist
    if (!workflow?.tasks) {
      throw new Error(
        "Workflow data or related tasks are missing for report generation.",
      );
    }

    // Briefly yield control to the Event Loop before processing
    await sleep();

    // Aggregate outputs from all tasks except the current one
    const taskSummaries = workflow.tasks
      .filter((t) => t.taskId !== task.taskId)
      .map((t) => ({
        taskId: t.taskId,
        type: t.taskType,
        output: t.output,
      }));

    // Construct the report as a plain object (not a string)
    const report = {
      workflowId: workflow.workflowId,
      tasks: taskSummaries,
      finalReport: `Aggregated data from ${taskSummaries.length} tasks.`,
    };

    task.output = JSON.stringify(report);
    task.status = TaskStatus.Completed;
  }
}
