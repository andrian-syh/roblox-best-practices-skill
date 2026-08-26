# UI/UX and Cross-Platform

Building interfaces that survive every screen and every input device. Proving that they work is a separate concern: [verification.md](verification.md).

## Contents

- [Containers: where UI lives](#containers-where-ui-lives)
- [Position, size, and who wins](#position-size-and-who-wins)
- [Layouts](#layouts)
- [Appearance modifiers](#appearance-modifiers)
- [The styling system](#the-styling-system)
- [Text, input, and filtering](#text-input-and-filtering)
- [Interaction objects](#interaction-objects)
- [Specialty frames](#specialty-frames)
- [Animation](#animation)
- [UI performance](#ui-performance)
- [Cross-Platform UX](#cross-platform-ux)

## Containers: where UI lives

Three containers, three different lifetimes. Picking the wrong one is the most common reason UI "does not show up" or "resets by itself".

**`ScreenGui` — on the player's screen.** Authored under `StarterGui`, and **cloned into each player's `PlayerGui`** when their character spawns. Script against `PlayerGui`, never `StarterGui`, at runtime.

- **`ResetOnSpawn` defaults to `true`**, so the GUI is rebuilt on every respawn and any state held inside it is lost. Persistent HUD sets it to `false`.
- **`DisplayOrder`** decides which `ScreenGui` renders above which; `ZIndex` only orders within one.
- **`Enabled = false`** stops rendering, input processing, and updates for the whole tree, which makes it the cheap way to hide a screen.
- **`ScreenInsets`** has four values, not two: `CoreUISafeInsets` (default; clears the top bar and screen cutouts), `DeviceSafeInsets` (notches only), `TopbarSafeInsets`, and `None`. Interactive elements belong inside the safe area; `None` is for full-bleed backgrounds only.

**`SurfaceGui` — on a part's face.** Set `Adornee` rather than reparenting when the target changes at runtime. `Face` picks the surface, `LightInfluence` and `Brightness` decide whether it is lit by the world or self-lit, `AlwaysOnTop` draws it over 3D content, and `MaxDistance` (default 1000 studs, `0` meaning infinite) stops distant surfaces from rendering at all. Size children with **scale**, since the canvas is a stud-sized surface.

**`BillboardGui` — in the world, always facing the camera.** Nameplates, markers, health bars. `Adornee` accepts a `BasePart` or an `Attachment`, `StudsOffset` positions it relative to the camera, and `MaxDistance` culls it.

**Buttons inside a `SurfaceGui` or `BillboardGui` only receive input when the GUI is parented under `PlayerGui`** (with `Adornee` pointing at the part) **and the part has `CanQuery = true`**. A world-space button that does nothing is almost always one of those two.

## Position, size, and who wins

- **`UDim2` is `{scaleX, offsetX}, {scaleY, offsetY}`**, and the two add together. **Scale** for anything that must fit every screen; **offset** for genuinely fixed pixels such as icons and borders.
- **`AnchorPoint`** sets the origin that position and size move from: `(0, 0)` is top-left, `(0.5, 0.5)` centers, and it is what makes centering survive a resize. It also decides which way `AutomaticSize` grows.
- **`AutomaticSize`** (`X`, `Y`, `XY`) resizes a container to fit its content, and the object's own `Size` becomes its *minimum*.
- **Constraints** — `UISizeConstraint` (`MinSize`/`MaxSize`), `UITextSizeConstraint` (keep the floor above ~9 px), `UIAspectRatioConstraint` (`AspectRatio`, with `AspectType` and `DominantAxis`) — stop scale from producing something unreadable or distorted.

**Precedence, because this is what confuses an agent editing UI:**

1. A **layout** (`UIListLayout`, `UIGridLayout`, `UITableLayout`, `UIPageLayout`) **takes over `Position` and `Size` of its siblings.** Setting them by hand afterwards does nothing; change `LayoutOrder`, padding, or the layout's own properties instead.
2. **Size constraints override the layout** when both apply.
3. `UIScale` multiplies the final result, which makes it the right knob for a whole-panel zoom.

**Clipping has a real limit.** `ClipsDescendants` does not clip rotated descendants unless `StarterGui.ClipsDescendantsSupportsRotation` is enabled, and it never clips to rounded corners. For either, use a **`CanvasGroup`**, which renders its children to a buffer first (and gives you `GroupTransparency` for fading a whole panel in one property).

## Layouts

- **`UIListLayout`** — rows or columns. `FillDirection`, `Padding`, `SortOrder` (`LayoutOrder` or `Name`), `HorizontalAlignment`/`VerticalAlignment`, and `Wraps` to break onto a new line when siblings overflow.
- **Flex lives on the list layout, not on a separate class.** `HorizontalFlex`/`VerticalFlex` distribute leftover space along the fill direction, and `ItemLineAlignment` aligns across it. To make one child flexible, parent a **`UIFlexItem`** to *that child* and set `FlexMode` to `Fill`, `Grow`, `Shrink`, or `Custom`. There is **no `UIFlexLayout` class** — writing one is the invented-member mistake in [style-rules.md](style-rules.md#commonly-misremembered-apis-check-before-writing-before-flagging). Flex costs slightly more than a plain list, so use it where space actually needs distributing.
- **`UIGridLayout`** — uniform tiles: `CellSize`, `CellPadding`, `FillDirectionMaxCells`, `StartCorner`. The shape for inventories and shop grids.
- **`UITableLayout`** — siblings become rows and *their* children become columns, with `FillEmptySpaceColumns`/`FillEmptySpaceRows`. Use it for data tables where columns must align; use the grid for equal tiles.
- **`UIPageLayout`** — every sibling becomes a page, driven by `Next()`, `Previous()`, and `JumpToIndex()`. Tabbed modals, tutorials, character customization.
- **`ScrollingFrame`** pairs with a list or grid layout: set `AutomaticCanvasSize` (`X`/`Y`/`XY`) so the canvas follows the content instead of being maintained by hand, keep `CanvasSize` at zero on that axis, and use `VerticalScrollBarInset`/`HorizontalScrollBarInset` so the bar does not overlap content. `ElasticBehavior = Never` stops the touch overscroll bounce; `CanvasPosition` reads and sets the current scroll offset.

## Appearance modifiers

Prefer these to image assets: they are lighter, they scale without a 9-slice, and they can be themed.

| Modifier | Notes |
|---|---|
| `UICorner` | `CornerRadius`, plus per-corner radii |
| `UIStroke` | `Thickness`, `Color`, `ApplyStrokeMode`, `LineJoinMode`. **Do not tween `Thickness` on a text object** — it flickers and costs more than it looks |
| `UIGradient` | `Color`, `Transparency`, `Offset`, `Rotation` |
| `UIPadding` | Inner spacing; the correct answer to "add a margin", not a spacer frame |
| `UIShadow` | `BlurRadius`, `Color`, `Offset`, `Spread`, `Transparency`. **Does not support text** — it shadows the bounding box, not the glyphs |

**9-slice** covers what the modifiers cannot: a bordered panel from one image that stretches without distorting its corners. Set `ScaleType = Slice` and `SliceCenter` on an `ImageLabel`/`ImageButton`, and scale the border independently with `SliceScale`.

## The styling system

A full cascade exists in the engine, and hand-setting properties across dozens of instances is the thing it replaces. Reach for it before writing a Luau function that loops over UI and assigns colors.

- **`StyleSheet`** holds rules, tokens, and themes; **`StyleRule`** carries a `Selector` plus the properties to apply; **`StyleLink`** attaches a sheet to a UI tree; **`StyleDerive`** makes one sheet inherit another. **Only one `StyleSheet` applies to a given tree.**
- **Selectors** read like CSS with different spellings: `Frame` for a class, `.PrimaryButton` for a **CollectionService tag**, `#ModalFrame` for a name, `:Hover`/`:Press` for `Enum.GuiState`, and `::UICorner` to create and configure a pseudo-instance. Combinators are `>` for a direct child and **`>>` for a descendant** (CSS's plain space).
- **Tokens** are stylesheet attributes referenced with `$`, and **themes** are swappable token sets — light and dark without duplicating rules. A script switches them with `StyleSheet:SetDerives()`, which is the one part of this system that belongs in code.
- **Transitions** tween styled property changes through a `TweenInfo`, so hover and press states animate without a single connection.
- **`StyleQuery`** applies rules conditionally on `MinSize`/`MaxSize`, `AspectRatioRange`, `PreferredInput`, `PreferredTextSize`, `ViewportDisplaySize`, and `ReducedMotionEnabled` — the cheapest correct answer to responsive layout and to three accessibility settings at once. Conditions are set with `SetCondition`/`SetConditions`, read back with `GetCondition`/`GetConditions`, and `IsActive` reports whether the query currently matches. **An invalid condition name fails silently** rather than erroring, so confirm `IsActive` flips instead of assuming a typo would announce itself.
- Sheets are normally authored in Studio's **Style Editor** (UI tab → Create Design), which is worth saying out loud to a user: propose the rules, and let them live in the editor rather than being rebuilt in code. A project already on Fusion or React-lua keeps its own idiom instead of mixing two systems.

## Text, input, and filtering

- **`TextScaled`** with a `UITextSizeConstraint` keeps text legible across screens; `TextWrapped` and `AutomaticSize` handle length. Read the player's own preference with `GuiService.PreferredTextSize` and `GuiService.ViewportDisplaySize` instead of inferring from raw pixels, and react through their change signals. `GuiService:GetUIScaleMultiplier()`/`:SetUIScaleMultiplier()` also exist (**[Undocumented]**, [api-currency.md](api-currency.md#engine)) — probe before designing around them.
- **Rich text** is per-object (`RichText = true`) and supports `<b>`, `<i>`, `<u>`, `<s>`, `<uc>`, `<sc>`, `<mark>`, `<stroke>`, `<br/>`, and `<font>` with `color`, `size`, `face`/`family`, `weight`, and `transparency`. Escape literals as `&lt;`, `&gt;`, `&quot;`, `&apos;`, `&amp;`. **Localization strips the tags**, so translated strings need their formatting reapplied.
- **`TextBox`** reports through `FocusLost` (which tells you whether Enter was pressed) and `GetPropertyChangedSignal("Text")` for live validation; `PlaceholderText` states what belongs there.
- **Filtering is mandatory for any text a player did not author on their own screen**, and it is a platform requirement, not a style choice ([security.md](security.md#user-generated-text-filtering)). Two rules specific to UI:
  - **Filter on the server, after submission** — send the text over a remote on `FocusLost`, filter there, and display the result. **Never filter per character as it is typed.**
  - `TextService:FilterStringAsync` returns a `TextFilterResult`; use `GetNonChatStringForBroadcastAsync()` for text everyone sees and `GetNonChatStringForUserAsync(userId)` for one recipient. The same applies to text from a DataStore, a web endpoint, or a random generator — anything you do not fully control.

## Interaction objects

- **Buttons** fire `Activated` for a click or tap, and **`SecondaryActivated`** for right-click on desktop and long-press on touch — one connection instead of branching on input type.
- **`ProximityPrompt`** is the built-in answer to "press E to interact": `ActionText`/`ObjectText` label it, `HoldDuration` guards accidental triggers, `MaxActivationDistance` and `RequiresLineOfSight` bound it, `Exclusivity` (`OnePerButton`, `OneGlobally`, `AlwaysShow`) decides what happens when prompts crowd, and `KeyboardKeyCode`/`GamepadKeyCode` set the input. Handle `PromptTriggered` centrally through **`ProximityPromptService`** rather than one script per prompt, and style all prompts in one place there. `PromptShown`/`PromptHidden` are client-side. **A prompt firing is a client claim** — the server re-verifies distance and state before granting anything ([patterns/network.md](patterns/network.md#remote-communication)).
- **`UIDragDetector`** makes sliders, spinners, and draggable panels work across every input device with no input code: `DragStyle` (`TranslateLine`, `TranslatePlane`, `Rotate`, `Scriptable`), `ResponseStyle` (`Offset`/`Scale`, or `CustomOffset`/`CustomScale` to receive the values without moving the element), limits through `MinDragTranslation`/`MaxDragTranslation` and `MinDragAngle`/`MaxDragAngle`, `BoundingUI` to confine it, and `DragStart`/`DragContinue`/`DragEnd`.
- **`DragDetector`** does the same for 3D parts, and carries a security decision in one property: **`RunLocally = false` (the default) routes the drag through the server**, so its events belong in a server `Script`; **`RunLocally = true` replicates nothing**, so the client must send the result over a validated remote like any other client claim ([security.md](security.md#threat-model-assume-all-of-these-exist)).

## Specialty frames

- **`ViewportFrame`** renders 3D objects inside 2D UI — item previews, minimaps, character displays. Assign `CurrentCamera`, and control appearance with `Ambient`, `LightDirection`, `LightColor`, plus `ImageColor3`/`ImageTransparency`. It renders a scene per frame, so treat several open at once as a cost.
- **`CanvasGroup`** is the answer to rounded or rotated clipping and to fading a whole panel with `GroupTransparency`; it costs a render target, so it is not the default container.
- **`VideoFrame`** is narrowly constrained: `.mp4`/`.mov`, five minutes or less, no alpha channel, uploaded by an ID-verified 13+ account at a Robux cost with a daily cap, and **at most two videos play at once**. Check those limits before proposing video at all.
- **`Path2D`** draws 2D splines for path-based animation and graph-style tools; control points are relative to the parent container, and it must live under a `ScreenGui` or `SurfaceGui`.

## Animation

- `TweenService:Create` on the GuiObject, with `TweenInfo` carrying duration, `EasingStyle`, and `EasingDirection`. Tween `Position` and `Size` in **scale**, `Rotation` around the `AnchorPoint`, and the transparency and color properties that match the object type.
- Chain steps by connecting the next tween to the previous one's `Completed` event rather than sleeping between them.
- A typewriter effect is `MaxVisibleGraphemes` counted up, not a string rebuilt character by character.
- **Respect `GuiService.ReducedMotionEnabled`**: shorten or skip large motion when it is set, and prefer expressing it as a `StyleQuery` condition over threading a flag through every component.

## UI performance

- UI updated every frame (health bars, timers) must not trigger layout recalculation of a large tree — isolate hot elements in their own container. Tween properties; do not recreate elements.
- Set `Visible = false` on hidden panels and destroy screens that will not reopen: an invisible frame still costs layout while it stays laid out. Disabling the whole `ScreenGui` is cheaper than hiding children one by one.
- Avoid `UIGradient` and heavy effects on elements that change every frame, and bundle 2D art into sprite sheets with `ImageRectOffset`/`ImageRectSize` ([device-performance.md](device-performance.md#engine-levers-before-script-levers)).
- Rotated GuiObjects and `Path2D` clip cleanly without a performance penalty, so a rotated element does not force a redesign to avoid overflow.

## Cross-Platform UX

Assume every experience runs on touch, gamepad, and mouse/keyboard unless the user says otherwise.

- **Input:** Input Action System (or `ContextActionService` in legacy projects) per [patterns/world.md](patterns/world.md#input-client) — never branch on `UserInputService.TouchEnabled` to build three separate input systems. The **Input Action Manager [Beta]** is a Studio-side visual editor for building and auditing cross-platform mappings; it complements the runtime API rather than replacing it. Under Server Authority the Input Action System is mandatory ([server-authority.md](server-authority.md)).
- **Gamepad/console:** every interactive GuiObject reachable via `Selectable`/`NextSelectionUp/Down/Left/Right`; set `GuiService.SelectedObject` when opening a menu; test that focus never traps.
- **Touch:** minimum ~44 px effective touch targets; keep actions away from screen edges reserved by the OS; `ContextActionService`-created touch buttons for gameplay actions.
- Detect the *active* input type via `UserInputService:GetLastInputType()` + `LastInputTypeChanged` to swap prompt icons (keyboard "E" vs gamepad "X" vs touch button) — players switch mid-session. `PreferredInput` is also a `StyleQuery` condition, which handles the styling half declaratively.
- **Accessibility basics:** don't encode meaning in color alone; support `GuiService.ReducedMotionEnabled` and `GuiService.PreferredTextSize`; keep flashing effects mild.
- **Performance tiers:** treat low-end mobile as the baseline — test there, scale effects *up* for strong devices, not down from PC. Never infer device power from `TouchEnabled`. Frame budgets, the degradation ladder, and adaptive quality: [device-performance.md](device-performance.md).
