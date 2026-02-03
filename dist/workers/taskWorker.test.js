"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TaskStatus_1 = require("./TaskStatus");
const taskWorker_1 = require("./taskWorker");
describe("processTasksWindow", () => {
    let mockTaskRepo;
    let mockTaskRunner;
    beforeEach(() => {
        mockTaskRepo = {
            find: jest.fn(),
            save: jest.fn(),
        };
        mockTaskRunner = {
            run: jest.fn(),
        };
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it("should return false if no queued tasks are found in the window", async () => {
        mockTaskRepo.find.mockResolvedValue([]); // Returns empty array
        const result = await (0, taskWorker_1.processTasksWindow)(mockTaskRepo, mockTaskRunner);
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
                    { taskId: "001-rep", status: TaskStatus_1.TaskStatus.Queued },
                    { taskId: "002-work", status: TaskStatus_1.TaskStatus.InProgress },
                ],
            },
        };
        const readyTask = {
            taskId: "002-work",
            taskType: "sync",
            dependency: null,
        };
        // Mock returning a window with both tasks
        mockTaskRepo.find.mockResolvedValue([blockedReport, readyTask]);
        const result = await (0, taskWorker_1.processTasksWindow)(mockTaskRepo, mockTaskRunner);
        expect(result).toBe(true);
        // Verify it skipped the first one and ran the second one
        expect(mockTaskRunner.run).toHaveBeenCalledWith(readyTask);
        expect(mockTaskRunner.run).not.toHaveBeenCalledWith(blockedReport);
    });
    it("should fail task immediately if dependency status is Failed", async () => {
        const task = {
            taskId: "002-work",
            dependency: { status: TaskStatus_1.TaskStatus.Failed },
            dependsOnId: "001-parent",
        };
        mockTaskRepo.find.mockResolvedValue([task]);
        const result = await (0, taskWorker_1.processTasksWindow)(mockTaskRepo, mockTaskRunner);
        expect(result).toBe(true);
        expect(task.status).toBe(TaskStatus_1.TaskStatus.Failed);
        expect(mockTaskRepo.save).toHaveBeenCalledWith(task);
        expect(mockTaskRunner.run).not.toHaveBeenCalled();
    });
    it("should return false if all tasks in the window are blocked", async () => {
        const blockedTask = {
            taskId: "002-work",
            dependency: { status: TaskStatus_1.TaskStatus.InProgress },
        };
        mockTaskRepo.find.mockResolvedValue([blockedTask]);
        const result = await (0, taskWorker_1.processTasksWindow)(mockTaskRepo, mockTaskRunner);
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
                        status: TaskStatus_1.TaskStatus.Queued,
                        taskType: "reportGeneration",
                    },
                    {
                        taskId: "001-work",
                        status: TaskStatus_1.TaskStatus.Completed,
                        taskType: "sync",
                    },
                    { taskId: "002-work", status: TaskStatus_1.TaskStatus.Failed, taskType: "sync" },
                ],
            },
        };
        mockTaskRepo.find.mockResolvedValue([reportTask]);
        const result = await (0, taskWorker_1.processTasksWindow)(mockTaskRepo, mockTaskRunner);
        expect(result).toBe(true);
        expect(mockTaskRunner.run).toHaveBeenCalledWith(reportTask);
    });
    it("should handle errors from taskRunner by catching them and returning true", async () => {
        const task = { taskId: "001-work", taskType: "sync" };
        mockTaskRepo.find.mockResolvedValue([task]);
        mockTaskRunner.run.mockRejectedValue(new Error("Runner crash"));
        const result = await (0, taskWorker_1.processTasksWindow)(mockTaskRepo, mockTaskRunner);
        expect(result).toBe(true); // Processed (even if failed) so worker continues
        expect(mockTaskRunner.run).toHaveBeenCalled();
    });
});
