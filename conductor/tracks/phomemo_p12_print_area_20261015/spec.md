# Specification: Phomemo P12 Printable Area Calibration & Vertical Offset Alignment

## 1. Overview
On 12mm continuous tape printed with Phomemo P12, sending an unadjusted 96-pixel high raster results in 93 printed dots physically on the tape (3 dots cut off) and asymmetric content shifting relative to tape borders.
Reference tools like `phomymo` blindly send 12 bytes (96 dots) without physical alignment compensation.

## 2. Functional Requirements
- **FR-1**: Determine and declare the effective physical printable height for Phomemo P12 12mm tape in `phoP12Profile` (93 printable dots, or 11.625 mm at 203 DPI).
- **FR-2**: Provide an alignment offset mechanism (hardware printhead dot offset) so that rendered raster content is accurately centered within the 93 active thermal dots of the P12 print head, rather than being clipped on one side.
- **FR-3**: Ensure the 90° CW rotation pipeline in `editor.tsx` respects the calibrated printable bounds without distorting aspect ratios or breaking Marklife printers.

## 3. Acceptance Criteria
- [ ] Profile `pho-p12` defines exact printable dimensions and dot offset.
- [ ] Printed output on physical 12mm tape contains all visual elements without truncation.
- [ ] Content appears vertically centered on the physical continuous tape.
- [ ] Marklife (`mark-l11`, `mark-x2`) printing remains 100% unaffected.
