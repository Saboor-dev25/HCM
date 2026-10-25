import Company from "#models/Company";
import {login,superAdminLogin,submitCompanyRequest,checkCompanyRegistrationStatus,changePassword} from "#services/authService";
import {cookieOptions,safeUser} from "#utils/http";
const publicUser=user=>({...safeUser(user),mustChangePassword:user.mustChangePassword});
export async function companyRequest(req,res,next){try{res.status(202).json(await submitCompanyRequest(req.body));}catch(e){next(e);}}
export async function companyRegistrationStatus(req,res,next){try{res.set("Cache-Control","no-store");res.json(await checkCompanyRegistrationStatus(req.body));}catch(e){next(e);}}
export async function loginUser(req,res,next){try{const{user,company,token}=await login(req.body);res.cookie("session",token,cookieOptions).json({user:publicUser(user),company:{id:company._id,name:company.name}});}catch(e){next(e);}}
export async function superAdminLoginUser(req,res,next){try{const{user,token}=await superAdminLogin(req.body);res.cookie("session",token,cookieOptions).json({user:publicUser(user),company:null});}catch(e){next(e);}}
export function logoutUser(req,res){res.clearCookie("session",{...cookieOptions,maxAge:undefined}).json({message:"Signed out."});}
export async function currentUser(req,res,next){try{const company=req.user.company?await Company.findById(req.user.company).select("name settings status"):null;res.json({user:publicUser(req.user),company});}catch(e){next(e);}}
export async function updatePassword(req,res,next){try{const{token}=await changePassword(req.user,req.body.password);res.cookie("session",token,cookieOptions).json({user:publicUser(req.user)});}catch(e){next(e);}}
