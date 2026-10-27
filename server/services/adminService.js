import AuditLog from "#models/AuditLog";
import Company from "#models/Company";
import Resource from "#models/Resource";
import User from "#models/User";
import Attendance from "#models/Attendance";
import AttendanceCorrectionRequest from "#models/AttendanceCorrectionRequest";
import LeaveRequest from "#models/LeaveRequest";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
const fail = (message, status=400)=>{throw Object.assign(new Error(message),{status});};
const temporaryPassword=()=>Array.from({length:6},()=>"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"[crypto.randomInt(0,56)]).join("");
export async function writeAudit(user, action, entity, entityId, details={}) { await AuditLog.create({ company:user.company, actor:user._id, action, entity, entityId:String(entityId||""), details }); }
export async function dashboard(user) {
 const company=await Company.findById(user.company).select("name settings code");
 const [employees,payroll,departments,recentActivity]=await Promise.all([
  User.find({company:user.company,active:true,role:"EMPLOYEE"}).select("basicSalary department").lean(),
  Resource.find({company:user.company,kind:"payroll"}).sort({createdAt:-1}).limit(12).lean(),
  Resource.find({company:user.company,kind:"department",active:true}).lean(),
  AuditLog.find({company:user.company}).sort({createdAt:-1}).limit(8).populate("actor","name").lean()
 ]);
 const finalized=payroll.filter(x=>x.metadata?.status==="finalized");
 const departmentCounts=new Map();
 for(const employee of employees){if(employee.department){const id=String(employee.department);departmentCounts.set(id,(departmentCounts.get(id)||0)+1);}}
 const departmentsWithCounts=departments.map(d=>({_id:d._id,name:d.name,headcount:departmentCounts.get(String(d._id))||0}));
 const salaryValues=employees.map(e=>Number(e.basicSalary)).filter(x=>Number.isFinite(x)&&x>0);
 const costs=finalized.map(x=>Number(x.amount)||0);
 return {company,metrics:{headcount:employees.length,payrollCost:costs.reduce((a,b)=>a+b,0),averageSalary:salaryValues.length?salaryValues.reduce((a,b)=>a+b,0)/salaryValues.length:null,attrition:null,payrollRecords:finalized.length,departments:departmentsWithCounts},recentActivity};
}export async function listResource(company, kind) { return Resource.find({company,kind}).sort({createdAt:-1}).lean(); }
export async function createResource(user, kind, body) { const allowed=["department","designation","leaveType","holiday","announcement"]; if(!allowed.includes(kind)) fail("Unsupported resource type.");if(user.role==="HR"&&kind!=="announcement")fail("HR can only publish announcements.",403); const name=(body.name||body.title||"").trim(); if(!name) fail("A name or title is required.");if(kind==="leaveType"&&body.quota===undefined&&!['annual','sick','casual','unpaid'].includes(name.toLowerCase()))fail("Set a yearly quota or use Annual, Sick, Casual, or Unpaid.");const resource=await Resource.create({company:user.company,kind,name,title:body.title||name,description:body.description,quota:body.quota,unlimited:body.unlimited===true,amount:body.amount,date:body.date,active:body.active!==false,createdBy:user._id}); await writeAudit(user,`${kind}.created`,kind,resource._id,{after:{name,description:resource.description,active:resource.active}}); return resource; }
export async function updateResource(user, id, body) { const resource=await Resource.findOne({ _id:id,company:user.company }); if(!resource) fail("Record not found.",404);if(resource.kind==="payroll")fail("Payroll snapshots cannot be edited.",409);const before={name:resource.name,title:resource.title,description:resource.description,quota:resource.quota,active:resource.active}; ["name","title","description","quota","unlimited","amount","date","active"].forEach(k=>{if(body[k]!==undefined)resource[k]=body[k];}); await resource.save();const after={name:resource.name,title:resource.title,description:resource.description,quota:resource.quota,active:resource.active}; await writeAudit(user,`${resource.kind}.updated`,resource.kind,id,{before,after}); return resource; }
export async function deleteResource(user,id) { const r=await Resource.findOne({company:user.company,_id:id}); if(!r)fail("Record not found.",404);if(r.kind==="payroll")fail("Payroll snapshots cannot be deleted.",409);await r.deleteOne(); await writeAudit(user,`${r.kind}.deleted`,r.kind,id,{before:{name:r.name,title:r.title}}); }
export async function updateSettings(user,body) {
 const keys=["officeStart","officeEnd","graceMinutes","halfDayHours","weekendDays","latitude","longitude","radiusMeters"];
 const settings={};
 for(const key of keys) if(body[key]!==undefined) settings[key]=body[key];
 const validTime=value=>typeof value==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
 for(const key of ["officeStart","officeEnd"]){
  if(settings[key]!==undefined&&!validTime(settings[key])) fail("Office hours must use HH:MM 24-hour time.");
 }
 if(settings.graceMinutes!==undefined&&(!Number.isInteger(settings.graceMinutes)||settings.graceMinutes<0||settings.graceMinutes>120)) fail("Grace period must be 0–120 minutes.");
 if(settings.halfDayHours!==undefined&&(!Number.isFinite(settings.halfDayHours)||settings.halfDayHours<1||settings.halfDayHours>12)) fail("Half-day threshold must be 1–12 hours.");
 if(settings.weekendDays!==undefined){
  if(!Array.isArray(settings.weekendDays)||settings.weekendDays.some(day=>!Number.isInteger(day)||day<0||day>6)) fail("Weekend days are invalid.");
  settings.weekendDays=[...new Set(settings.weekendDays)];
 }
 for(const key of ["latitude","longitude"]){
  if(settings[key]!==undefined&&settings[key]!==null&&settings[key]!==""&&!Number.isFinite(Number(settings[key]))) fail(`${key} must be a valid number.`);
  if(settings[key]==="") settings[key]=undefined;
  else if(settings[key]!==undefined&&settings[key]!==null) settings[key]=Number(settings[key]);
 }
 if(settings.radiusMeters!==undefined&&(!Number.isFinite(settings.radiusMeters)||settings.radiusMeters<1||settings.radiusMeters>10000)) fail("Attendance radius must be 1–10,000 meters.");
 const company=await Company.findById(user.company);
 if(!company) fail("Company not found.",404);
 const before=company.settings.toObject();
 company.settings={...before,...settings};
 await company.save();
 await writeAudit(user,"company.settings.updated","company",company._id,{before,after:company.settings.toObject()});
 return company;
}
export async function createHr(user, body) { if(!body.name||!body.email)fail("Name and email are required."); const email=String(body.email).trim().toLowerCase(); if(await User.exists({company:user.company,email}))fail("An account with this email already exists.",409); const temp=temporaryPassword(); const created=await User.create({company:user.company,name:body.name.trim(),email,password:await bcrypt.hash(temp,12),role:"HR",mustChangePassword:true}); await writeAudit(user,"hr.created","user",created._id,{email}); return {user:{id:created._id,name:created.name,email:created.email,role:created.role,active:created.active},temporaryPassword:temp}; }
export async function setUserStatus(user,id,active) { const target=await User.findOne({_id:id,company:user.company,role:"HR"}); if(!target)fail("HR account not found.",404);const before={active:target.active}; target.active=active; await target.save(); await writeAudit(user,active?"hr.activated":"hr.deactivated","user",id,{before,after:{active:target.active}}); return {id:target._id,active:target.active}; }
export async function deleteHr(user,id) { const target=await User.findOne({_id:id,company:user.company,role:"HR"}); if(!target)fail("HR account not found.",404);await target.deleteOne();await writeAudit(user,"hr.deleted","user",id,{before:{name:target.name,email:target.email}}); }
export async function resetHrPassword(user,id) { const target=await User.findOne({_id:id,company:user.company,role:"HR"}); if(!target)fail("HR account not found.",404); const temp=temporaryPassword(); target.password=await bcrypt.hash(temp,12); target.mustChangePassword=true; target.passwordChangedAt=new Date(); await target.save(); await writeAudit(user,"hr.password_reset","user",id); return {temporaryPassword:temp}; }
export async function listAudit(user) { return AuditLog.find({company:user.company}).sort({createdAt:-1}).limit(200).populate("actor","name email").lean(); }

