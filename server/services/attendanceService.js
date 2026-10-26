import Attendance from "#models/Attendance";
import Company from "#models/Company";
import LeaveRequest from "#models/LeaveRequest";
import Resource from "#models/Resource";
import User from "#models/User";

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const dayKey=(date)=>date.toISOString().slice(0,10);
const startOfDay=(day)=>new Date(`${day}T00:00:00.000Z`);
const endOfDay=(day)=>new Date(`${day}T23:59:59.999Z`);
let finalizedUtcDay=null;

function isWeekend(company,day){
 const weekday=new Date(`${day}T12:00:00.000Z`).getUTCDay();
 return (company.settings.weekendDays||[]).includes(weekday);
}

function absenceCutoff(company,day){
 const officeStart=company.settings.officeStart||"09:00";
 const cutoff=new Date(`${day}T${officeStart}:00.000Z`);
 cutoff.setUTCHours(cutoff.getUTCHours()+1);
 return cutoff;
}

async function hasApprovedLeave(companyId,employeeId,day){
 return LeaveRequest.exists({company:companyId,employee:employeeId,status:"approved",startDate:{$lte:endOfDay(day)},endDate:{$gte:startOfDay(day)}});
}

async function createMissingAbsenceRecords(company,day){
 if(isWeekend(company,day))return 0;
 const holiday=await Resource.exists({company:company._id,kind:"holiday",active:true,date:{$gte:startOfDay(day),$lte:endOfDay(day)}});
 if(holiday)return 0;
 const [employees,approvedLeaves,existing]=await Promise.all([
  User.find({company:company._id,role:"EMPLOYEE",active:true}).select("_id").lean(),
  LeaveRequest.find({company:company._id,status:"approved",startDate:{$lte:endOfDay(day)},endDate:{$gte:startOfDay(day)}}).select("employee").lean(),
  Attendance.find({company:company._id,day}).select("employee").lean(),
 ]);
 const onLeave=new Set(approvedLeaves.map((leave)=>String(leave.employee)));
 const hasRecord=new Set(existing.map((record)=>String(record.employee)));
 const missing=employees.filter((employee)=>!onLeave.has(String(employee._id))&&!hasRecord.has(String(employee._id)));
 if(!missing.length)return 0;
 const operations=missing.map((employee)=>({updateOne:{filter:{company:company._id,employee:employee._id,day},update:{$setOnInsert:{company:company._id,employee:employee._id,day,status:"absent",settingsSnapshot:company.settings.toObject()}},upsert:true}}));
 try{
  const result=await Attendance.bulkWrite(operations,{ordered:false});
  return result.upsertedCount||0;
 }catch(error){
  const writeErrors=error.writeErrors||[];
  if(!writeErrors.length||writeErrors.some((entry)=>entry.code!==11000))throw error;
  return 0;
 }
}

export async function markEmployeeAbsentIfDue(companyId,employeeId,now=new Date()){
 const day=dayKey(now);
 const company=await Company.findById(companyId);
 if(!company||now<absenceCutoff(company,day)||isWeekend(company,day))return null;
 const holiday=await Resource.exists({company:companyId,kind:"holiday",active:true,date:{$gte:startOfDay(day),$lte:endOfDay(day)}});
 if(holiday||await hasApprovedLeave(companyId,employeeId,day))return null;
 try{
  await Attendance.updateOne({company:companyId,employee:employeeId,day},{$setOnInsert:{company:companyId,employee:employeeId,day,status:"absent",settingsSnapshot:company.settings.toObject()}},{upsert:true});
 }catch(error){if(error.code!==11000)throw error;}
 return Attendance.findOne({company:companyId,employee:employeeId,day}).lean();
}

