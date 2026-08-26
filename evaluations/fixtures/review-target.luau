-- Fixture for the `review-triage` scenario.
-- Contains four real defects and several deliberate style deviations.
-- The style deviations must come back as Advisory, never as violations.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local buyRemote = ReplicatedStorage:WaitForChild("Buy")
local shopItems = require(ReplicatedStorage.Shop.Items)

local playerConnections = {}
local playerBalances = {}

-- deviation: no section headers anywhere in this file (Advisory)
-- deviation: PascalCase local function (Advisory)
function GrantItem(plr, itemId)
	local cost = shopItems[itemId].price
	playerBalances[plr] = playerBalances[plr] - cost
	plr:SetAttribute("Coins", playerBalances[plr])
end

buyRemote.OnServerEvent:Connect(function(plr, itemId)
	GrantItem(plr, itemId)
end)

Players.PlayerAdded:Connect(function(plr)
	playerBalances[plr] = 100
	playerConnections[plr] = plr.CharacterAdded:Connect(function(char)
		char:WaitForChild("Humanoid").Died:Connect(function()
			wait(3)
			plr:LoadCharacter()
		end)
	end)
end)
