import mongoose from "mongoose";
const schema = new mongoose.Schema({ company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true }, kind: { type: String, enum: ["department", "designation", "leaveType", "holiday", "announcement", "employee", "attendance", "payroll"], required: true }, name: { type: String, trim: true }, title: String, description: String, amount: Number, unlimited: Boolean, date: Date, quota: Number, active: { type: Boolean, default: true }, metadata: mongoose.Schema.Types.Mixed, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }, { timestamps: true });
schema.index({ company: 1, kind: 1, name: 1 });
export default mongoose.model("Resource", schema);
