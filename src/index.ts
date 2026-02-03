import "reflect-metadata";
import express from "express";
import analysisRoutes from "./routes/analysisRoutes";
import defaultRoute from "./routes/defaultRoute";
import { taskWorker } from "./workers/taskWorker";
import { AppDataSource } from "./data-source"; // Import the DataSource instance
import workflowRoute from "./routes/workflowRoute";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const app = express();

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

  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const specs = swaggerJsdoc(swaggerOptions);

app.use(express.json());

app.use("/", defaultRoute);
app.use("/api", swaggerUi.serve, swaggerUi.setup(specs));
app.use("/analysis", analysisRoutes);
app.use("/workflow", workflowRoute);

AppDataSource.initialize()
  .then(() => {
    taskWorker();

    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  })
  .catch((error) => console.log(error));
