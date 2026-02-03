"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const analysisRoutes_1 = __importDefault(require("./routes/analysisRoutes"));
const defaultRoute_1 = __importDefault(require("./routes/defaultRoute"));
const taskWorker_1 = require("./workers/taskWorker");
const data_source_1 = require("./data-source"); // Import the DataSource instance
const workflowRoute_1 = __importDefault(require("./routes/workflowRoute"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const app = (0, express_1.default)();
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Geo Analysis API",
            version: "1.0.0",
            description: "API for processing GeoJSON workflows",
        },
        servers: [{ url: "http://localhost:3000" }],
    },
    apis: ["./src/routes/*.ts", "./src/routes/*.js"],
};
const specs = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use(express_1.default.json());
app.use("/", defaultRoute_1.default);
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs));
app.use("/analysis", analysisRoutes_1.default);
app.use("/workflow", workflowRoute_1.default);
data_source_1.AppDataSource.initialize()
    .then(() => {
    // Start the worker after successful DB connection
    (0, taskWorker_1.taskWorker)();
    app.listen(3000, () => {
        console.log("Server is running at http://localhost:3000");
    });
})
    .catch((error) => console.log(error));
