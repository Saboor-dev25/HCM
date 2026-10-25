import * as service from "#services/attendanceService";
const run=(fn)=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
export const checkIn=run(async(req,res)=>res.status(201).json({record:await service.checkIn(req.user)}));
export const checkOut=run(async(req,res)=>res.json({record:await service.checkOut(req.user)}));
export const today=run(async(req,res)=>res.json({record:await service.today(req.user)}));
export const reconcile=run(async(req,res)=>res.json(await service.reconcile(req.user,req.body.day)));