export async function checkIn(user){
 if(user.role!=="EMPLOYEE")fail("Attendance is available to employees only.",403);
 const company=await Company.findById(user.company);
 const now=new Date();
 const today=dayKey(now);
 if((company.settings.weekendDays||[]).includes(now.getUTCDay()))fail("Today is configured as a weekend.");
 const [hh,mm]=(company.settings.officeStart||"09:00").split(":").map(Number);
 const scheduled=new Date(now);
 scheduled.setUTCHours(hh,mm,0,0);
 const graceEnd=new Date(scheduled);
 graceEnd.setUTCMinutes(graceEnd.getUTCMinutes()+(company.settings.graceMinutes||0));
 const oneHourCutoff=new Date(scheduled);
 oneHourCutoff.setUTCHours(oneHourCutoff.getUTCHours()+1);
 const existing=await Attendance.findOne({company:user.company,employee:user._id,day:today});
 if(existing?.checkIn)fail("You have already checked in today.",409);
 const status=existing?.correction?.flagged?existing.status:(now>graceEnd||now>oneHourCutoff?"late":"present");
 let record=existing||new Attendance({company:user.company,employee:user._id,day:today,settingsSnapshot:company.settings.toObject()});
 record.checkIn=now;
 record.status=status;
 try{await record.save();}catch(error){
  if(error.code!==11000||existing)throw error;
  record=await Attendance.findOne({company:user.company,employee:user._id,day:today});
  if(!record||record.checkIn)fail("You have already checked in today.",409);
  record.checkIn=now;
  if(!record.correction?.flagged)record.status="late";
  await record.save();
 }
 return record;
}

export async function checkOut(user){
 if(user.role!=="EMPLOYEE")fail("Attendance is available to employees only.",403);
 const now=new Date();
 const record=await Attendance.findOne({company:user.company,employee:user._id,day:dayKey(now)});
 if(!record||!record.checkIn)fail("Check in before checking out.",409);
 if(record.checkOut)fail("You have already checked out today.",409);
 record.checkOut=now;
 record.workedMinutes=Math.max(0,Math.floor((now-record.checkIn)/60000));
 if(record.workedMinutes<(record.settingsSnapshot?.halfDayHours||5)*60&&!record.correction?.flagged)record.status="half-day";
 await record.save();
 return record;
}

export async function today(user){
 const now=new Date();
 if(user.role==="EMPLOYEE")await markEmployeeAbsentIfDue(user.company,user._id,now);
 return Attendance.findOne({company:user.company,employee:user._id,day:dayKey(now)}).lean();
}

export async function reconcile(user,date){
 const company=await Company.findById(user.company);
 const day=typeof date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:dayKey(new Date(Date.now()-86400000));
 const cutoff=endOfDay(day);
 const records=await Attendance.find({company:user.company,day,checkIn:{$ne:null},checkOut:null});
 for(const row of records){
  row.status="missing-checkout";
  row.workedMinutes=Math.max(0,Math.floor((cutoff-row.checkIn)/60000));
  await row.save();
 }
 const absentCreated=await createMissingAbsenceRecords(company,day);
 return{day,reconciled:records.length,absentCreated};
}

export async function reconcileCurrentDayAbsences(now=new Date()){
 const day=dayKey(now);
 const companies=await Company.find({status:"active",active:true});
 let absentCreated=0;
 if(finalizedUtcDay!==day){
  const previousDate=startOfDay(day);
  previousDate.setUTCDate(previousDate.getUTCDate()-1);
  const previousDay=dayKey(previousDate);
  for(const company of companies){
   const openRecords=await Attendance.find({company:company._id,day:previousDay,checkIn:{$ne:null},checkOut:null});
   for(const row of openRecords){
    row.status="missing-checkout";
    row.workedMinutes=Math.max(0,Math.floor((endOfDay(previousDay)-row.checkIn)/60000));
    await row.save();
   }
   absentCreated+=await createMissingAbsenceRecords(company,previousDay);
  }
  finalizedUtcDay=day;
 }
 for(const company of companies){
  if(isWeekend(company,day)||now<absenceCutoff(company,day))continue;
  absentCreated+=await createMissingAbsenceRecords(company,day);
 }
 return{day,absentCreated};
}

