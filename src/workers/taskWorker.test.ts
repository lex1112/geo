import { Repository } from "typeorm";
import { Task } from "../models/Task";
import { TaskStatus } from "./TaskStatus";
import { TaskRunner } from "./taskRunner";
import { processTasksWindow } from "./taskWorker";
describe("processTasksWindow", () => {
  let mockTaskRepo: jest.Mocked<Repository<Task>>;
  let mockTaskRunner: jest.Mocked<TaskRunner>;

  beforeEach(() => {
    mockTaskRepo = {
      find: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Task>>;

    mockTaskRunner = {
      run: jest.fn(),
    } as unknown as jest.Mocked<TaskRunner>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return false if no queued tasks are found in the window", async () => {
    mockTaskRepo.find.mockResolvedValue([]); // Returns empty array

    const result = await processTasksWindow(mockTaskRepo, mockTaskRunner);

    expect(result).toBe(false);
    expect(mockTaskRunner.run).not.toHaveBeenCalled();
  });

  it("should skip a blocked report and execute the next ready standard task", async () => {
    // SCENARIO: Task 1 is a report waiting for others, Task 2 is ready
    const blockedReport = {
      taskId: "001-rep",
      taskType: "reportGeneration",
      workflow: {
        tasks: [
          { taskId: "001-rep", status: TaskStatus.Queued },
          { taskId: "002-work", status: TaskStatus.InProgress },
        ],
      },
    } as Task;

    const readyTask = {
      taskId: "002-work",
      taskType: "sync",
      dependency: null,
    } as unknown as Task;

    // Mock returning a window with both tasks
    mockTaskRepo.find.mockResolvedValue([blockedReport, readyTask]);

    const result = await processTasksWindow(mockTaskRepo, mockTaskRunner);

    expect(result).toBe(true);
    // Verify it skipped the first one and ran the second one
    expect(mockTaskRunner.run).toHaveBeenCalledWith(readyTask);
    expect(mockTaskRunner.run).not.toHaveBeenCalledWith(blockedReport);
  });

  it("should fail task immediately if dependency status is Failed", async () => {
    const task = {
      taskId: "002-work",
      dependency: { status: TaskStatus.Failed },
      dependsOnId: "001-parent",
    } as Task;

    mockTaskRepo.find.mockResolvedValue([task]);

    const result = await processTasksWindow(mockTaskRepo, mockTaskRunner);

    expect(result).toBe(true);
    expect(task.status).toBe(TaskStatus.Failed);
    expect(mockTaskRepo.save).toHaveBeenCalledWith(task);
    expect(mockTaskRunner.run).not.toHaveBeenCalled();
  });

  it("should return false if all tasks in the window are blocked", async () => {
    const blockedTask = {
      taskId: "002-work",
      dependency: { status: TaskStatus.InProgress },
    } as Task;

    mockTaskRepo.find.mockResolvedValue([blockedTask]);

    const result = await processTasksWindow(mockTaskRepo, mockTaskRunner);

    expect(result).toBe(false); // No task was ready to run
    expect(mockTaskRunner.run).not.toHaveBeenCalled();
  });

  it("should execute reportGeneration if all siblings are Completed or Failed", async () => {
    const reportTask = {
      taskId: "003-rep",
      taskType: "reportGeneration",
      workflow: {
        tasks: [
          {
            taskId: "003-rep",
            status: TaskStatus.Queued,
            taskType: "reportGeneration",
          },
          {
            taskId: "001-work",
            status: TaskStatus.Completed,
            taskType: "sync",
          },
          { taskId: "002-work", status: TaskStatus.Failed, taskType: "sync" },
        ],
      },
    } as Task;

    mockTaskRepo.find.mockResolvedValue([reportTask]);

    const result = await processTasksWindow(mockTaskRepo, mockTaskRunner);

    expect(result).toBe(true);
    expect(mockTaskRunner.run).toHaveBeenCalledWith(reportTask);
  });

  it("should handle errors from taskRunner by catching them and returning true", async () => {
    const task = { taskId: "001-work", taskType: "sync" } as Task;
    mockTaskRepo.find.mockResolvedValue([task]);
    mockTaskRunner.run.mockRejectedValue(new Error("Runner crash"));

    const result = await processTasksWindow(mockTaskRepo, mockTaskRunner);

    expect(result).toBe(true); // Processed (even if failed) so worker continues
    expect(mockTaskRunner.run).toHaveBeenCalled();
  });
});
