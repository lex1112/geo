"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PolygonAreaJob_1 = require("./PolygonAreaJob");
const area_1 = require("@turf/area");
const sleep_1 = require("../utils/sleep");
// Mock dependencies
jest.mock("@turf/area");
jest.mock("../utils/sleep", () => ({
    sleep: jest.fn()
}));
describe("PolygonAreaJob", () => {
    let job;
    let mockTask;
    beforeEach(() => {
        job = new PolygonAreaJob_1.PolygonAreaJob();
        // Create a mock object that satisfies the Task type 
        // by casting a Partial to Task
        mockTask = {
            taskId: "test-id",
            geoJson: JSON.stringify({
                type: "Polygon",
                coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]]
            }),
            output: ""
        };
        jest.clearAllMocks();
        sleep_1.sleep.mockResolvedValue(undefined);
    });
    it("should calculate area correctly and assign it as a string to output", async () => {
        const expectedArea = 100.5;
        // Cast the mock return value to ensure type safety
        area_1.area.mockReturnValue(expectedArea);
        await job.run(mockTask);
        expect(sleep_1.sleep).toHaveBeenCalled();
        expect(area_1.area).toHaveBeenCalledWith(expect.objectContaining({
            type: "Polygon"
        }));
        expect(mockTask.output).toBe("100.5");
    });
    it("should throw an error when geoJson is missing", async () => {
        mockTask.geoJson = undefined;
        const runPromise = job.run(mockTask);
        await expect(runPromise).rejects.toThrow("Missing geoJson data for area calculation.");
    });
    it("should handle JSON parsing errors", async () => {
        mockTask.geoJson = "{ invalid json }";
        const runPromise = job.run(mockTask);
        await expect(runPromise).rejects.toThrow(SyntaxError);
    });
    it("should handle valid empty polygons by returning zero area", async () => {
        area_1.area.mockReturnValue(0);
        await job.run(mockTask);
        expect(mockTask.output).toBe("0");
    });
});