export async function hrDashboard(user){
 const now=new Date(),today=now.toISOString().slice(0,10),startDate=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-29)),from=startDate.toISOString().slice(0,10);
 const [company,employees,todayRows,todayLeaveRows,todayHoliday,pendingLeaves,pendingCorrections,records,lateRows,leaveRows]=await Promise.all([
  Company.findById(user.company).select("settings"),User.find({company:user.company,role:"EMPLOYEE",active:true}).select("_id name department").populate("department","name").lean(),
  Attendance.find({company:user.company,day:today}).populate("employee","name").lean(),LeaveRequest.find({company:user.company,status:"approved",startDate:{$lte:new Date(`${today}T23:59:59.999Z`)},endDate:{$gte:new Date(`${today}T00:00:00.000Z`)}}).select("employee").lean(),Resource.exists({company:user.company,kind:"holiday",active:true,date:{$gte:new Date(`${today}T00:00:00.000Z`),$lte:new Date(`${today}T23:59:59.999Z`)}}),LeaveRequest.countDocuments({company:user.company,status:"pending"}),AttendanceCorrectionRequest.countDocuments({company:user.company,status:"pending"}),
  Attendance.find({company:user.company,day:{$gte:from,$lte:today}}).select("day status employee").populate({path:"employee",select:"department",populate:{path:"department",select:"name"}}).lean(),
  Attendance.find({company:user.company,day:{$gte:from,$lte:today},status:"late"}).populate("employee","name").lean(),LeaveRequest.find({company:user.company,status:"approved",startDate:{$gte:startDate}}).populate("leaveType","name").select("days leaveType").lean()
 ]);
 const byEmployee=new Map(todayRows.map(r=>[String(r.employee?._id||r.employee),r])),leaveEmployees=new Set(todayLeaveRows.map(l=>String(l.employee))),weekend=(company?.settings.weekendDays||[0,6]).includes(new Date(`${today}T00:00:00Z`).getUTCDay())||Boolean(todayHoliday),[officeHour,officeMinute]=(company?.settings.officeStart||"09:00").split(":").map(Number),absenceCutoff=new Date(`${today}T${String(officeHour).padStart(2,"0")}:${String(officeMinute).padStart(2,"0")}:00.000Z`),todayStats={present:0,absent:0,late:0,leave:0};absenceCutoff.setUTCHours(absenceCutoff.getUTCHours()+1);const absenceDue=now>=absenceCutoff;
 for(const e of employees){const id=String(e._id),r=byEmployee.get(id);if(leaveEmployees.has(id)){todayStats.leave++;continue;}if(r){const k=r.status==="late"?"late":r.status==="leave"?"leave":r.status==="absent"?"absent":"present";todayStats[k]++;}else if(!weekend&&absenceDue)todayStats.absent++;}
 const trend={};for(let i=29;i>=0;i--){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-i)),key=d.toISOString().slice(0,10);trend[key]={present:0,absent:0,late:0,leave:0};}
 const departments=new Map(),late=new Map(),leaveDistribution={};for(const r of records){if(trend[r.day]){const k=r.status==="half-day"?"present":r.status;if(trend[r.day][k]!==undefined)trend[r.day][k]++;}const name=r.employee?.department?.name||"Unassigned",d=departments.get(name)||{department:name,absent:0,records:0};d.records++;if(["absent","leave"].includes(r.status))d.absent++;departments.set(name,d);}
 for(const r of lateRows){const n=r.employee?.name||"Unknown";late.set(n,(late.get(n)||0)+1);}for(const l of leaveRows){const n=l.leaveType?.name||"Other";leaveDistribution[n]=(leaveDistribution[n]||0)+l.days;}
 return{metrics:{headcount:employees.length,today:todayStats,pendingLeaves,pendingCorrections},attendanceTrends:Object.entries(trend).map(([day,v])=>({day,...v})),departmentAbsenteeism:[...departments.values()].map(d=>({...d,rate:d.records?d.absent/d.records:0})),leaveDistribution,topLatecomers:[...late].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,5)};
}
export async function adminDashboard(user){const now=new Date(),start=new Date(Date.UTC(now.getUTCFullYear(),0,1)),end=new Date(Date.UTC(now.getUTCFullYear()+1,0,1));const [company,employees,former,departments,payroll,departivations,recentActivity]=await Promise.all([Company.findById(user.company).select("name settings code"),User.find({company:user.company,role:"EMPLOYEE",active:true}).select("basicSalary department hireDate gender createdAt").lean(),User.find({company:user.company,role:"EMPLOYEE",terminatedAt:{$gte:start,$lt:end}}).select("_id").lean(),Resource.find({company:user.company,kind:"department",active:true}).lean(),Resource.find({company:user.company,kind:"payroll","metadata.status":"finalized"}).lean(),AuditLog.distinct("entityId",{company:user.company,action:"employee.deactivated",createdAt:{$gte:start,$lt:end}}),AuditLog.find({company:user.company}).sort({createdAt:-1}).limit(12).populate("actor","name email").lean()]);const counts=new Map(),gender={female:0,male:0},tenure={};for(const e of employees){if(e.department){const k=String(e.department);counts.set(k,(counts.get(k)||0)+1);}if(e.gender==="female"||e.gender==="male")gender[e.gender]++;const years=(now-(e.hireDate||e.createdAt))/(365.25*86400000);const completedYears=Math.max(0,Math.floor(years));tenure[`${completedYears} ${completedYears===1?"year":"years"}`]=(tenure[`${completedYears} ${completedYears===1?"year":"years"}`]||0)+1;}const sal=employees.map(e=>Number(e.basicSalary)).filter(n=>n>0),payrollCost=payroll.reduce((a,p)=>a+(Number(p.amount)||0),0);return{company,metrics:{headcount:employees.length,ytdAttrition:departivations.length,ytdAttritionRate:employees.length+former.length?departivations.length/(employees.length+former.length):0,payrollCost,averageSalary:sal.length?sal.reduce((a,b)=>a+b,0)/sal.length:null,payrollRecords:payroll.length,departments:departments.map(d=>({_id:d._id,name:d.name,headcount:counts.get(String(d._id))||0})),genderDistribution:gender,tenureDistribution:tenure},recentActivity};}

