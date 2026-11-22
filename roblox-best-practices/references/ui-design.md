# UI Design and the Build-Verify Loop

How UI should look and how an agent builds and proves it. Instance mechanics (containers, layouts, modifiers, the styling system itself) live in [ui-crossplatform.md](ui-crossplatform.md); this file decides what to do with them.

Labels: **[Roblox]** official Roblox docs or a Studio probe, **[Standard]** an external standard (WCAG, Xbox Accessibility Guidelines), **[Heuristic]** design practice with no single authority. Never present a [Heuristic] as a rule the engine or a standard enforces.

## Contents

- [Decide the system once](#decide-the-system-once)
- [Restraint: what makes UI read as generated](#restraint-what-makes-ui-read-as-generated)
- [States and feedback](#states-and-feedback)
- [Readable on every screen](#readable-on-every-screen)
- [Build recipe](#build-recipe)
- [Verify recipe](#verify-recipe)
- [Agent failure modes](#agent-failure-modes)

## Decide the system once

Generic UI comes from deciding every value per element. Decide them once, before the first screen, and make every element reference the decision.

A project that already has a style (a style guide, a StyleSheet, consistent existing screens) keeps it: read it first and extend it. Otherwise propose this token set and wait for the user's answer on colours and fonts, which are a design choice:

| Token group | Contents | Label |
|---|---|---|
| Colour | `Bg`, `Surface`, `Ink`, `InkMuted`, one `Accent`, `Success`, `Danger`, `Warning` | [Heuristic] |
| Radius | three steps by role (control, card, panel); a nested corner is the outer radius minus the padding between them | [Heuristic] |
| Spacing | one scale on a 4 or 8 step, used for `UIPadding` and layout `Padding` | [Heuristic] |
| Type | at most five sizes and two `FontFace` weights | [Heuristic] |
| Stroke | one thickness and one colour role | [Heuristic] |

Hold the tokens as attributes on a token `StyleSheet` and reference them as `$Name`; apply them with tag rules (`.ButtonPrimary`) and modifier rules (`::UICorner`, `::UIStroke`) so no element carries a raw value. A per-instance override shows in bold in the Properties window, which makes drift visible [Roblox] ([ui-crossplatform.md](ui-crossplatform.md#the-styling-system)).

One meaning per colour across the whole game (health is always the same colour), one close-button style, and a written style guide are Roblox's own recommendations [Roblox].

## Restraint: what makes UI read as generated

Each tell below is a cluster signal, not proof. Two or three together read as generated.

| Tell | Do instead |
|---|---|
| A gradient, stroke, or shadow on every element | One depth cue per surface. Game UI may use all three, as one tokenised recipe for one role |
| Emoji or mixed icon sets as icons | One icon family at one stroke weight, uploaded as images |
| Every card the same rounded box with the same padding | Radius and padding by role; hierarchy from size and weight, not from boxes |
| Boxes nested inside boxes | Group with spacing first; add a surface only where grouping by space fails |
| More than one filled primary button in a view | Exactly one primary; the rest secondary or text buttons |
| Everything centred | Align to one edge per column; centre only titles and modal actions |
| Accent colour spread across the screen | Accent on the primary action and live state only |
| Glow or pulsing at rest | Motion only on a state change the player caused or must notice |
| Placeholder numbers, lorem text, invented stats | Real labels from the game's data, or clearly marked empty states |
| Many text sizes and fonts | The type tokens only |

The web rule "no gradients, no shadows" does not transfer: games use strokes, shadows, and saturated colour on purpose. The rule that transfers is that each is a deliberate token, not a default [Heuristic].

## States and feedback

- Every interactive component defines hover, pressed, selected, and disabled in the sheet, distinct from each other [Roblox]. Disabled reads as unavailable (muted, never only a colour change).
- Animate state changes with Styling Transitions or a client tween. Transitions do not fire on layout-driven changes, so a size set by a layout never animates through them [Roblox].
- Gamepad: every interactive element is selectable and the first focus is set when a screen opens ([ui-crossplatform.md](ui-crossplatform.md#cross-platform-ux)).
- Visual work runs on the client only; the server never tweens UI.

## Readable on every screen

| Check | Number | Label |
|---|---|---|
| Body text contrast | 4.5:1 (WCAG 1.4.3); large text 3:1 | [Standard] |
| Control and icon contrast | 3:1 against what surrounds it (WCAG 1.4.11) | [Standard] |
| Touch target | 24 px minimum (WCAG 2.5.8); 44 px enhanced (2.5.5) | [Standard] |
| Smallest text | 26 px at 1080p on console, 18 px on PC and mobile (Xbox XAG 101) | [Standard] |
| Text growth | still usable at 200 % of its size (XAG 101) | [Standard] |
| Meaning | never carried by colour alone (WCAG 1.4.1) | [Standard] |

Roblox's docs give no numbers of their own [Roblox]. Measure contrast with `Color3:GetContrastRatio` on the token colours, once, not per element.

- Size text from the type tokens with `TextSize`, honour `GuiService.PreferredTextSize`, and let `AutomaticSize` or `TextWrapped` absorb length. `TextScaled` ignores the player's text-size preference, so reserve it for decorative display text [Roblox].
- Reduced motion: a `StyleQuery` on `ReducedMotionEnabled`, or a tween time of 0 when `GuiService.ReducedMotionEnabled` is true [Roblox].
- Keep actions out of the bottom corners and the top bar, which core UI and thumbs occupy; test portrait phones, where most layout bugs hide [Roblox].

## Build recipe

1. Read what exists: the project's StyleSheets, existing screens, and whether UI is built by a library (React-lua, Fusion, Vide). A library project keeps its idiom and is built through files, never by hand-made Instances mixed into its tree.
2. Fixed screens are Instances made in Edit; they persist and the inspect tools can read them. Repeating rows clone one template at runtime.
3. One `execute_luau` call per screen: a table-driven builder that sets every property first, parents the `ScreenGui` last, and returns only a count and the names it made. Never one call per instance.
4. One `ScreenGui` per feature, a root frame with `AnchorPoint` and a `UIAspectRatioConstraint` or `UISizeConstraint`, sizes in Scale with Offset only for hairlines and padding.
5. Runtime code changes the player's `PlayerGui` copy, never `StarterGui`.
6. Read the result back in a separate call before saying it exists ([studio-mcp.md](studio-mcp.md#ground-truth-rules)).

## Verify recipe

Cheapest first. Stop at the first step that fails and fix before going on.

1. **Read-back for violations.** One call that walks the screen and returns only problems: an `AbsoluteSize` of zero, a box outside `Camera.ViewportSize`, `TextBounds` larger than its box, an interactive element under the touch floor, a contrast pair under its ratio. A list of nothing is the pass.
2. **Device sweep.** In Edit, read `GetDeviceListAsync`, pick devices by `GetDeviceInfoAsync(id).Name` or `DeviceForm` (ids are internal strings), call `SetDeviceAsync` and `SetOrientationAsync` inside `pcall`, wait about 0.2 seconds after each setter, rerun step 1 per device, and finish with `StopSimulationAsync`. Probed in 748: the smallest phone gave a 666 by 374 viewport and 374 by 666 in portrait. During Play, setters work from the Client DataModel and error from the Server one ("cannot change device in current game state"), probed in 748. The scaling mode is never reset, so leave it alone. Four or five devices, including a portrait phone and a console, cover most failures. Studio UI that is built at runtime shows nothing in Edit; sweep it in Play instead.
3. **Play.** `execute_luau` with the Client DataModel reads `Players.LocalPlayer.PlayerGui` and its `AbsoluteSize` values during a playtest (probed in 748). A `ScreenGui` with `IgnoreGuiInset` reports a taller size than one without; check both. Read the console for errors.
4. **Look last.** A screenshot judges appearance only, never whether something exists. `screen_capture` captures the viewport in Edit and Play and is documented for external clients, but check the live tool list: in 748 one client saw only `video_capture` (Client DataModel, playtest only, returns file paths). With no still capture, steps 1 and 3 are the proof; record video only for motion or timing ([studio-mcp.md](studio-mcp.md#capability-map)).
5. **Click through.** `user_mouse_input` can target a UI instance; drive the primary action and read the state it changed, not pixels.

The read-back in step 1, as one call:

```lua
-- // VARIABLES // --
local Players = game:GetService("Players")

local TOUCH_FLOOR = 44


-- // FUNCTIONS // --
--[[
	Reports whether the player can see this object, counting every hidden ancestor.

	@param object GuiObject -- the object to test
	@param root ScreenGui -- the screen that holds it
	@return boolean
]]
local function isShown(object: GuiObject, root: ScreenGui): boolean
	local current: Instance? = object

	while current and current ~= root do
		if current:IsA("GuiObject") and not current.Visible then
			return false
		end

		current = current.Parent
	end

	return root.Enabled
end

--[[
	Lists the visible problems in one screen so a pass is an empty result.

	@param root ScreenGui -- the screen to check
	@return { string } -- one line per problem
]]
local function findProblems(root: ScreenGui): { string }
	local problems = {}
	local viewport = workspace.CurrentCamera.ViewportSize

	for _, object in root:GetDescendants() do
		if not object:IsA("GuiObject") or not isShown(object, root) then
			continue
		end

		local size = object.AbsoluteSize
		local position = object.AbsolutePosition

		if size.X <= 0 or size.Y <= 0 then
			table.insert(problems, object:GetFullName() .. " has no size")
		elseif position.X < 0 or position.Y < 0 or position.X + size.X > viewport.X or position.Y + size.Y > viewport.Y then
			table.insert(problems, object:GetFullName() .. " leaves the screen")
		end

		if object:IsA("TextLabel") or object:IsA("TextButton") then
			if object.TextBounds.X > size.X or object.TextBounds.Y > size.Y then
				table.insert(problems, object:GetFullName() .. " overflows its text")
			end
		end

		if object:IsA("GuiButton") and math.min(size.X, size.Y) < TOUCH_FLOOR then
			table.insert(problems, object:GetFullName() .. " is under the touch floor")
		end
	end

	return problems
end


-- // INITIALIZATION // --
local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")
local report = {}

for _, screen in playerGui:GetChildren() do
	if screen:IsA("ScreenGui") then
		local problems = findProblems(screen)

		table.move(problems, 1, #problems, #report + 1, report)
	end
end

return table.concat(report, "\n")
```

Run it in the Client DataModel during Play. In Edit, point it at `StarterGui` after a device switch. Set `TOUCH_FLOOR` to the floor the project chose.

## Agent failure modes

| Failure | Caught by |
|---|---|
| Setting `Size` or `Position` on a child a layout controls (the layout wins) | read-back: nothing moved |
| Offset-only sizes that fit one screen | device sweep |
| Missing `AnchorPoint`, so a centred frame sits off centre | read-back: leaves the screen |
| `ZIndex` used across `ScreenGui`s, where `DisplayOrder` decides | screenshot, then read `DisplayOrder` |
| `ResetOnSpawn` left `true` on a persistent screen (the `Instance.new` default) | respawn in Play |
| A `ScreenGui` inside a folder under `StarterGui` resets on spawn even with `ResetOnSpawn` false [Roblox] | respawn in Play |
| Editing `StarterGui` during Play and expecting the player to see it | Play read of `PlayerGui` |
| An invented class or property (there is no `UIFlexLayout`) | the read-back errors; check [api-currency.md](api-currency.md) |
| `TextScaled` text that ignores the player's text-size setting | review against [Readable on every screen](#readable-on-every-screen) |
| Declaring a screen done because the build call returned | a separate read-back |
| A `StyleQuery` on size that also styles size, which flickers [Roblox] | screenshot at the breakpoint |
