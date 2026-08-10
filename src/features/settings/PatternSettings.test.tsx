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
  it("renders the approved default preset and only supported background modes", () => {
    const view = render(
      <PatternSettings
        value={EMPTY_PATTERN_SETTINGS}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );

    expect(view.getByLabelText("Pattern Size")).toHaveValue("80");
    expect(
      view.getByText("Best for most photos · Recommended"),
    ).toBeInTheDocument();
    expect(view.getByLabelText("Pattern Color Limit")).toHaveValue(32);
    expect(view.getByLabelText("Bead Color Set")).toHaveValue(
      "poparooz-set-221",
    );
    expect(
      view.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "40 × 40",
      "60 × 60",
      "80 × 80 — Recommended",
      "104 × 104",
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

    fireEvent.change(view.getByLabelText("Pattern Size"), {
      target: { value: "60" },
    });
    await userEvent.click(view.getByRole("radio", { name: "White" }));

    expect(onChange).toHaveBeenCalledWith({
      ...value,
      width: "60",
      height: "60",
    });
    expect(onChange).toHaveBeenCalledWith({ ...value, background: "white" });
    expect(value).toEqual(EMPTY_PATTERN_SETTINGS);
  });

  it("exposes only the four fixed sizes and preserves the color limit boundary", () => {
    const view = render(
      <PatternSettings
        value={EMPTY_PATTERN_SETTINGS}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );

    expect(view.getByLabelText("Pattern Size")).toHaveValue("80");
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
    expect(view.getByLabelText("Pattern Size")).toBeInTheDocument();
  });

  it.each([
    ["40", "Best for icons and simple designs"],
    ["60", "Best for simple portraits and pets"],
    ["80", "Best for most photos · Recommended"],
    ["104", "Best for detailed photos"],
  ])("shows guidance for preset %s", (size, guidance) => {
    const view = render(
      <PatternSettings
        value={{ ...EMPTY_PATTERN_SETTINGS, width: size, height: size }}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );
    expect(view.getByText(guidance)).toBeInTheDocument();
  });
});
