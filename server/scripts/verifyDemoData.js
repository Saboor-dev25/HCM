import "dotenv/config";
import mongoose from "mongoose";
import Company from "#models/Company";
import {login} from "#services/authService";

const cases=[
 {name:"HCM Demo Alpha",domain:"alpha.hcm-demo.com",status:"active",passwords:["Admin01","Hr001A","Emp001","Emp002"]},
 {name:"HCM Demo Beta",domain:"beta.hcm-demo.com",status:"active",passwords:["Admin02","Hr002A","Emp101","Emp102"]},
 {name:"HCM Demo Rejected",domain:"rejected.hcm-demo.com",status:"rejected",passwords:["Reject1"]}
];
try{
 await mongoose.connect(process.env.MONGODB_URI,{...(process.env.MONGODB_DB?{dbName:process.env.MONGODB_DB}:{}),serverSelectionTimeoutMS:8000,connectTimeoutMS:8000});
 const results=[];
 for(const d of cases){const company=await Company.findOne({name:d.name});if(!company)throw new Error(`${d.name} is missing.`);const emails=[`admin@${d.domain}`,...(d.status==="active"?[`hr@${d.domain}`,`employee1@${d.domain}`,`employee2@${d.domain}`]:[])];for(let i=0;i<emails.length;i++){if(d.status==="rejected"){let denied=false;try{await login({identifier:emails[i],password:d.passwords[i],companyCode:company.code});}catch(e){denied=e.status===401;}if(!denied)throw new Error("Rejected company account unexpectedly authenticated.");results.push({company:d.name,email:emails[i],loginBlocked:true});}else{const session=await login({identifier:emails[i],password:d.passwords[i],companyCode:company.code});if(!session.user.active)throw new Error(`Inactive account: ${emails[i]}`);results.push({company:d.name,email:emails[i],role:session.user.role,loginValid:true,mustChangePassword:session.user.mustChangePassword});}}}
 console.log(JSON.stringify({verified:true,accounts:results},null,2));
}catch(error){console.error(`Demo verification failed: ${error.message}`);process.exitCode=1;}finally{await mongoose.disconnect().catch(()=>{});}
