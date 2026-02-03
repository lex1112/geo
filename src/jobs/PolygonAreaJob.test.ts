import { PolygonAreaJob } from "./PolygonAreaJob";
import { Task } from "../models/Task";
import { area } from "@turf/area";
import { sleep } from "../utils/sleep";

// Mock dependencies
jest.mock("@turf/area");
jest.mock("../utils/sleep", () => ({
  sleep: jest.fn()
}));

describe("PolygonAreaJob", () => {
  let job: PolygonAreaJob;
  let mockTask: Task;

  beforeEach(() => {
    job = new PolygonAreaJob();
    
    // Create a mock object that satisfies the Task type 
    // by casting a Partial to Task
    mockTask = {
      taskId: "test-id",
      geoJson: JSON.stringify({
        type: "Polygon",
        coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]]
      }),
      output: ""
    } as Task;

    jest.clearAllMocks();
    (sleep as jest.Mock).mockResolvedValue(undefined);
  });

  it("should calculate area correctly and assign it as a string to output", async () => {
    const expectedArea = 100.5;
    // Cast the mock return value to ensure type safety
    (area as jest.Mock).mockReturnValue(expectedArea);

    await job.run(mockTask);

    expect(sleep).toHaveBeenCalled();
    expect(area).toHaveBeenCalledWith(expect.objectContaining({
      type: "Polygon"
    }));
    expect(mockTask.output).toBe("100.5");
  });

  it("should throw an error when geoJson is missing", async () => {

    mockTask.geoJson = undefined as unknown as string;

    const runPromise = job.run(mockTask);

    await expect(runPromise).rejects.toThrow("Missing geoJson data for area calculation.");
  });

  it("should handle JSON parsing errors", async () => {
    mockTask.geoJson = "{ invalid json }";

    const runPromise = job.run(mockTask);

    await expect(runPromise).rejects.toThrow(SyntaxError);
  });

  it("should handle valid empty polygons by returning zero area", async () => {
    (area as jest.Mock).mockReturnValue(0);
    
    await job.run(mockTask);

    expect(mockTask.output).toBe("0");
  });
});
