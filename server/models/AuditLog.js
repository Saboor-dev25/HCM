import mongoose from "mongoose";
const schema = new mongoose.Schema({ company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true, immutable: true }, actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", immutable: true }, action: { type: String, required: true, immutable: true }, entity: {type:String,immutable:true}, entityId: {type:String,immutable:true}, details: {type:mongoose.Schema.Types.Mixed,immutable:true}, createdAt: { type: Date, default: Date.now, immutable: true } }, { timestamps: false });
schema.index({ company: 1, createdAt: -1 });
export default mongoose.model("AuditLog", schema);
