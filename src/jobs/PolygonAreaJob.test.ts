import { PolygonAreaJob } from "./PolygonAreaJob";
import { Task } from "../models/Task";
import * as turfArea from "@turf/area"; // Import as a module object
import * as sleepModule from "../utils/sleep";

describe("PolygonAreaJob", () => {
  let job: PolygonAreaJob;
  let mockTask: Task;

  beforeEach(() => {
    job = new PolygonAreaJob();

    mockTask = {
      taskId: "test-id",
      geoJson: JSON.stringify({
        type: "Polygon",
        coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]]
      }),
      output: ""
    } as Task;

    // Spy on sleep
    jest.spyOn(sleepModule, "sleep").mockResolvedValue(undefined);
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should calculate area correctly and assign it as a string to output", async () => {
    const expectedArea = 100.5;
    
    // Fix: Spy on the 'area' property of the turfArea module
    const areaSpy = jest.spyOn(turfArea, "area").mockReturnValue(expectedArea);

    await job.run(mockTask);

    expect(sleepModule.sleep).toHaveBeenCalled();
    expect(areaSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: "Polygon"
    }));
    expect(mockTask.output).toBe("100.5");
  });

  it("should throw an error when geoJson is missing", async () => {
    mockTask.geoJson = undefined as unknown as string;

    await expect(job.run(mockTask)).rejects.toThrow("Missing geoJson data for area calculation.");
  });

  it("should handle JSON parsing errors", async () => {
    mockTask.geoJson = "{ invalid json }";

    await expect(job.run(mockTask)).rejects.toThrow(SyntaxError);
  });

  it("should handle valid empty polygons by returning zero area", async () => {
    jest.spyOn(turfArea, "area").mockReturnValue(0);

    await job.run(mockTask);

    expect(mockTask.output).toBe("0");
  });
});
