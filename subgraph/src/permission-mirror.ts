import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import {
  PermissionMirror,
  PermissionSynced,
} from '../generated/PermissionMirror/PermissionMirror'
import { AgentScope, PermissionUpdate } from '../generated/schema'

const ZERO_NODE = '0x0000000000000000000000000000000000000000000000000000000000000000'

export function handlePermissionSynced(event: PermissionSynced): void {
  const agentId = event.params.agent.toHexString()

  let scope = AgentScope.load(agentId)
  if (scope == null) {
    scope = new AgentScope(agentId)
    scope.syncCount = 0
    scope.allowedProtocols = BigInt.zero()
    scope.allowedPositionTypes = 0
    scope.maxPositionSizeUsdc = BigInt.zero()
    scope.maxDailySpendUsdc = BigInt.zero()
    scope.expiry = BigInt.zero()
    scope.ensNode = Bytes.fromHexString(ZERO_NODE)
  }

  // PermissionSynced carries only agent, ensNode and syncedAtBlock — the scope
  // itself is not in the event. Read it from contract state at this block,
  // otherwise every numeric field indexes as zero and any consumer computing
  // limits or expiry from the subgraph silently sees an agent with no authority.
  const contract = PermissionMirror.bind(event.address)
  const result = contract.try_getPermissions(event.params.agent)

  if (result.reverted) {
    log.warning('getPermissions reverted for agent {} at block {}', [
      agentId,
      event.block.number.toString(),
    ])
  } else {
    const p = result.value
    scope.allowedProtocols = p.allowedProtocols
    scope.allowedPositionTypes = p.allowedPositionTypes
    scope.maxPositionSizeUsdc = p.maxPositionSizeUsdc
    scope.maxDailySpendUsdc = p.maxDailySpendUsdc
    scope.expiry = p.expiry
  }

  scope.ensNode = event.params.ensNode
  scope.lastSyncedBlock = event.block.number
  scope.lastSyncedAt = event.block.timestamp
  scope.syncCount = scope.syncCount + 1
  scope.save()

  // History row, self-contained so a consumer can read one update without
  // needing to reconstruct state from the whole series.
  const updateId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  const update = new PermissionUpdate(updateId)
  update.agent = agentId
  update.ensNode = event.params.ensNode
  update.blockNumber = event.block.number
  update.blockTimestamp = event.block.timestamp
  update.transactionHash = event.transaction.hash
  update.allowedProtocols = scope.allowedProtocols
  update.allowedPositionTypes = scope.allowedPositionTypes
  update.maxPositionSizeUsdc = scope.maxPositionSizeUsdc
  update.maxDailySpendUsdc = scope.maxDailySpendUsdc
  update.expiry = scope.expiry
  update.save()
}
