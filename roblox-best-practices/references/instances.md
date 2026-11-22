# Non-Script Instances: Properties, Assets, and Studio Builds

Parts, MeshParts, Models, decals, attachments, welds, constraints, lights, particles, audio, and folders in Luau and Studio. For `ScreenGui`, `BillboardGui`, and `SurfaceGui`, see [ui-crossplatform.md](ui-crossplatform.md) and [ui-design.md](ui-design.md).

Maturity tags (`[GA]`, `[Beta]`, `[Verify]`) cite the versioned API dump, `create.roblox.com/docs`, and Studio Edit probes ([api-currency.md](api-currency.md)).

## Contents

- [Part and BasePart traps](#part-and-basepart-traps)
- [Welds, constraints, and assemblies](#welds-constraints-and-assemblies)
- [Models, pivots, scaling, and streaming](#models-pivots-scaling-and-streaming)
- [Meshes, surfaces, and asset IDs](#meshes-surfaces-and-asset-ids)
- [Lights, particles, audio, and containers](#lights-particles-audio-and-containers)
- [Build and read-back recipe](#build-and-read-back-recipe)
- [Mesh segmentation and procedural prompts](#mesh-segmentation-and-procedural-prompts)

## Part and BasePart traps

Broadphase and query baselines: [performance.md](performance.md#physics-queries-and-contact-detection), [device-performance.md](device-performance.md#engine-levers-before-script-levers).

| Member | Trap and rule |
|---|---|
| `Instance.new("Part")` | Defaults: `Anchored = false`, `CanCollide`/`CanQuery`/`CanTouch`/`CastShadow = true`, `Size = Vector3.new(4, 1.2, 2)`. Anchor static parts or they fall under client ownership |
| `Anchored` | Suppresses `Touched` between anchored parts; anchoring welded parts splits the assembly and sets `WeldConstraint.Active = false` |
| `CanQuery` | `CanQuery = false` skips `Raycast`/bounds queries only when `CanCollide = false`; `CanCollide = true` still hits |
| `CanTouch` | `CanCollide = false` keeps `Touched` active; `CanTouch = false` stops it, disconnects listeners, and throws on `Touched:Connect()` |
| `CollisionFidelity` | `Default`, `Hull`, `Box`, `PreciseConvexDecomposition` (HACD), `Tunable`. `CanCollide = false` meshes keep HACD `PhysicsParts` RAM unless `Box`/`Hull` |
| `RenderFidelity` | `Automatic` swaps LOD at `<250`, `250-500`, `>=500` studs (`Precise`, `Performance`) |
| `PluginOrOpenCloud` write | `CollisionFidelity`, `FluidFidelity`, `RenderFidelity`, `Model.LevelOfDetail` carry `Capabilities.Write = PluginOrOpenCloud`. Edit `execute_luau` sets `LevelOfDetail` and `RenderFidelity` [GA]; runtime `Script` writes stay [Verify] (`AssetService:CreateMeshPartAsync` / `ApplyMesh`) |
| `CastShadow` | Sun shadows (distinct from `Light.Shadows`). Semi-transparent parts (`Transparency < 1`) cast opaque shadows unless `CastShadow = false` |
| `Massless` / `AssemblyMass` | `Massless = true` is ignored on `AssemblyRootPart`. `GetMass()` ignores `Massless`; `AssemblyMass` sums non-`Massless` parts plus root (`inf` if anchored) |
| `Part.Shape` | `Ball`: sphere diameter `math.min(Size.X, Size.Y, Size.Z)`. `Cylinder`: height on **X axis** (`Size.X`), unlike `CylinderMesh` (Y axis) |
| `Size` | 0.001 to 2,048 studs per axis; physics clamps `<0.05` up to `0.05` (`ExtentsSize`). `Cylinder`/`TriangleMeshPart` use approximate collision |
| `CFrame` vs `PivotTo` vs `Position` | `BasePart:PivotTo(cf)` uses `PivotOffset`; `CFrame` sets center. Avoid `Position` on welded parts (breaks `WeldConstraint` offsets) |

## Welds, constraints, and assemblies

Constraints replace `Body*` movers ([style-rules.md](style-rules.md#rules)); unanchored ownership: [patterns/network.md](patterns/network.md#network-ownership).

| Class | Use for | Agent trap |
|---|---|---|
| `WeldConstraint` | Rigid `Part0`/`Part1` join | No `C0`/`C1`. `CFrame` moves the assembly; `Position` disables the weld and overwrites offset. `Active = false` outside `Workspace`/`WorldModel`, if both anchored, or if cyclic |
| `RigidConstraint` | `Attachment` / `Bone` rigid join | Reposition via attachment `CFrame` instead of part `Position` or `Weld.C0`/`C1` |
| `AlignPosition` / `AlignOrientation` | Smooth position / orientation drive | `Mode` defaults to `TwoAttachment`, so `.Position`/`.CFrame` is ignored until `Mode = OneAttachment`. `RigidityEnabled` and `ReactionForceEnabled`/`ReactionTorqueEnabled` default `false` |
| `LinearVelocity` | Target velocity | `ForceLimitsEnabled` caps force (`VelocityConstraintMode` defaults to `Vector`), stalling heavy assemblies |
| `HingeConstraint` | Single-axis hinge | Rotates around attachment **X axis** (`Axis`), `CurrentAngle` between Y axes (`SecondaryAxis`). Angles are **degrees**; `AngularVelocity`/`AngularSpeed` are **rad/s**. `LimitsEnabled` defaults `false`, `ActuatorType` defaults `None` |
| Detached `Attachment` | Lights, emitters, or audio | Parent under `Terrain`/`Folder`/`Model`/`Workspace` (`CFrame == WorldCFrame`) instead of invisible dummy parts. Constraints still require `BasePart` ancestors (`Active = false` otherwise) |

## Models, pivots, scaling, and streaming

Streaming modes, `nil`-parenting, and `Destroying` behavior: [patterns/network.md](patterns/network.md#streaming-streamingenabled).

| Member | Rule |
|---|---|
| `Model.CFrame` / `SetPrimaryPartCFrame` | `Model` has no `.CFrame` (throws); `SetPrimaryPartCFrame` is deprecated. Use `PivotTo()` and `GetPivot()` |
| `PivotTo(cf)` vs `MoveTo(pos)` | `PivotTo(CFrame)` keeps rotation, skips overlap checks, keeps `WeldConstraint`s active. `MoveTo(Vector3)` drops rotation and snaps upward over obstructions |
| `PivotOffset` vs `WorldPivot` | With `PrimaryPart`, pivot is `PrimaryPart.CFrame * PivotOffset` (`WorldPivot` ignored). Without it, `WorldPivot` auto-centers only until first write; `PivotTo`/`MoveTo` on an empty `Model` locks `WorldPivot` permanently |
| `ResetPivotToBoundingBox` | Does **not** exist. Read `cf = model:GetBoundingBox()` (pivot-oriented `(CFrame, Vector3)`; `GetExtentsSize()` returns `Vector3` only) and set `PrimaryPart.PivotOffset = PrimaryPart.CFrame:ToObjectSpace(cf)` or `model.WorldPivot = cf` |
| `ScaleTo(scale)` | Uniform only (`scale > 0`; `0`/neg/`NaN`/`inf` fail/corrupt). Scales parts, constraint offsets, emitter sizes, `Sound.RollOffMinDistance` (`Model.Scale` `NotScriptable`) |
| Streaming & `LevelOfDetail` | `Atomic` delays arrival until all initial descendants replicate (later children are not atomic); `Persistent` inflates low-end join RAM; `AddPersistentPlayer`/`RemovePersistentPlayer` need `PersistentPerPlayer`. `LevelOfDetail` (`StreamingMesh`/`SLIM`) creates non-physical imposters (`SLIM` skips animated/modified models; Edit `execute_luau` writable [GA], runtime `Script` [Verify]) |

## Meshes, surfaces, and asset IDs

Texture VRAM and instancing: [device-performance.md](device-performance.md#engine-levers-before-script-levers). External sync: [external-editors.md](external-editors.md#rojo).

| Topic | Class / API | Trap and rule |
|---|---|---|
| Runtime meshes | `MeshPart`, `AssetService` | `MeshId`/`MeshContent` carry `NotAccessibleSecurity` (`The current thread cannot write 'MeshContent'`). Use `AssetService:CreateMeshPartAsync(Content.fromAssetId(id), options)` or `MeshPart:ApplyMesh(template)` from a pre-made `MeshPart`. `MeshSize` is read-only; `DoubleSided` renders both faces |
| `SpecialMesh` | `SpecialMesh`, `FileMesh` | Visual-only `Scale`/`Offset` (collision stays `Part.Size`); breaks `Material`; no LOD/PBR; `VertexColor` is `Vector3` (`0..1`). Use only for synchronous `MeshId` swaps |
| `EditableMesh` / CSG | `EditableMesh`, `UnionOperation` | `EditableMesh`/`EditableImage` are `NotCreatable` (`Unable to create an Instance of type "EditableMesh"`). `Content.fromObject()` does not replicate (cyan/magenta checkerboard); needs Allow Mesh/Image APIs. Prefer `MeshPart` over CSG `UnionOperation` (triangle bloat) and avoid burst `GeometryService` calls |
| Surfaces & PBR | `Decal`, `Texture`, `SurfaceAppearance`, `MaterialVariant`, `Glass` | `Decal` stretches, `Texture` tiles (`StudsPerTileU`/`V`) on a `NormalId` face (equal `ZIndex` Z-fights; `Color3` tint needs white source). `SurfaceAppearance` is UV-mapped on `MeshPart` only, overrides `TextureID`/`MaterialVariant` visuals, and map writes need `PluginSecurity` (`AssetService:CreateSurfaceAppearanceAsync`; `AlphaMode.Transparency` needs `MeshPart.Transparency == 0`). `MaterialVariant` sits in `MaterialService` keyed `(Name, BaseMaterial)`. `Glass` skips mobile refraction |
| `Content` & IDs | `Content`, `ContentProvider` | Writable `*Content` fields take `Content` (`Content.fromAssetId(id)`/`fromUri(uri)`/`Content.none`); strings throw `Content expected, got string`. Bare numbers fail in Luau (prefix `"rbxassetid://"`). Decal URLs give Decal IDs that render blank in `Image`/`Decal.Texture`/`ParticleEmitter.Texture` (use Image ID or `rbxthumb://type=Asset&id=...&w=420&h=420`). Never ship `rbxasset://`. Audio is private on upload; Asset Privacy (`Restricted`) breaks personal-to-group transfers. Moderated/unpermitted assets fail silently; check `ContentProvider:GetAssetFetchStatus` |

## Lights, particles, audio, and containers

Pooled `Sound` / `:Emit()`: [performance.md](performance.md#memory). Spatial audio: [genres.md](genres.md#horror--story--atmosphere).

| Class | Parent and setup | Failure trap |
|---|---|---|
| Lights (`PointLight`, `SpotLight`, `SurfaceLight`) | Direct child of `BasePart` or `Attachment` in `Workspace` | `Model`/`Folder` emit nothing. `Range` max **120** studs. Under `Attachment`, `SurfaceLight` acts as a `SpotLight`. Shadows off below quality 4; large overlapping lights hit mobile `LightGridCPU` |
| `ParticleEmitter` | `BasePart` (volume) or `Attachment` (point, `Orientation`) | `Sphere`/`Cylinder` break under `Attachment`. `Enabled = false` finishes `Lifetime` (20 s max); `:Emit(count)` (default 16) skips `Rate` quality throttling; `:Clear()` wipes immediately. `Rate` max 400/s desktop, 100/s mobile. `LightEmission` emits no light; `LightInfluence` defaults `1` in Studio vs `0` in `Instance.new`. 20 keypoints max |
| `Sound` vs Audio API | `BasePart`/`Attachment` = 3D; `SoundService`/`Folder`/`Workspace` = 2D | Audio docs prefer `AudioPlayer` + `Wire` + `AudioEmitter`/`AudioListener` -> `AudioDeviceOutput` for multi-effect/3D routing (`AudioListener` needs `AudioDeviceOutput`). `:Play()` resets `TimePosition`, `:Resume()` continues; `TimeLength == 0` until `IsLoaded` (`if not sound.IsLoaded then sound.Loaded:Wait() end`); unpermitted `SoundId` fails silently |
| Containers & `Highlight` | `Folder` for grouping; `Model` for assemblies, `PivotTo`, `ScaleTo`, streaming, `Highlight` | `Configuration` adds nothing over `Folder` (use Attributes). Clients cap at **255** `Highlight`s; `Enabled = false` still uses a slot, so `Destroy()` unused ones |

## Build and read-back recipe

Mirrors [ui-design.md](ui-design.md#build-recipe):

1. **Read first:** Inspect parent, sync ownership ([external-editors.md](external-editors.md)), and `list_roblox_skills` ([studio-mcp.md](studio-mcp.md#roblox-skills-over-mcp)). **Edit** persists; **Play** discards.
2. **Batch write:** Build from a table in one `execute_luau` per chunk inside an off-tree container, properties first, parent last, flushing each chunk container before yielding ([studio-mcp.md](studio-mcp.md#running-luau-through-the-tool)). Use `template:Clone()` and `workspace:BulkMoveTo(parts, cframes, Enum.BulkMoveMode.FireCFrameChanged)` for bulk moves.
3. **Return counts and names only** ([studio-mcp.md](studio-mcp.md#token-discipline)).
4. **Separate read-back, look last:** `inspect_instance` is Edit-only, case-insensitive, has no `uniqueId` (>20 same-named siblings unreachable), omits tags/child props, and splits `CFrame`; `search_game_tree` caps live in [studio-mcp.md](studio-mcp.md#token-discipline). Run the verifier below in a separate `execute_luau`; capture viewport only for visuals.

```lua
-- // FUNCTIONS // --
--[[
	Checks a built instance subtree for setup defects, returning problem lines only.

	@param root Instance -- Container or Model to validate
	@return { string } -- Problem lines; empty when clean
]]
local function findInstanceProblems(root: Instance): { string }
	local problems: { string } = {}

	for _, item in root:GetDescendants() do
		if item:IsA("BasePart") then
			local size = item.Size

			if math.min(size.X, size.Y, size.Z) < 0.05 then
				table.insert(problems, item:GetFullName() .. " has sub-0.05 physics axis")
			end

			local isDynamic = item:GetAttribute("Dynamic") == true

			if not item.Anchored and not isDynamic and #item:GetJoints() == 0 and not item:FindFirstChildWhichIsA("Attachment") then
				table.insert(problems, item:GetFullName() .. " is unanchored without Dynamic attribute or joint")
			end
		elseif item:IsA("WeldConstraint") and not item.Active then
			table.insert(problems, item:GetFullName() .. " WeldConstraint is inactive")
		elseif item:IsA("Light") or item:IsA("ParticleEmitter") then
			local parent = item.Parent

			if not parent or (not parent:IsA("BasePart") and not parent:IsA("Attachment")) then
				table.insert(problems, item:GetFullName() .. " requires BasePart or Attachment parent")
			end
		end
	end

	return problems
end
```

## Mesh segmentation and procedural prompts

Assistant `/segment_mesh` replaces the mesh in place (`create.roblox.com/docs/assistant/guide`); MCP `segment_mesh` keeps the source and inserts a sibling `Model` ([studio-mcp.md](studio-mcp.md#capability-map)). Both target `MeshPart` (not `Model`), take <=5 names/call, and re-run on outputs.

| Type | Recommended part names |
|---|---|
| `car` | `body, left front wheel, right front wheel, left rear wheel, right rear wheel` |
| `motorcycle` | `frame, handlebars, front fork, front wheel, rear wheel` |
| `helicopter` | `body, main rotor blade` |
| `gun` | `grip, frame, barrel` |
| `turret` | `tripod base, swivel mount, gun body, barrel, shield plate` |
| `sword` | `handle, hand guard, blade, pommel` |

For `generate_procedural_model`, specify editable attributes (count, spacing, curvature, material) and proportional scaling rules.
