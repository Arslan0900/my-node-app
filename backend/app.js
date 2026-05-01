const http = require("http");

const server = http.createServer((req, res) => {
  // Allow CORS (important for frontend)
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.end("Hello from Backend dev arslan");
});

server.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
