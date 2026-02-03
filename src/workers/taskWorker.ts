import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { Task } from "../models/Task";
import { TaskRunner } from "./taskRunner";
import { TaskStatus } from "./TaskStatus";
import { sleep } from "../utils/sleep";

/**
 * Looks at a window of queued tasks and processes the first one that is ready.
 * @returns true if a task was successfully processed, false if no ready tasks were found.
 */
export async function processTasksWindow(
  taskRepository: Repository<Task>,
  taskRunner: TaskRunner,
): Promise<boolean> {
  // Fetch a window of candidates (e.g., top 20)
  // Sorting by taskId (001, 002...) ensures we respect the YAML order
  const queuedTasks = await taskRepository.find({
    where: { status: TaskStatus.Queued },
    relations: ["workflow", "workflow.tasks", "dependency"],
    take: 3,
  });

  if (queuedTasks.length === 0) {
    return false;
  }

  // Find the first task in the window that is actually ready to run
  const taskToRun = queuedTasks.find((task) => {
    // Check Dependency Logic
    if (task.dependency) {
      // If parent failed, this task is "ready" to be marked as Failed
      if (task.dependency.status === TaskStatus.Failed) return true;
      // If parent not completed, this task is NOT ready
      if (task.dependency.status !== TaskStatus.Completed) return false;
    }

    // Check Report Generation Logic
    if (task.taskType === "reportGeneration") {
      const hasPending = task.workflow.tasks
        .filter((t) => t.taskType !== "reportGeneration")
        .some(
          (t) => ![TaskStatus.Completed, TaskStatus.Failed].includes(t.status),
        );

      // If siblings are still running, this report is NOT ready
      if (hasPending) return false;
    }

    // If it passed the checks above, it's ready!
    return true;
  });

  if (!taskToRun) {
    // All tasks in the window are currently blocked by dependencies
    return false;
  }

  // Execution Block
  try {
    // Handle failed dependency propagation immediately
    if (taskToRun.dependency?.status === TaskStatus.Failed) {
      taskToRun.status = TaskStatus.Failed;
      taskToRun.output = `Blocked by failed dependency: ${taskToRun.dependsOnId}`;
      await taskRepository.save(taskToRun);
      return true;
    }

    await taskRunner.run(taskToRun);
    return true;
  } catch (error) {
    console.error(`Execution failed for task ${taskToRun.taskId}:`, error);
    // We return true so the worker tries the next available task immediately
    return true;
  }
}

export async function taskWorker() {
  const taskRepository = AppDataSource.getRepository(Task);
  const taskRunner = new TaskRunner(taskRepository);

  while (true) {
    try {
      const hasProcessed = await processTasksWindow(taskRepository, taskRunner);

      // If a task was processed, loop again immediately.
      // If no tasks were ready (empty or blocked), sleep for 5s.
      await sleep(hasProcessed ? 10 : 5000);
    } catch (error) {
      console.error("Critical worker loop error:", error);
      await sleep(10000);
    }
  }
}
