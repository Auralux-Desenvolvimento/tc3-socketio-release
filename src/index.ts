require("dotenv").config();
import createConnection from "./database";
import httpServer from "./app";

createConnection().then(() => {
  const port = process.env.PORT;
  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`CORS origin: ${process.env.FRONTEND_ORIGIN}`);
  });
})
.catch((error) => {
  console.error("Failed to start the server", error);
});