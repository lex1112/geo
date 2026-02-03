import { Job } from "./Job";
import { Task } from "../models/Task";
import booleanWithin from "@turf/boolean-within";
import { Feature, MultiPolygon, Polygon } from "geojson";
import countryMapping from "../data/world_data.json";
import { sleep } from "../utils/sleep";

export class DataAnalysisJob implements Job {
  async run(task: Task): Promise<void> {
    console.log(
      `DataAnalysisJob is running...`,
    );
    const inputGeometry: Feature<Polygon> = JSON.parse(task.geoJson);

    for (const countryFeature of countryMapping.features) {
      await sleep();

      if (["Polygon", "MultiPolygon"].includes(countryFeature.geometry.type)) {
        if (
          booleanWithin(
            inputGeometry,
            countryFeature as Feature<Polygon | MultiPolygon>,
          )
        ) {
          task.output = countryFeature.properties?.name || "Unknown";
          return;
        }
      }
    }
    task.output = "No country found";
  }
}
