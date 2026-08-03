# Canonical Palette CSV Columns

The canonical header contains every column below. Import accepts these exact,
case-sensitive names in any order; missing, unknown, or duplicate headers are
rejected. Optional means the column remains present but its cell may be empty.

| Column                  | Input conversion                       | Optional |
| ----------------------- | -------------------------------------- | -------- |
| `reference_system`      | trimmed string                         | no       |
| `reference_code`        | trimmed string; Domain normalizes      | no       |
| `reference_name`        | trimmed string                         | yes      |
| `reference_series`      | trimmed string                         | yes      |
| `display_code`          | trimmed string; Domain normalizes      | no       |
| `display_name`          | trimmed string                         | yes      |
| `hex`                   | trimmed string; Domain normalizes      | no       |
| `rgb_r`                 | safe base-10 integer                   | no       |
| `rgb_g`                 | safe base-10 integer                   | no       |
| `rgb_b`                 | safe base-10 integer                   | no       |
| `lab_l`                 | finite ordinary decimal                | no       |
| `lab_a`                 | finite ordinary decimal                | no       |
| `lab_b`                 | finite ordinary decimal                | no       |
| `is_active`             | case-insensitive `true` or `false`     | no       |
| `is_sellable`           | case-insensitive `true` or `false`     | no       |
| `is_special_finish`     | case-insensitive `true` or `false`     | no       |
| `finish_type`           | trimmed string                         | yes      |
| `is_auto_match_enabled` | case-insensitive `true` or `false`     | no       |
| `product_handle`        | trimmed string                         | yes      |
| `variant_id`            | trimmed string                         | yes      |
| `pack_size`             | safe base-10 integer                   | yes      |
| `sort_order`            | safe base-10 integer                   | no       |
| `source_version`        | trimmed string                         | no       |
| `verified_at`           | trimmed ISO value, validated by Domain | yes      |

Empty optional cells become `undefined`. Empty required strings are errors;
empty numbers never become zero. Scientific notation, `NaN`, and `Infinity`
are rejected. Completely empty lines are skipped; whitespace-only lines are
data and therefore fail row-width or field validation. UTF-8 BOM, LF, CRLF,
and RFC 4180 quoted commas are supported.
