import auth from "#middleware/authMiddleware";
import {allowRoles} from "#middleware/roleMiddleware";
import {pendingCompanies,reviewCompany} from "#services/superAdminService";
export async function listRequests(req,res,next){try{res.json({items:await pendingCompanies()});}catch(e){next(e);}}
export async function reviewRequest(req,res,next){try{res.json(await reviewCompany(req.user,req.params.id,req.body.decision,req.body.note));}catch(e){next(e);}}
import {Router} from "express";
const router=Router();router.use(auth,allowRoles("SUPER_ADMIN"));router.get("/companies/pending",listRequests);router.post("/companies/:id/review",reviewRequest);export default router;
