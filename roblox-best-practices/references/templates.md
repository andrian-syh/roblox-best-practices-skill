# Script Templates

Canonical, fully-annotated examples of the section layout. Copy the shape, not the content. Omit any subsection that would be empty — never leave placeholder headers.

## Contents

- [Server Script](#server-script)
- [ModuleScript](#modulescript)
- [LocalScript](#localscript)
- [Notes on the templates](#notes-on-the-templates)

## Server Script

```lua
--!strict

-- // VARIABLES // --

-- | Services | --
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")

-- | Modules | --
-- Ordered SSS -> ServerStorage -> ReplicatedStorage -> Workspace -> relative
local PlayerData = require(ServerStorage.Modules.PlayerData)
local Purchases = require(ServerStorage.Modules.Purchases)

-- | Objects | --
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local purchaseRemote = remotes:WaitForChild("Purchase") :: RemoteEvent

-- | Configuration | --
local MAX_PURCHASES_PER_WINDOW = 10
local PURCHASE_WINDOW = 60

-- | State Management | --
local purchaseWindows: {[Player]: {count: number, windowStart: number}} = {}
local playerConnections: {[Player]: {RBXScriptConnection}} = {}

-- // FUNCTIONS // --

--[[
	Handles a purchase request coming from a client, rejecting anything invalid.

	@param itemId unknown -- Untrusted client argument; validated before use
]]
local function onPurchaseRequest(player: Player, itemId: unknown)
	if typeof(itemId) ~= "string" then return end
	local now = os.clock()
	local window = purchaseWindows[player]
	if not window or now - window.windowStart > PURCHASE_WINDOW then
		window = {count = 0, windowStart = now}
		purchaseWindows[player] = window
	end
	if window.count >= MAX_PURCHASES_PER_WINDOW then return end
	window.count += 1
	Purchases.Grant(player, itemId)
end

--[[
	Prepares everything a newly joined player needs, including players already present when this script starts.
]]
local function onPlayerAdded(player: Player)
	playerConnections[player] = {}
	PlayerData.Load(player)
end

--[[
	Releases everything owned by a leaving player.
]]
local function onPlayerRemoving(player: Player)
	PlayerData.Save(player)
	for _, connection in playerConnections[player] or {} do
		connection:Disconnect()
	end
	playerConnections[player] = nil
	purchaseWindows[player] = nil
end

--[[
	Finalizes pending state so the server can shut down safely.
]]
local function onClose()
	PlayerData.SaveAll()
end

-- // INITIALIZATION // --

-- | Player Events | --
Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(onPlayerRemoving)
for _, player in Players:GetPlayers() do
	task.spawn(onPlayerAdded, player)
end

-- | Remotes | --
purchaseRemote.OnServerEvent:Connect(onPurchaseRequest)

-- | Lifecycle | --
game:BindToClose(onClose)
```

## ModuleScript

```lua
--!strict

-- // VARIABLES // --

-- | Services | --
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

-- | Modules | --
local DeepCopy = require(script.Parent.DeepCopy)

-- | Configuration | --
local STORE_NAME = "PlayerData_v1"
local MAX_RETRIES = 3
local RETRY_BASE_DELAY = 1

-- | State Management | --
local store = DataStoreService:GetDataStore(STORE_NAME)
local sessionCache: {[Player]: {[string]: any}} = {}

local PlayerData = {}

-- // FUNCTIONS // --

-- | Private | --

--[[
	Runs a fallible operation under this module's retry policy.

	@param fn (() -> T...) -- The operation to attempt; may be retried multiple times
	@return boolean -- Whether it eventually succeeded, followed by its results
]]
local function withRetry<T...>(fn: () -> T...): (boolean, T...)
	for attempt = 1, MAX_RETRIES do
		local results = table.pack(pcall(fn))
		if results[1] then
			return table.unpack(results, 1, results.n) :: any
		end
		task.wait(RETRY_BASE_DELAY * 2 ^ (attempt - 1))
	end
	return false
end

-- | Public | --

--[[
	Makes the player's persistent data available for this session.
]]
function PlayerData.Load(player: Player)
	local ok, data = withRetry(function()
		return store:GetAsync(`player_{player.UserId}`)
	end)
	sessionCache[player] = if ok and data then data else DeepCopy(PlayerData.Defaults)
end

--[[
	Persists the player's session data and releases it.
]]
function PlayerData.Save(player: Player)
	local data = sessionCache[player]
	if not data then return end
	withRetry(function()
		store:UpdateAsync(`player_{player.UserId}`, function()
			return data
		end)
	end)
	sessionCache[player] = nil
end

--[[
	Persists the data of every active player (typically on shutdown).
]]
function PlayerData.SaveAll()
	for player in sessionCache do
		task.spawn(PlayerData.Save, player)
	end
end

-- // INITIALIZATION // --

PlayerData.Defaults = {
	coins = 0,
	level = 1,
}

return PlayerData
```

## LocalScript

```lua
--!strict

-- // VARIABLES // --

-- | Services | --
local Players = game:GetService("Players")

-- | Objects | --
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local hud = playerGui:WaitForChild("HUD")
local coinLabel = hud:WaitForChild("CoinLabel") :: TextLabel

-- | Configuration | --
local COIN_ATTRIBUTE = "Coins"

-- | State Management | --
local displayedCoins = 0

-- // FUNCTIONS // --

--[[
	Synchronizes the coin display with the player's current state.
]]
local function updateCoinDisplay()
	local coins = player:GetAttribute(COIN_ATTRIBUTE) or 0
	if coins == displayedCoins then return end
	displayedCoins = coins
	coinLabel.Text = tostring(coins)
end

-- // INITIALIZATION // --

player:GetAttributeChangedSignal(COIN_ATTRIBUTE):Connect(updateCoinDisplay)
updateCoinDisplay()
```

## Notes on the templates

- The ModuleScript's table (`local PlayerData = {}`) lives at the end of State Management; static data assigned to it (like `Defaults`) may be set in INITIALIZATION.
- `table.pack`/`table.unpack` in `withRetry` is acceptable here because retries are rare-path; never do this in a hot loop.
- The LocalScript reads state via Attributes rather than a RemoteEvent — prefer attribute/tag replication for simple state; reserve remotes for actions.
- Every declared Service/Module/Object/constant in these templates is used — copy that discipline: declare only what the script actually needs.
- Bare `WaitForChild` is fine for containers that always replicate (ReplicatedStorage, PlayerGui). For `workspace` descendants under StreamingEnabled, use a timeout or a CollectionService tag signal instead ([patterns/network.md](patterns/network.md#streaming-streamingenabled)).
- The Documentation Comments here model this skill's default style (SKILL.md → FUNCTIONS). It is a **default, not a mandate**: a project that documents with Moonwave `--[=[ ]=]` or `---` blocks keeps its own form, and you match it. Three properties survive any style and are the ones to copy:
  - **Contract-level.** Every description says what the function is *for*. None of them names an API the body calls, a step it performs, or a module it delegates to — that is why they would all still be true after a rewrite.
  - **No volatile content.** No thresholds, no Configuration constant names, no system names. `updateCoinDisplay` is documented as synchronizing a display, not as "reads the Coins attribute and writes CoinLabel.Text".
  - **Moonwave tag syntax.** `@param <name> <type> -- <description>` and `@return <type> -- <description>`, present only where they say something the signature does not. The blocks with no tags are correct: their signatures already speak for themselves.
- **No in-body comments.** The templates carry zero prose comments inside any body — the "players already present" case lives in `onPlayerAdded`'s description and the loop's own shape (`GetPlayers` sweep through the same join path), not in a note beside it. That is the standard everywhere: when a statement seems to need a note, rename or restructure until it does not, and put contract-level reasoning in the block above ([section-layout.md](section-layout.md#in-body-comments-banned-self-documenting-code-instead)).
- The `--!strict` header shown is illustrative. Per SKILL.md it is opt-in — match the project's strictness and never add it unbidden.
