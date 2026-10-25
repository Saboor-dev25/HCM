import jwt from "jsonwebtoken";
import User from "#models/User";
import Company from "#models/Company";
import {readCookie} from "#utils/http";
import {jwtSecret} from "#config/auth";
export default async function authMiddleware(req,res,next){try{const token=readCookie(req,"session");if(!token)return res.status(401).json({message:"Please sign in to continue."});const payload=jwt.verify(token,jwtSecret);const user=await User.findById(payload.sub);if(!user||!user.active||(user.passwordChangedAt&&payload.iat<Math.floor(user.passwordChangedAt.getTime()/1000)))return res.status(401).json({message:"Session expired. Please sign in again."});if(user.role==="SUPER_ADMIN"){if(user.company)return res.status(403).json({message:"Invalid platform administrator account."});}else{const company=user.company&&await Company.findOne({_id:user.company,active:true,status:"active"});if(!company)return res.status(403).json({message:"This company is not approved or is inactive."});}req.user=user;next();}catch{return res.status(401).json({message:"Session expired. Please sign in again."});}}
