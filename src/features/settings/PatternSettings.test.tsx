import { cleanup, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PatternSettings } from "./PatternSettings";
import { EMPTY_PATTERN_SETTINGS } from "./settings.types";

const COLOR_SET_PROFILES = [
  { profileId: "poparooz-set-24", size: 24 },
  { profileId: "poparooz-set-48", size: 48 },
  { profileId: "poparooz-set-72", size: 72 },
  { profileId: "poparooz-set-120", size: 120 },
  { profileId: "poparooz-set-168", size: 168 },
  { profileId: "poparooz-set-221", size: 221 },
] as const;

afterEach(cleanup);

describe("PatternSettings", () => {
  it("renders no invented defaults and only supported background modes", () => {
    const view = render(
      <PatternSettings
        value={EMPTY_PATTERN_SETTINGS}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );

    expect(view.getByLabelText("Pattern Width")).toHaveValue(null);
    expect(view.getByLabelText("Pattern Height")).toHaveValue(null);
    expect(view.getByLabelText("Pattern Color Limit")).toHaveValue(32);
    expect(view.getByLabelText("Bead Color Set")).toHaveValue(
      "poparooz-set-221",
    );
    expect(
      view.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "24-Color Set",
      "48-Color Set",
      "72-Color Set",
      "120-Color Set",
      "168-Color Set",
      "221-Color Set",
    ]);
    expect(
      view.getByText("Maximum number of colors used in the generated pattern."),
    ).toBeInTheDocument();
    expect(view.getByRole("radio", { name: "White" })).not.toBeChecked();
    expect(view.getByRole("radio", { name: "Transparent" })).not.toBeChecked();
    expect(view.queryByRole("radio", { name: "Keep Original" })).toBeNull();
    expect(
      view.getByRole("button", { name: "Generate Pattern" }),
    ).toBeDisabled();
  });

  it("emits a new immutable draft for each controlled change", async () => {
    const onChange = vi.fn();
    const value = { ...EMPTY_PATTERN_SETTINGS };
    const view = render(
      <PatternSettings
        value={value}
        onChange={onChange}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );

    fireEvent.change(view.getByLabelText("Pattern Width"), {
      target: { value: "64" },
    });
    await userEvent.click(view.getByRole("radio", { name: "White" }));

    expect(onChange).toHaveBeenCalledWith({ ...value, width: "64" });
    expect(onChange).toHaveBeenCalledWith({ ...value, background: "white" });
    expect(value).toEqual(EMPTY_PATTERN_SETTINGS);
  });

  it("exposes formal numeric min, max, and step boundaries", () => {
    const view = render(
      <PatternSettings
        value={EMPTY_PATTERN_SETTINGS}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );

    expect(view.getByLabelText("Pattern Width")).toHaveAttribute("min", "1");
    expect(view.getByLabelText("Pattern Width")).toHaveAttribute("max", "4096");
    expect(view.getByLabelText("Pattern Height")).toHaveAttribute("step", "1");
    expect(view.getByLabelText("Pattern Color Limit")).toHaveAttribute(
      "min",
      "2",
    );
    expect(view.getByLabelText("Pattern Color Limit")).toHaveAttribute(
      "max",
      "64",
    );
  });

  it("can omit generation controls when the responsive shell owns their placement", () => {
    const view = render(
      <PatternSettings
        value={EMPTY_PATTERN_SETTINGS}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
        generationControls={null}
      />,
    );

    expect(view.queryByRole("button", { name: "Generate Pattern" })).toBeNull();
    expect(view.getByLabelText("Pattern Width")).toBeInTheDocument();
  });
});
