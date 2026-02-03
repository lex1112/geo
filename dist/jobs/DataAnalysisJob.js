"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataAnalysisJob = void 0;
const boolean_within_1 = __importDefault(require("@turf/boolean-within"));
const world_data_json_1 = __importDefault(require("../data/world_data.json"));
const sleep_1 = require("../utils/sleep");
class DataAnalysisJob {
    async run(task) {
        console.log(`DataAnalysisJob is running...`);
        const inputGeometry = JSON.parse(task.geoJson);
        for (const countryFeature of world_data_json_1.default.features) {
            await (0, sleep_1.sleep)();
            if (["Polygon", "MultiPolygon"].includes(countryFeature.geometry.type)) {
                if ((0, boolean_within_1.default)(inputGeometry, countryFeature)) {
                    task.output = countryFeature.properties?.name || "Unknown";
                    return;
                }
            }
        }
        task.output = "No country found";
    }
}
exports.DataAnalysisJob = DataAnalysisJob;
