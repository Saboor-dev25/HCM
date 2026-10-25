import { Router } from "express";
import auth from "#middleware/authMiddleware";
import { allowRoles } from "#middleware/roleMiddleware";
import * as c from "#controllers/adminController";
const router=Router();router.use(auth);
router.get("/overview",allowRoles("ADMIN"),c.adminOverview);
router.get("/employees/:id",allowRoles("ADMIN","HR"),c.employeeDetails);router.get("/resources/:kind",allowRoles("ADMIN","HR"),c.resources);
router.post("/resources/:kind",allowRoles("ADMIN","HR"),c.resourceCreate);
router.patch("/resources/:id",allowRoles("ADMIN"),c.resourceUpdate);
router.delete("/resources/:id",allowRoles("ADMIN"),c.resourceDelete);
router.patch("/settings",allowRoles("ADMIN"),c.settings);
router.post("/company-code/regenerate",allowRoles("ADMIN"),c.rotateCode);
router.get("/hr",allowRoles("ADMIN"),c.hrList);router.post("/hr",allowRoles("ADMIN"),c.hrCreate);router.patch("/hr/:id/status",allowRoles("ADMIN"),c.hrStatus);router.post("/hr/:id/reset-password",allowRoles("ADMIN"),c.hrReset);
router.get("/audit",allowRoles("ADMIN"),c.audit);router.post("/payroll/drafts",allowRoles("ADMIN"),c.payrollDraft);router.post("/payroll/:id/finalize",allowRoles("ADMIN"),c.finalizePayroll);
export default router;


