import mongoose from "mongoose";
const schema=new mongoose.Schema({company:{type:mongoose.Schema.Types.ObjectId,ref:"Company",required:true,index:true},user:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},title:{type:String,required:true},message:{type:String,required:true},readAt:Date,link:String},{timestamps:true});
schema.index({company:1,user:1,createdAt:-1});export default mongoose.model("Notification",schema);
