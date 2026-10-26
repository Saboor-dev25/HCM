import "dotenv/config";
import app from "./app.js";
import initializeDatabase from "#config/initializeDatabase";
const PORT=process.env.PORT||5000;
await initializeDatabase();
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
