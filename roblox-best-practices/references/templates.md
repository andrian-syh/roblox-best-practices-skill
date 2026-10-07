# Script Templates

Canonical, fully-annotated examples of the section layout. Copy the shape, not the content. Omit any subsection that would be empty — never leave placeholder headers.

## Contents

- [Server Script](#server-script)
- [ModuleScript](#modulescript)
- [LocalScript](#localscript)
- [Notes on the templates](#notes-on-the-templates)

## Server Script

```lua
-- // VARIABLES // --

-- | Services | --
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")

-- | Modules | --
local PlayerData = require(ServerStorage.Modules.PlayerData)
local Purchases = require(ServerStorage.Modules.Purchases)

-- | Objects | --
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local purchaseRemote = remotes:WaitForChild("Purchase") :: RemoteEvent

-- | Configuration | --
local MAX_PURCHASES_PER_WINDOW = 10
local PURCHASE_WINDOW = 60
local LOAD_FAILED_MESSAGE = "Your data could not be loaded, so nothing was changed. Please rejoin."

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
	if not PlayerData.Load(player) and player.Parent then
		player:Kick(LOAD_FAILED_MESSAGE)
	end
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
-- // VARIABLES // --

-- | Services | --
local DataStoreService = game:GetService("DataStoreService")

-- | Modules | --
local DeepCopy = require(script.Parent.DeepCopy)

-- | Configuration | --
local STORE_NAME = "PlayerData_v1"
local MAX_RETRIES = 3
local RETRY_BASE_DELAY = 1

-- | State Management | --
local store = DataStoreService:GetDataStore(STORE_NAME)
local sessions: {[Player]: {data: {[string]: any}, saveable: boolean}} = {}

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
	Makes the player's persistent data available for this session. A session whose stored
	data could not be read is kept but never saved, so it cannot overwrite that data.

	@return boolean -- False when the stored data was unreadable or the player has left
]]
function PlayerData.Load(player: Player): boolean
	local ok, stored = withRetry(function()
		return store:GetAsync(`player_{player.UserId}`)
	end)
	if not player.Parent then
		return false
	end
	sessions[player] = {
		data = if ok and stored ~= nil then stored else DeepCopy(PlayerData.Defaults),
		saveable = ok,
	}
	return ok
end

--[[
	Persists the player's session data and releases it.

	@return boolean -- Whether the data reached the store
]]
function PlayerData.Save(player: Player): boolean
	local session = sessions[player]
	if not session then return false end
	sessions[player] = nil
	if not session.saveable then return false end
	return withRetry(function()
		store:UpdateAsync(`player_{player.UserId}`, function()
			return session.data
		end)
	end)
end

--[[
	Persists the data of every active player, returning only once each save has finished.
]]
function PlayerData.SaveAll()
	for player in sessions do
		PlayerData.Save(player)
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
- The Documentation Comments here model this skill's default style ([section-layout.md](section-layout.md#documentation-comments-the-default-style-and-how-it-flexes)). It is a **default, not a mandate**: a project that documents with Moonwave `--[=[ ]=]` or `---` blocks keeps its own form, and you match it. Three properties survive any style and are the ones to copy:
  - **Contract-level.** Every description says what the function is *for*. None of them names an API the body calls, a step it performs, or a module it delegates to — that is why they would all still be true after a rewrite.
  - **No volatile content.** No thresholds, no Configuration constant names, no system names. `updateCoinDisplay` is documented as synchronizing a display, not as "reads the Coins attribute and writes CoinLabel.Text".
  - **Moonwave tag syntax.** `@param <name> <type> -- <description>` and `@return <type> -- <description>`, present only where they say something the signature does not. The blocks with no tags are correct: their signatures already speak for themselves.
- **No in-body comments.** The templates carry zero prose comments inside any body — the "players already present" case lives in `onPlayerAdded`'s description and the loop's own shape (`GetPlayers` sweep through the same join path), not in a note beside it. That is the standard everywhere: when a statement seems to need a note, rename or restructure until it does not, and put contract-level reasoning in the block above ([section-layout.md](section-layout.md#in-body-comments-banned-self-documenting-code-instead)).
- The templates carry no strictness header on purpose. `--!strict` is opt-in per SKILL.md: match the project's strictness and never add it unbidden.
- The ModuleScript's load fails loud ([patterns/data.md](patterns/data.md#failure-policy-what-happens-after-the-last-retry)): a session whose stored data could not be read is never saved, `Load` reports it, and the Server Script tells the player. A save releases the session before it yields, so `PlayerRemoving` and `BindToClose` racing for the same player write once, and `SaveAll` returns only after every save, which is what keeps `BindToClose` waiting.
