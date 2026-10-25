import mongoose from "mongoose";
const schema=new mongoose.Schema({company:{type:mongoose.Schema.Types.ObjectId,ref:"Company",required:true,index:true},employee:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},leaveType:{type:mongoose.Schema.Types.ObjectId,ref:"Resource",required:true},startDate:{type:Date,required:true},endDate:{type:Date,required:true},days:{type:Number,required:true,min:1},reason:{type:String,required:true,maxlength:1000},status:{type:String,enum:["pending","approved","rejected"],default:"pending"},hrComment:{type:String,maxlength:1000},reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User"},reviewedAt:Date},{timestamps:true});
schema.index({company:1,employee:1,startDate:1,endDate:1});
export default mongoose.model("LeaveRequest",schema);
