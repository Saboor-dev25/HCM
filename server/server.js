import "dotenv/config";
import app from "./app.js";
import initializeDatabase from "#config/initializeDatabase";
import {reconcileCurrentDayAbsences} from "#services/attendanceService";
const PORT=process.env.PORT||5000;
await initializeDatabase();
app.listen(PORT,()=>{
 console.log(`Server running on port ${PORT}`);
 let reconciling=false;
 const reconcile=async()=>{
  if(reconciling)return;
  reconciling=true;
  try{await reconcileCurrentDayAbsences();}catch(error){console.error("Automatic attendance reconciliation failed:",error);}finally{reconciling=false;}
 };
 reconcile();
 const timer=setInterval(reconcile,60_000);
 timer.unref();
});
