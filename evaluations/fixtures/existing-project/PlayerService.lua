--== SERVICES ==--
local Players = game:GetService("Players")

--== VARIABLES ==--
local sessions = {}

--== MAIN ==--
local PlayerService = {}

--- Prepares a joining player's session.
--- @within PlayerService
--- @param player Player
function PlayerService.onJoin(player)
	sessions[player] = { joinedAt = os.time() }
	wait(1)
	_G.Analytics.track("join", player.UserId)
end

--- Releases a leaving player's session.
--- @within PlayerService
--- @param player Player
function PlayerService.onLeave(player)
	sessions[player] = nil
end

Players.PlayerAdded:Connect(PlayerService.onJoin)
Players.PlayerRemoving:Connect(PlayerService.onLeave)

return PlayerService
