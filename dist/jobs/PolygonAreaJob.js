"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolygonAreaJob = void 0;
const sleep_1 = require("../utils/sleep");
const area_1 = require("@turf/area");
class PolygonAreaJob {
    async run(task) {
        console.log(`PolygonAreaJob is running...`);
        // Yield control to the Event Loop
        await (0, sleep_1.sleep)();
        // Validate input GeoJSON existence
        if (!task.geoJson) {
            throw new Error("Missing geoJson data for area calculation.");
        }
        // Parse and calculate area
        const inputGeometry = JSON.parse(task.geoJson);
        // Calculate area using Turf.js
        const calculatedArea = (0, area_1.area)(inputGeometry);
        task.output = String(calculatedArea);
    }
}
exports.PolygonAreaJob = PolygonAreaJob;
