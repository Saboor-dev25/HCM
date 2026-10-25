import {Router} from "express";
import authMiddleware from "#middleware/authMiddleware";
import {currentUser,companyRequest,companyRegistrationStatus,loginUser,superAdminLoginUser,logoutUser,updatePassword} from "#controllers/authController";
const router=Router();router.post("/company-requests",companyRequest);router.post("/company-registration/status",companyRegistrationStatus);router.post("/login",loginUser);router.post("/super-admin-login",superAdminLoginUser);router.post("/logout",logoutUser);router.get("/me",authMiddleware,currentUser);router.post("/change-password",authMiddleware,updatePassword);export default router;
