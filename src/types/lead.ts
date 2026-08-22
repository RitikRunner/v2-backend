import { z } from "zod";
import {
  createLeadSchema,
  listLeadsSchema,
  updateLeadSchema,
} from "../validations/lead-validation";

export type CaptureLeadInput = z.infer<typeof createLeadSchema>["body"];
export type ListLeadsParams = z.infer<typeof listLeadsSchema>["query"];
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>["body"];
