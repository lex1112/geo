import { Task } from "../models/Task";
import { sleep } from "../utils/sleep";
import { Job } from "./Job";
import { area } from "@turf/area";

export class PolygonAreaJob implements Job {
  async run(task: Task): Promise<void> {
     console.log(
      `PolygonAreaJob is running...`,
    );
    // Yield control to the Event Loop
    await sleep();

    // Validate input GeoJSON existence
    if (!task.geoJson) {
      throw new Error("Missing geoJson data for area calculation.");
    }

    // Parse and calculate area
    const inputGeometry = JSON.parse(task.geoJson);

    // Calculate area using Turf.js
    const calculatedArea = area(inputGeometry);

    task.output = String(calculatedArea);
  }
}
