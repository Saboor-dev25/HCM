import mongoose from "mongoose";
export const ROLES=["SUPER_ADMIN","ADMIN","HR","EMPLOYEE"];
const schema=new mongoose.Schema({company:{type:mongoose.Schema.Types.ObjectId,ref:"Company",index:true},name:{type:String,required:true,trim:true,maxlength:80},email:{type:String,required:true,lowercase:true,trim:true,maxlength:254},password:{type:String,required:true,select:false},role:{type:String,enum:ROLES,required:true},active:{type:Boolean,default:true},mustChangePassword:{type:Boolean,default:false},passwordChangedAt:Date,basicSalary:{type:Number,min:0},department:{type:mongoose.Schema.Types.ObjectId,ref:"Resource"},designation:{type:mongoose.Schema.Types.ObjectId,ref:"Resource"},hireDate:Date,terminatedAt:Date,gender:{type:String,enum:["female","male"],default:undefined},phone:{type:String,trim:true,maxlength:40},address:{type:String,trim:true,maxlength:300},leaveBalances:{type:Map,of:Number,default:{}}},{timestamps:true});
schema.pre("validate",function(){if(this.role==="SUPER_ADMIN"){this.company=undefined;}else if(!this.company){this.invalidate("company","Company is required for company users.");}});
schema.index({company:1,email:1},{unique:true});
export default mongoose.model("User",schema);

