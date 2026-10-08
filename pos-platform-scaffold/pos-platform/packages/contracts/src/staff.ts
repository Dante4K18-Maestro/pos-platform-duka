// Staff: the people who can sign in at this tenant. A member is a User plus
// the role names assigned through UserRole. PIN is the shared-device unlock
// (cashiers), password is the back-office login (owner/manager).
import { z } from "zod";

export const staffMemberSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  roles: z.array(z.string()),
  // Whether a PIN is set — never the hash, and never the PIN itself.
  hasPin: z.boolean(),
  createdAt: z.string(),
});

export const staffListSchema = z.object({
  staff: z.array(staffMemberSchema),
  // Every role defined for the tenant, so the UI can offer the full set
  // rather than only the ones already in use.
  roles: z.array(z.string()),
});

export type StaffMember = z.infer<typeof staffMemberSchema>;

export const createStaffSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "password must be at least 8 characters").max(200),
  // 4–6 digits, matching the PIN pad on the register.
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits")
    .optional(),
  roles: z.array(z.string().trim().min(1)).min(1, "at least one role is required"),
});

export const updateStaffSchema = z
  .object({
    roles: z.array(z.string().trim().min(1)).min(1).optional(),
    password: z.string().min(8).max(200).optional(),
    // null clears the PIN; a string sets it.
    pin: z
      .string()
      .regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits")
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "nothing to update");

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
