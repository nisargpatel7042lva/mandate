/**
 * Deploy PermissionMirror to Sepolia.
 *
 * The Mandate subgraph indexes this contract's PermissionSynced events, so the
 * subgraph cannot index anything until it exists. Deploying it here — rather
 * than alongside MandateGate in the SwapVM phase — keeps the Graph work
 * independent of that phase, which is timeboxed and may be dropped.
 *
 * Build first:  forge build     (foundry.toml points src at contracts/)
 * Usage:        npm run deploy:mirror
 *
 * The relayer address defaults to our own signer, so `npm run relayer` can call
 * sync() straight away and produce a real event for the subgraph to pick up.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem'
import { sepolia } from 'viem/chains'
import { getAccount, getRpcUrl, optionalEnv } from './lib/config.js'
import { deployContract } from './lib/client.js'

const ARTIFACT = path.resolve(process.cwd(), 'out/PermissionMirror.sol/PermissionMirror.json')

async function main() {
  if (!fs.existsSync(ARTIFACT)) {
    throw new Error(`Artifact not found at ${ARTIFACT} — run \`forge build\` first`)
  }
  const artifact = JSON.parse(fs.readFileSync(ARTIFACT, 'utf8'))
  const bytecode = (artifact.bytecode?.object ?? artifact.bytecode) as Hex
  const abi = artifact.abi

  const account = getAccount()
  const rpcUrl = getRpcUrl()
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) })
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) })

  // The relayer is the only address allowed to call sync().
  const relayer = optionalEnv('RELAYER_ADDRESS', account.address) as Address

  console.log('=== Deploy PermissionMirror (Sepolia) ===')
  console.log('Deployer:', account.address)
  console.log('Relayer: ', relayer)
  console.log('Bytecode:', (bytecode.length - 2) / 2, 'bytes')
  console.log()

  const hash = await deployContract(walletClient, {
    abi,
    bytecode,
    args: [relayer],
    chain: sepolia,
    account,
  })
  console.log('Tx submitted:', hash)

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (!receipt.contractAddress) throw new Error('No contractAddress in the deployment receipt')

  console.log('Confirmed in block:', receipt.blockNumber.toString())
  console.log('Gas used:          ', receipt.gasUsed.toString())
  console.log('Contract address:  ', receipt.contractAddress)

  // ── Read back from chain, don't trust local state ─────────────────────────
  console.log('\n─── ON-CHAIN READ-BACK ───')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onChainRelayer = await (publicClient.readContract as any)({
    address: receipt.contractAddress,
    abi,
    functionName: 'relayer',
  })
  console.log('relayer():', onChainRelayer)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authorized = await (publicClient.readContract as any)({
    address: receipt.contractAddress,
    abi,
    functionName: 'isAuthorized',
    args: [account.address],
  })
  console.log('isAuthorized(deployer):', authorized, '(false is correct — nothing synced yet)')

  console.log('\n✓ Deployed. Save these:')
  console.log('  PERMISSION_MIRROR_ADDRESS=' + receipt.contractAddress)
  console.log('  PERMISSION_MIRROR_START_BLOCK=' + receipt.blockNumber.toString())
}

main().catch((err) => {
  console.error('FAILED:', err.shortMessage ?? err.message ?? err)
  process.exit(1)
})
