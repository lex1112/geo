import { Repository } from "typeorm";
import { Task, TaskStatus } from "../models/Task";
import { Workflow} from "../models/Workflow";
import { Result } from "../models/Result";

// 1. Import the module as an object
import * as JobFactory from "../jobs/JobFactory";
import { TaskRunner } from "./taskRunner";
import { Job } from "../jobs/Job";

describe("TaskRunner", () => {
  let runner: TaskRunner;
  let taskRepo: jest.Mocked<Repository<Task>>;
  let workflowRepo: jest.Mocked<Repository<Workflow>>;
  let resultRepo: jest.Mocked<Repository<Result>>;
  
  let statusHistory: string[] = [];

  beforeEach(() => {
    statusHistory = [];

    // Mock implementation that captures the status string IMMEDIATELY
    const snapshotSave = jest.fn().mockImplementation((entity: Task) => {
      if (entity?.status) statusHistory.push(entity.status);
      return Promise.resolve(entity);
    });

    taskRepo = {
      save: snapshotSave,
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Task>>;

    workflowRepo = {
      save: jest.fn().mockImplementation((wf) => Promise.resolve(wf)),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Workflow>>;

    resultRepo = {
      save: jest.fn().mockResolvedValue({ resultId: "res-999" } as Result),
    } as unknown as jest.Mocked<Repository<Result>>;

    runner = new TaskRunner(taskRepo, workflowRepo, resultRepo);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should transition from InProgress to Completed", async () => {
    const task = new Task();
    task.taskId = "task-1";
    task.taskType = "test-type";
    task.workflow = { workflowId: "wf-1" } as Workflow;

    const mockJob = { run: jest.fn().mockResolvedValue(undefined) };
    const jobSpy = jest.spyOn(JobFactory, "getJobForTaskType").mockReturnValue(mockJob as Job);

    workflowRepo.findOne.mockResolvedValue({
      workflowId: "wf-1",
      tasks: [task],
    } as Workflow);

    await runner.run(task);

    expect(statusHistory[0]).toBe(TaskStatus.InProgress);
    expect(statusHistory).toContain(TaskStatus.Completed);
    
    expect(jobSpy).toHaveBeenCalledWith("test-type");
  });

  it("should handle job failure", async () => {
    const task = new Task();
    task.workflow = { workflowId: "wf-1" } as Workflow;
    
    const error = new Error("Job Failed");
    const mockJob = { run: jest.fn().mockRejectedValue(error) };
    jest.spyOn(JobFactory, "getJobForTaskType").mockReturnValue(mockJob as Job);

    await expect(runner.run(task)).rejects.toThrow("Job Failed");

    expect(statusHistory).toContain(TaskStatus.Failed);
  });
});
