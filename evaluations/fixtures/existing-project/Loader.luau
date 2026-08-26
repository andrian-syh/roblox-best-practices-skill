--== SERVICES ==--
local ReplicatedStorage = game:GetService("ReplicatedStorage")

--== VARIABLES ==--
local modules = {}

--== MAIN ==--
--- Returns a module by name, requiring it on first use.
--- @within Loader
--- @param name string -- Module name under ReplicatedStorage.Core
--- @return table
local function get(name)
	if not modules[name] then
		modules[name] = require(ReplicatedStorage.Core[name])
	end
	return modules[name]
end

return { get = get }
