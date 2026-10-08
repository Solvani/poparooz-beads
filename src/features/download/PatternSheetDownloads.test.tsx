import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPublicPattern } from "../pattern-canvas/test/pattern-result";
import { PatternSheetDownloads } from "./PatternSheetDownloads";
import type { PatternActionState } from "../actions/pattern-action.types";
afterEach(cleanup);
const state: PatternActionState = {
  hasResult: true,
  resultIdentity: 1,
  resultScope: "current-result",
  downloadEnabled: true,
  getBeadsEnabled: false,
  availabilityMessage: "Ready",
  scopeMessage: null,
};
describe("R06 one complete pattern-sheet download", () => {
  it.each([40, 52, 60, 80, 104])(
    "offers exactly one complete PNG action for %i",
    async (size) => {
      const download = vi.fn(async () => ({ ok: true as const })),
        pattern = createPublicPattern(size, size, new Uint16Array(size * size));
      const v = render(
        <PatternSheetDownloads
          state={state}
          input={{ pattern, selectedColorSetLabel: "72-Color Set" }}
          onDownload={download}
        />,
      );
      expect(
        v.getByRole("heading", { name: "Pattern Sheet" }),
      ).toBeInTheDocument();
      expect(
        v.getByText(`One complete ${size} × ${size} color-code pattern PNG.`),
      ).toBeVisible();
      expect(v.queryByRole("button", { name: "Overview" })).toBeNull();
      expect(v.queryByText(/Section [AB][12]/)).toBeNull();
      expect(v.getAllByRole("button")).toHaveLength(1);
      await userEvent.click(
        v.getByRole("button", { name: "Download Pattern Sheet" }),
      );
      expect(download).toHaveBeenCalledExactlyOnceWith();
    },
  );
  it("announces a failed download without initiating another item", async () => {
    const download = vi.fn(async () => ({
      ok: false as const,
      message: "Download unavailable",
    }));
    const v = render(
      <PatternSheetDownloads
        state={state}
        input={{
          pattern: createPublicPattern(),
          selectedColorSetLabel: "72-Color Set",
        }}
        onDownload={download}
      />,
    );
    await userEvent.click(
      v.getByRole("button", { name: "Download Pattern Sheet" }),
    );
    expect(v.getByRole("status")).toHaveTextContent("Download unavailable");
    expect(download).toHaveBeenCalledOnce();
  });
});
