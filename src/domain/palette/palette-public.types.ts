import type { z } from "zod";

import type { PublicPaletteColorSchema } from "./palette-public.schema";

export type PublicPaletteColor = z.infer<typeof PublicPaletteColorSchema>;
