import type { z } from "zod";

import type { BoardProfileSchema } from "./board-profile.schema";

export type BoardProfile = z.infer<typeof BoardProfileSchema>;
