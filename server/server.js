import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "#config/db";
import Company from "#models/Company";
import User from "#models/User";
const PORT=process.env.PORT||5000;
await connectDB();
// Migrate the earlier single-company schema and indexes to the approval-based multi-company model.
await Company.updateMany({status:{$exists:false}},{$set:{status:"active",active:true}});
for(const index of ["singleton_1"]){try{await Company.collection.dropIndex(index);}catch(error){if(error.code!==27&&error.codeName!=="IndexNotFound")throw error;}}
try{await mongoose.connection.collection("users").dropIndex("email_1");}catch(error){if(error.code!==27&&error.codeName!=="IndexNotFound")throw error;}
await Promise.all([Company.createIndexes(),User.createIndexes()]);
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
