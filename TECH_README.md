
🛠 How to Run
Install Dependencies:
  -npm install

Development Mode:
  -npm run dev
Linter and prettier:
  -npm run lint
  -npm run format

The server runs on http://localhost:3000. The background worker starts automatically once the database initializes.

  -npm run build
  -npm run start

🧪 Testing Guide
The project uses Jest with a focus on capturing asynchronous state transitions.
Running Tests
  -npm test
Coverage Report: npm test -- --coverage
Watch Mode: npm run test:watch

📖 API Documentation (Swagger)
Interactive API documentation is generated via Swagger JSDoc.
Swagger UI: http://localhost:3000/api
