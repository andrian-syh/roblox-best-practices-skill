# Framework-Agnostic Patterns

Reusable patterns that work in any project structure. Each fits the VARIABLES/FUNCTIONS/INITIALIZATION layout.

> If the project uses a community library owning one of these concerns (ProfileStore for data, Packet/ByteNet for networking, Trove/Maid for cleanup, ...), the library's idioms replace the corresponding pattern here — see [community-libraries.md](community-libraries.md).

**Read the one file whose domain matches the task.** Each is self-contained; none of them needs the others.

| Domain | Contents | Read |
|---|---|---|
| **Data, ownership, failure** | One owner per fact · data persistence · failure policy after the last retry · per-owner locks | [patterns/data.md](patterns/data.md) |
| **Remotes and replication** | Remote communication · cross-server (MemoryStore, MessagingService, reserved servers) · StreamingEnabled | [patterns/network.md](patterns/network.md) |
| **Lifecycle and reuse** | Connection cleanup · character lifecycle (Humanoid vs CCL) · object pooling | [patterns/lifecycle.md](patterns/lifecycle.md) |
| **World and input** | CollectionService binding and attributes · client input · anti-patterns to reject on sight | [patterns/world.md](patterns/world.md) |

Quick lookup across all four:

```bash
grep -ril "pooling" references/patterns/
grep -ril "memorystore" references/patterns/
```
