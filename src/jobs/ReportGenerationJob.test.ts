import { ReportGenerationJob } from "./ReportGenerationJob";
import { Task, TaskStatus } from "../models/Task";
import * as sleepModule from "../utils/sleep";

describe("ReportGenerationJob", () => {
  let job: ReportGenerationJob;
  let mockTask: Task;
  let sleepSpy: jest.SpiedFunction<typeof sleepModule.sleep>;

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

    sleepSpy = jest.spyOn(sleepModule, "sleep").mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Always clear or restore spies to avoid memory leaks/interference
    sleepSpy.mockRestore();
  });

  it("should successfully aggregate tasks and set status to Completed", async () => {
    await job.run(mockTask);

    // Verify sleep was called
    expect(sleepSpy).toHaveBeenCalledTimes(1);

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
