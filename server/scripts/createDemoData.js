import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import Company from "#models/Company";
import User from "#models/User";
import Resource from "#models/Resource";
import AuditLog from "#models/AuditLog";
import SalaryStructure from "#models/SalaryStructure";

if(process.env.NODE_ENV==="production")throw new Error("Demo data script is disabled in production.");
const demos=[
 {name:"HCM Demo Alpha",domain:"alpha.hcm-demo.com",status:"active",adminPassword:"Admin01",hrPassword:"Hr001A",employeePasswords:["Emp001","Emp002"]},
 {name:"HCM Demo Beta",domain:"beta.hcm-demo.com",status:"active",adminPassword:"Admin02",hrPassword:"Hr002A",employeePasswords:["Emp101","Emp102"]},
 {name:"HCM Demo Rejected",domain:"rejected.hcm-demo.com",status:"rejected",adminPassword:"Reject1"}
];
const credentials=[];
const getOrCreate=async(query,make)=>await User.findOne(query)||await User.create(make);
try{
 await mongoose.connect(process.env.MONGODB_URI,{...(process.env.MONGODB_DB?{dbName:process.env.MONGODB_DB}:{}),serverSelectionTimeoutMS:8000,connectTimeoutMS:8000});
 const reviewer=await User.findOne({role:"SUPER_ADMIN",active:true}).select("_id").lean();
 for(const d of demos){
  let company=await Company.findOne({name:d.name});
  if(!company){let code;do{code=String(crypto.randomInt(0,1000000)).padStart(6,"0");}while(await Company.exists({code}));company=await Company.create({name:d.name,code,status:"pending",active:false});}
  const adminEmail=`admin@${d.domain}`,admin=await getOrCreate({company:company._id,email:adminEmail},{company:company._id,name:`${d.name} Admin`,email:adminEmail,password:await bcrypt.hash(crypto.randomBytes(8).toString("hex"),12),role:"ADMIN"});
  const beforeStatus=company.status;company.status=d.status;company.active=d.status==="active";company.reviewedBy=reviewer?._id;company.reviewedAt=company.reviewedAt||new Date();company.reviewNote=d.status==="active"?"Approved demo company":"Rejected demo company";await company.save();
  admin.password=await bcrypt.hash(d.adminPassword,12);admin.role="ADMIN";admin.active=company.active;admin.mustChangePassword=false;await admin.save();
  if(beforeStatus!==company.status||!await AuditLog.exists({company:company._id,action:`company.${d.status}`}))await AuditLog.create({company:company._id,actor:reviewer?._id??admin._id,action:`company.${d.status}`,entity:"company",entityId:String(company._id),details:{before:{status:beforeStatus},after:{status:company.status,active:company.active},note:company.reviewNote}});
  const item={company:company.name,status:company.status,companyCode:company.code,accounts:[{role:"Admin",email:adminEmail,password:d.adminPassword,active:company.active} ]};credentials.push(item);
  if(!company.active)continue;
  const department=await Resource.findOneAndUpdate({company:company._id,kind:"department",name:"Operations"},{$setOnInsert:{company:company._id,kind:"department",name:"Operations",createdBy:admin._id}},{upsert:true,returnDocument:"after"});
  const designation=await Resource.findOneAndUpdate({company:company._id,kind:"designation",name:"Associate"},{$setOnInsert:{company:company._id,kind:"designation",name:"Associate",createdBy:admin._id}},{upsert:true,returnDocument:"after"});
  for(const [name,quota,unlimited] of [["Annual",14,false],["Sick",8,false],["Casual",10,false],["Unpaid",undefined,true]])await Resource.findOneAndUpdate({company:company._id,kind:"leaveType",name},{$setOnInsert:{company:company._id,kind:"leaveType",name,quota,unlimited,createdBy:admin._id}},{upsert:true,returnDocument:"after"});
  const hrEmail=`hr@${d.domain}`,hr=await getOrCreate({company:company._id,email:hrEmail},{company:company._id,name:`${d.name} HR`,email:hrEmail,password:await bcrypt.hash(crypto.randomBytes(8).toString("hex"),12),role:"HR"});hr.password=await bcrypt.hash(d.hrPassword,12);hr.role="HR";hr.active=true;hr.mustChangePassword=true;hr.passwordChangedAt=new Date();await hr.save();item.accounts.push({role:"HR",email:hrEmail,password:d.hrPassword,active:true,mustChangePassword:true});
  for(let i=0;i<2;i++){const email=`employee${i+1}@${d.domain}`,password=d.employeePasswords[i],basic=50000+i*10000,employee=await getOrCreate({company:company._id,email},{company:company._id,name:`${d.name} Employee ${i+1}`,email,password:await bcrypt.hash(crypto.randomBytes(8).toString("hex"),12),role:"EMPLOYEE"});employee.password=await bcrypt.hash(password,12);employee.role="EMPLOYEE";employee.active=true;employee.mustChangePassword=true;employee.passwordChangedAt=new Date();employee.basicSalary=basic;employee.department=department._id;employee.designation=designation._id;employee.hireDate=employee.hireDate||new Date();employee.gender=i%2===0?"female":"male";await employee.save();if(!await SalaryStructure.exists({company:company._id,employee:employee._id}))await SalaryStructure.create({company:company._id,employee:employee._id,basic,hra:basic*.4,medical:basic*.1,gross:basic*1.5,effectiveFrom:employee.hireDate,createdBy:admin._id});item.accounts.push({role:`Employee ${i+1}`,email,password,active:true,mustChangePassword:true});}
 }
 console.log("Demo fixtures are ready. HR and Employee accounts require a password change at first sign-in.");console.log(JSON.stringify(credentials,null,2));
}catch(error){console.error(`Demo data could not be completed: ${error.message}`);process.exitCode=1;}finally{await mongoose.disconnect().catch(()=>{});}
