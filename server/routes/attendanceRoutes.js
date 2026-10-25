import {Router} from "express";
import auth from "#middleware/authMiddleware";
import {allowRoles} from "#middleware/roleMiddleware";
import {checkIn,checkOut,today,reconcile} from "#controllers/attendanceController";
const router=Router();router.use(auth);router.get("/today",today);router.post("/check-in",checkIn);router.post("/check-out",checkOut);router.post("/reconcile",allowRoles("ADMIN"),reconcile);export default router;
