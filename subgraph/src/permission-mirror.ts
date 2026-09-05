import { BigInt, Bytes } from '@graphprotocol/graph-ts'
import { PermissionSynced } from '../generated/PermissionMirror/PermissionMirror'
import { AgentScope, PermissionUpdate } from '../generated/schema'

export function handlePermissionSynced(event: PermissionSynced): void {
  const agentId = event.params.agent.toHexString()

  let scope = AgentScope.load(agentId)
  if (scope == null) {
    scope = new AgentScope(agentId)
    scope.syncCount = 0
    // Fields below will be overwritten immediately; set zero defaults for the schema
    scope.allowedProtocols = BigInt.fromI32(0)
    scope.allowedPositionTypes = 0
    scope.maxPositionSizeUsdc = BigInt.fromI32(0)
    scope.maxDailySpendUsdc = BigInt.fromI32(0)
    scope.expiry = BigInt.fromI32(0)
    scope.ensNode = Bytes.fromHexString('0x0000000000000000000000000000000000000000000000000000000000000000')
  }

  // The PermissionSynced event carries agent + ensNode + syncedAtBlock.
  // The full PermissionScope must be read from contract state at this block
  // for a complete picture, but the subgraph captures the structural change signal.
  // The ensNode and block are the authoritative indexed fields; the rest of the
  // scope comes from the contract read performed by the relayer before calling sync().
  scope.ensNode = event.params.ensNode
  scope.lastSyncedBlock = event.block.number
  scope.lastSyncedAt = event.block.timestamp
  scope.syncCount = scope.syncCount + 1
  scope.save()

  const updateId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  const update = new PermissionUpdate(updateId)
  update.agent = agentId
  update.ensNode = event.params.ensNode
  update.blockNumber = event.block.number
  update.blockTimestamp = event.block.timestamp
  update.transactionHash = event.transaction.hash
  // Carry forward current scope values so the history row is self-contained
  update.allowedProtocols = scope.allowedProtocols
  update.allowedPositionTypes = scope.allowedPositionTypes
  update.maxPositionSizeUsdc = scope.maxPositionSizeUsdc
  update.maxDailySpendUsdc = scope.maxDailySpendUsdc
  update.expiry = scope.expiry
  update.save()
}
