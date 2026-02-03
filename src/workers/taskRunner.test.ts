import { Task } from "../models/Task";
import { TaskStatus } from "./TaskStatus";
import { WorkflowStatus } from "../workflows/WorkflowStatus";
import { getJobForTaskType } from "../jobs/JobFactory";
import { Repository } from "typeorm";
import { TaskRunner } from "./taskRunner";
import { Result } from "../models/Result";
import { Workflow } from "../models/Workflow";
import { Job } from "../jobs/Job";

// Mock the Job Factory
jest.mock("../jobs/JobFactory");
const mockedGetJob = getJobForTaskType as jest.MockedFunction<
  typeof getJobForTaskType
>;

describe("TaskRunner", () => {
  let taskRunner: TaskRunner;

  // Explicitly type the mocks using jest.Mocked
  let mockTaskRepo: jest.Mocked<Repository<Task>>;
  let mockResultRepo: jest.Mocked<Repository<Result>>;
  let mockWorkflowRepo: jest.Mocked<Repository<Workflow>>;

  beforeEach(() => {
    // Create a typed mock for the Result Repository
    mockResultRepo = {
      save: jest.fn().mockResolvedValue({ resultId: "res-123" }),
      // Add other methods if needed
    } as unknown as jest.Mocked<Repository<Result>>;

    // Create a typed mock for the Workflow Repository
    mockWorkflowRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Workflow>>;

    // Create the Task Repository mock and link the Manager
    mockTaskRepo = {
      save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
      findOne: jest.fn(),
      manager: {
        // Typed implementation of getRepository
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Result) return mockResultRepo;
          if (entity === Workflow) return mockWorkflowRepo;
          return null;
        }),
      },
    } as unknown as jest.Mocked<Repository<Task>>;

    taskRunner = new TaskRunner(mockTaskRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should complete task successfully and update workflow to Completed", async () => {
    // Arrange
    const task = {
      taskId: "task-1",
      taskType: "test-type",
      workflow: { workflowId: "wf-1" },
    } as Task;

    const mockJob = { run: jest.fn().mockResolvedValue({ some: "output" }) };
    mockedGetJob.mockReturnValue(mockJob as Job);

    const mockWorkflow = {
      workflowId: "wf-1",
      tasks: [
        { status: TaskStatus.Completed },
        { status: TaskStatus.Completed },
      ],
    } as Workflow;
    mockWorkflowRepo.findOne.mockResolvedValue(mockWorkflow);

    // Act
    await taskRunner.run(task);

    // Assert
    expect(task.status).toBe(TaskStatus.Completed);
    expect(mockTaskRepo.save).toHaveBeenCalled();
    expect(mockResultRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: "task-1" }),
    );
    expect(mockWorkflowRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: WorkflowStatus.Completed }),
    );
  });

  it("should resolve input from dependency if dependsOnId is present", async () => {
    // Arrange
    const task = {
      taskId: "task-2",
      dependsOnId: "task-1",
      taskType: "child",
      workflow: { workflowId: "wf-1" },
    } as Task;

    const dependencyTask = {
      taskId: "task-1",
      status: TaskStatus.Completed,
      output: { data: "hello" },
    };

    mockTaskRepo.findOne.mockResolvedValue(dependencyTask as unknown as Task);
    const mockJob = { run: jest.fn().mockResolvedValue({}) };
    mockedGetJob.mockReturnValue(mockJob as Job);

    // Act
    await taskRunner.run(task);

    // Assert
    expect(task.input).toEqual({ data: "hello" });
    expect(mockTaskRepo.findOne).toHaveBeenCalledWith({
      where: { taskId: "task-1" },
    });
  });

  it("should set status to Failed and rethrow error if job fails", async () => {
    // Arrange
    const task = {
      taskId: "task-3",
      taskType: "fail-type",
      workflow: { workflowId: "wf-1" },
    } as Task;

    const jobError = new Error("Job Crash");
    const mockJob = { run: jest.fn().mockRejectedValue(jobError) };
    mockedGetJob.mockReturnValue(mockJob as Job);

    // Act & Assert
    await expect(taskRunner.run(task)).rejects.toThrow("Job Crash");
    expect(task.status).toBe(TaskStatus.Failed);
    expect(mockTaskRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: TaskStatus.Failed }),
    );
  });

  it("should set workflow to Failed if any task fails", async () => {
    // Arrange
    const task = {
      taskId: "t1",
      taskType: "type",
      workflow: { workflowId: "wf-1" },
    } as Task;
    mockedGetJob.mockReturnValue({
      run: jest.fn().mockResolvedValue({}),
    } as Job);

    const mockWorkflow = {
      tasks: [{ status: TaskStatus.Completed }, { status: TaskStatus.Failed }],
    } as Workflow;
    mockWorkflowRepo.findOne.mockResolvedValue(mockWorkflow);

    // Act
    await taskRunner.run(task);

    // Assert
    expect(mockWorkflowRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: WorkflowStatus.Failed }),
    );
  });
});
