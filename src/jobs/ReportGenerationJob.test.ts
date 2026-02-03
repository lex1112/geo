import { ReportGenerationJob } from "./ReportGenerationJob";
import { Task } from "../models/Task";
import { TaskStatus } from "../workers/taskRunner";
import * as sleep from "../utils/sleep";

describe("ReportGenerationJob", () => {
  let job: ReportGenerationJob;
  let mockTask: Task;

  beforeEach(() => {
    job = new ReportGenerationJob();

    mockTask = {
      taskId: "report-001",
      taskType: "reportGeneration",
      status: TaskStatus.Queued,
      output: "",
      workflow: {
        workflowId: "wf-123",
        tasks: [
          {
            taskId: "task-1",
            taskType: "analysis",
            output: "Result 1",
            status: TaskStatus.Completed
          } as Task,
          {
            taskId: "report-001", // The report task itself
            taskType: "reportGeneration",
            output: "",
            status: TaskStatus.Queued
          } as Task
        ]
      }
    } as Task;

    jest.clearAllMocks();
  });

  it("should successfully aggregate tasks and set status to Completed", async () => {
    await job.run(mockTask);

    // Verify sleep was called
    expect(sleep).toHaveBeenCalledTimes(1);

    // Verify status update
    expect(mockTask.status).toBe(TaskStatus.Completed);

    // Verify output content
    const parsedOutput = JSON.parse(mockTask.output as string);
    expect(parsedOutput.workflowId).toBe("wf-123");
    expect(parsedOutput.tasks).toHaveLength(1); // Excludes itself
    expect(parsedOutput.tasks[0].taskId).toBe("task-1");
    expect(parsedOutput.finalReport).toBe("Aggregated data from 1 tasks.");
  });

  it("should throw error if workflow or tasks are missing", async () => {
    // Creating a task without a workflow safely
    const brokenTask = {
      taskId: "err-1",
      workflow: undefined
    } as unknown as Task;
    const sleepSpy = jest.spyOn(sleep, "sleep").mockResolvedValue(undefined);
    await expect(job.run(brokenTask)).rejects.toThrow(
      "Workflow data or related tasks are missing for report generation."
    );
    sleepSpy.mockRestore();
  });

  it("should handle a workflow with only the report task itself", async () => {
    // Workflow with no other tasks
    mockTask.workflow!.tasks = [mockTask];

    await job.run(mockTask);

    const parsedOutput = JSON.parse(mockTask.output as string);
    expect(parsedOutput.tasks).toHaveLength(0);
    expect(parsedOutput.finalReport).toBe("Aggregated data from 0 tasks.");
  });
});
