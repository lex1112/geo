"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TaskStatus_1 = require("./TaskStatus");
const WorkflowStatus_1 = require("../workflows/WorkflowStatus");
const JobFactory_1 = require("../jobs/JobFactory");
const taskRunner_1 = require("./taskRunner");
const Result_1 = require("../models/Result");
const Workflow_1 = require("../models/Workflow");
// Mock the Job Factory
jest.mock("../jobs/JobFactory");
const mockedGetJob = JobFactory_1.getJobForTaskType;
describe("TaskRunner", () => {
    let taskRunner;
    // Explicitly type the mocks using jest.Mocked
    let mockTaskRepo;
    let mockResultRepo;
    let mockWorkflowRepo;
    beforeEach(() => {
        // Create a typed mock for the Result Repository
        mockResultRepo = {
            save: jest.fn().mockResolvedValue({ resultId: "res-123" }),
            // Add other methods if needed
        };
        // Create a typed mock for the Workflow Repository
        mockWorkflowRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
        };
        // Create the Task Repository mock and link the Manager
        mockTaskRepo = {
            save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
            findOne: jest.fn(),
            manager: {
                // Typed implementation of getRepository
                getRepository: jest.fn().mockImplementation((entity) => {
                    if (entity === Result_1.Result)
                        return mockResultRepo;
                    if (entity === Workflow_1.Workflow)
                        return mockWorkflowRepo;
                    return null;
                }),
            },
        };
        taskRunner = new taskRunner_1.TaskRunner(mockTaskRepo);
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
        };
        const mockJob = { run: jest.fn().mockResolvedValue({ some: "output" }) };
        mockedGetJob.mockReturnValue(mockJob);
        const mockWorkflow = {
            workflowId: "wf-1",
            tasks: [
                { status: TaskStatus_1.TaskStatus.Completed },
                { status: TaskStatus_1.TaskStatus.Completed },
            ],
        };
        mockWorkflowRepo.findOne.mockResolvedValue(mockWorkflow);
        // Act
        await taskRunner.run(task);
        // Assert
        expect(task.status).toBe(TaskStatus_1.TaskStatus.Completed);
        expect(mockTaskRepo.save).toHaveBeenCalled();
        expect(mockResultRepo.save).toHaveBeenCalledWith(expect.objectContaining({ taskId: "task-1" }));
        expect(mockWorkflowRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: WorkflowStatus_1.WorkflowStatus.Completed }));
    });
    it("should resolve input from dependency if dependsOnId is present", async () => {
        // Arrange
        const task = {
            taskId: "task-2",
            dependsOnId: "task-1",
            taskType: "child",
            workflow: { workflowId: "wf-1" },
        };
        const dependencyTask = {
            taskId: "task-1",
            status: TaskStatus_1.TaskStatus.Completed,
            output: { data: "hello" },
        };
        mockTaskRepo.findOne.mockResolvedValue(dependencyTask);
        const mockJob = { run: jest.fn().mockResolvedValue({}) };
        mockedGetJob.mockReturnValue(mockJob);
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
        };
        const jobError = new Error("Job Crash");
        const mockJob = { run: jest.fn().mockRejectedValue(jobError) };
        mockedGetJob.mockReturnValue(mockJob);
        // Act & Assert
        await expect(taskRunner.run(task)).rejects.toThrow("Job Crash");
        expect(task.status).toBe(TaskStatus_1.TaskStatus.Failed);
        expect(mockTaskRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: TaskStatus_1.TaskStatus.Failed }));
    });
    it("should set workflow to Failed if any task fails", async () => {
        // Arrange
        const task = {
            taskId: "t1",
            taskType: "type",
            workflow: { workflowId: "wf-1" },
        };
        mockedGetJob.mockReturnValue({
            run: jest.fn().mockResolvedValue({}),
        });
        const mockWorkflow = {
            tasks: [{ status: TaskStatus_1.TaskStatus.Completed }, { status: TaskStatus_1.TaskStatus.Failed }],
        };
        mockWorkflowRepo.findOne.mockResolvedValue(mockWorkflow);
        // Act
        await taskRunner.run(task);
        // Assert
        expect(mockWorkflowRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: WorkflowStatus_1.WorkflowStatus.Failed }));
    });
});
