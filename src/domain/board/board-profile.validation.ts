import { BoardProfileSchema } from "./board-profile.schema";

export function parseBoardProfile(input: unknown) {
  return BoardProfileSchema.parse(input);
}

export function safeParseBoardProfile(input: unknown) {
  return BoardProfileSchema.safeParse(input);
}
