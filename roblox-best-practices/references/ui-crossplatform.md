# UI/UX and Cross-Platform

Building interfaces that survive every screen and every input device. Proving that they work is a separate concern: [verification.md](verification.md).

## UI Construction

- **Scale over Offset** for anything that must fit every screen; Offset only for fixed-size elements (icons, borders). Combine with `UIAspectRatioConstraint` to stop Scale from distorting, and `UITextSizeConstraint`/`TextScaled` for legible text at all sizes.
- **The player has their own UI scale.** `GuiService:GetUIScaleMultiplier()` reports it (with a setter and `UserGameSettings.UIScaleMultiplierHundredths` behind it) — read that rather than inferring an intended scale from viewport size, and let it multiply your layout instead of fighting it. **[Verify]** ([api-currency.md](api-currency.md#engine)); fall back to viewport-relative sizing where it is absent.
- Respect device insets: `ScreenGui.ScreenInsets` (CoreUISafeInsets/DeviceSafeInsets) for notches and rounded corners; never pin critical buttons into unsafe corners.
- Prefer native styling over image assets: `UICorner` (per-corner rounding), `UIStroke`, `UIGradient`, `UIShadow`, and the Styling system/StyleQueries where available — lighter than 9-slice images and theme-able. Verify availability per [SKILL.md](../SKILL.md#environment--scale).
- Layouts via `UIListLayout`/`UIGridLayout`/`UIFlexLayout` + `AutomaticSize`, not hand-positioned children — they reflow across resolutions for free.
- If the project uses Fusion/React-lua, component idioms win — see [community-libraries.md](community-libraries.md#ui-fusion--react-lua--roact).

Rotated GuiObjects and `Path2D` instances now clip cleanly without a performance penalty, so a rotated element no longer forces a redesign to avoid overflow.

**UI performance:** UI updated every frame (health bars, timers) must not trigger layout recalculation of large trees — isolate hot elements in their own container. Tween properties, don't re-create elements. Set `Visible = false` on hidden panels (invisible ≠ free if still being laid out); destroy screens you won't reopen.

## Cross-Platform UX

Assume every game runs on touch, gamepad, and mouse/keyboard unless the user says otherwise.

- **Input:** Input Action System (or `ContextActionService` in legacy projects) per [patterns/world.md](patterns/world.md#input-client) — never branch on `UserInputService.TouchEnabled` to build three separate input systems. The **Input Action Manager [Beta]** is a Studio-side visual editor for building and auditing cross-platform mappings; it complements the runtime API rather than replacing it. Under Server Authority the Input Action System is mandatory ([server-authority.md](server-authority.md)).
- **Gamepad/console:** every interactive GuiObject reachable via `Selectable`/`NextSelectionUp/Down/Left/Right`; set `GuiService.SelectedObject` when opening a menu; test that focus never traps.
- **Touch:** minimum ~44 px effective touch targets; keep actions away from screen edges reserved by the OS; `ContextActionService`-created touch buttons for gameplay actions.
- Detect the *active* input type via `UserInputService:GetLastInputType()` + `LastInputTypeChanged` to swap prompt icons (keyboard "E" vs gamepad "X" vs touch button) — players switch mid-session.
- **Accessibility basics:** don't encode meaning in color alone; support `GuiService.ReducedMotionEnabled` (skip/shorten camera shakes and large tweens when set); keep flashing effects mild.
- **Performance tiers:** treat low-end mobile as the baseline — test there, scale effects *up* for strong devices, not down from PC. Never infer device power from `TouchEnabled`. Frame budgets, the degradation ladder, and adaptive quality: [device-performance.md](device-performance.md).
