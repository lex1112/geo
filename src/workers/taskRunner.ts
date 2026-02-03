import { Repository } from "typeorm";
import { Task, TaskStatus } from "../models/Task";
import { getJobForTaskType } from "../jobs/JobFactory";
import { Workflow } from "../models/Workflow";
import { Result } from "../models/Result";
import { WorkflowStatus } from "../workflows/WorkflowStatus";

export class TaskRunner {
  constructor(private taskRepository: Repository<Task>) {}

  async run(task: Task): Promise<void> {
    const workflowId = task.workflow.workflowId;

    try {
      // Initial State Update
      task.status = TaskStatus.InProgress;
      task.progress = "Starting job...";
      await this.taskRepository.save(task);

      // Resolve Dependencies
      if (task.dependsOnId) {
        const dependency = await this.taskRepository.findOne({
          where: { taskId: task.dependsOnId },
          select: { status: true, output: true },
        });

        if (dependency?.status === TaskStatus.Completed && dependency.output) {
          task.input = dependency.output;
        }
      }

      const job = getJobForTaskType(task.taskType);

      try {
        // Execute the actual work
        await job.run(task);

        // Atomic Transaction: Save result and update task status
        await this.taskRepository.manager.transaction(async (tm) => {
          const result = await tm.save(Result, {
            taskId: task.taskId,
            data: JSON.stringify(task.output),
          });

          task.resultId = result.resultId;
          task.status = TaskStatus.Completed;
          task.progress = null;
          await tm.save(task);
        });
      } catch (error) {
        // Handle failure: Update task status before re-throwing
        task.status = TaskStatus.Failed;
        task.progress = error instanceof Error ? error.message : String(error);
        await this.taskRepository.save(task);
        throw error;
      }
    } finally {
      // Guaranteed Workflow Sync
      // Runs on both success and failure to ensure workflow status matches task states
      await this.syncWorkflowStatus(workflowId);
    }
  }

  private async syncWorkflowStatus(workflowId: string): Promise<void> {
    await this.taskRepository.manager.transaction(async (tm) => {
      const workflow = await tm.findOne(Workflow, {
        where: { workflowId },
        relations: ["tasks"],
      });

      if (!workflow) return;

      const { tasks } = workflow;
      const anyFailed = tasks.some((t) => t.status === TaskStatus.Failed);
      const allCompleted = tasks.every(
        (t) => t.status === TaskStatus.Completed,
      );
      const allFinished = tasks.every((t) =>
        [TaskStatus.Completed, TaskStatus.Failed].includes(t.status),
      );

      // Determine new workflow status
      if (anyFailed) workflow.status = WorkflowStatus.Failed;
      else if (allCompleted) workflow.status = WorkflowStatus.Completed;
      else workflow.status = WorkflowStatus.InProgress;

      // Aggregate final result if all tasks reached a terminal state
      if (allFinished) {
        workflow.finalResult = JSON.stringify({
          totalTasks: tasks.length,
          finishedAt: new Date().toISOString(),
          results: tasks.map((t) => ({
            taskId: t.taskId,
            type: t.taskType,
            status: t.status,
            output: this.safeParse(t.output),
            error: t.status === TaskStatus.Failed ? t.progress : null,
          })),
        });
      }

      await tm.save(workflow);
    });
  }

  private safeParse(data: string | null): unknown {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
}

export { TaskStatus };
