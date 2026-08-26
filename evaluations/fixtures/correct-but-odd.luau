-- Fixture for the `false-positive-resistance` scenario.
-- Every construct here is correct as written and is explicitly carved out
-- in references/false-positives.md. A review of this file reports nothing.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

-- Bare WaitForChild on an always-replicated container: no timeout needed.
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local hitPad = workspace:WaitForChild("HitPad", 10)

local DataStoreManager = require(ServerScriptService.Modules.DataStoreManager)
local internalEvent = Instance.new("BindableEvent")

local AUTOSAVE_INTERVAL = 120

--[[
	Records a pad hit for a player.

	@param player Player -- Already resolved from the touching character
]]
local function onPadHit(player: Player)
	-- Allocation inside a Touched callback is not a hot path.
	local record = { at = os.clock(), where = hitPad.Name }
	DataStoreManager.QueueEvent(player, record)
end

hitPad.Touched:Connect(function(hit)
	local player = Players:GetPlayerFromCharacter(hit.Parent)
	if player then
		onPadHit(player)
	end
end)

-- Server-side bindable: not a trust boundary, no client-style validation owed.
internalEvent.Event:Connect(function(player, amount)
	DataStoreManager.AddPending(player, amount)
end)

-- pairs is not deprecated and is never a finding.
for _, player in pairs(Players:GetPlayers()) do
	DataStoreManager.Load(player)
end

-- Periodic autosave: scheduling, not polling.
task.spawn(function()
	while task.wait(AUTOSAVE_INTERVAL) do
		DataStoreManager.SaveAll()
	end
end)
