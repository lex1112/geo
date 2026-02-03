import { Repository } from "typeorm";
import { Task, TaskStatus } from "../models/Task";
import { getJobForTaskType } from "../jobs/JobFactory";
import { Workflow } from "../models/Workflow";
import { Result } from "../models/Result";
import { WorkflowStatus } from "../workflows/WorkflowStatus";

export class TaskRunner {
  // Pass all repositories directly for easier mocking
  constructor(
    private taskRepository: Repository<Task>,
    private workflowRepository: Repository<Workflow>,
    private resultRepository: Repository<Result>
  ) { }

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

      try {

        const job = getJobForTaskType(task.taskType);

        await job.run(task);

        // 3. Save Result
        const result = await this.resultRepository.save({
          taskId: task.taskId,
          data: JSON.stringify(task.output),
        } as Result);

        // 4. Update Task to Completed
        task.resultId = result.resultId;
        task.status = TaskStatus.Completed;
        task.progress = null;
        await this.taskRepository.save(task);

      } catch (error) {
        task.status = TaskStatus.Failed;
        task.progress = error instanceof Error ? error.message : String(error);
        await this.taskRepository.save(task);
        throw error;
      }
    } finally {
      await this.syncWorkflowStatus(workflowId);
    }
  }

  private async syncWorkflowStatus(workflowId: string): Promise<void> {
    const workflow = await this.workflowRepository.findOne({
      where: { workflowId },
      relations: ["tasks"],
    });

    if (!workflow) return;

    const { tasks } = workflow;
    const anyFailed = tasks.some((t) => t.status === TaskStatus.Failed);
    const allCompleted = tasks.every((t) => t.status === TaskStatus.Completed);
    const allFinished = tasks.every((t) =>
      [TaskStatus.Completed, TaskStatus.Failed].includes(t.status)
    );

    workflow.status = anyFailed ? WorkflowStatus.Failed :
      allCompleted ? WorkflowStatus.Completed :
        WorkflowStatus.InProgress;

    if (allFinished) {
      workflow.finalResult = JSON.stringify({
        totalTasks: tasks.length,
        finishedAt: new Date().toISOString(),
        results: tasks.map((t) => ({
          taskId: t.taskId,
          status: t.status,
          output: this.safeParse(t.output),
        })),
      });
    }

    await this.workflowRepository.save(workflow);
  }

  private safeParse(data: string | null): unknown {
    if (!data) return null;
    try { return JSON.parse(data); } catch { return data; }
  }
}
