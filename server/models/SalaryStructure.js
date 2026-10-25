import mongoose from "mongoose";
const schema=new mongoose.Schema({company:{type:mongoose.Schema.Types.ObjectId,ref:"Company",required:true,index:true},employee:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},basic:{type:Number,required:true,min:0},hra:{type:Number,required:true,min:0},medical:{type:Number,required:true,min:0},gross:{type:Number,required:true,min:0},effectiveFrom:{type:Date,required:true},effectiveTo:Date,createdBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true}},{timestamps:true});
schema.index({company:1,employee:1,effectiveFrom:-1});
export default mongoose.model("SalaryStructure",schema);
