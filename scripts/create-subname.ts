/**
 * Create testagent.mandate.eth under the mandate.eth name we own, ENSv2 style.
 *
 * ENSv2 gives every parent name its own registry contract — subnames are a
 * separate NFT collection, not rows in one global registry. A name therefore has
 * no children until a subregistry is deployed and attached to it. We registered
 * mandate.eth with subregistry = address(0), so this script does that now:
 *
 *   1. deployProxy   — deploy a user-registry proxy via VerifiableFactory
 *   2. setSubregistry — attach it to `mandate` in the .eth registry
 *   3. register       — create `testagent` inside that subregistry
 *
 * The v1 `createSubname` from '@ensdomains/ensjs/wallet' does NOT work here — it
 * targets the legacy registry/NameWrapper. ensjs has v2 equivalents under
 * actions/wallet/v2/, but `deploySubregistry` and the v2 `createSubname` are not
 * re-exported from any public entrypoint and the package's exports map blocks
 * deep imports. So we call the contracts directly using the ABIs from
 * @ensdomains/ensjs-abi, mirroring exactly what those actions do.
 *
 * Usage: npm run create:subname
 */

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  stringToBytes,
  zeroAddress,
  type Address,
} from 'viem'
import { sepolia } from 'viem/chains'
import {
  verifiableFactoryDeployProxySnippet,
  subregistryInitializeSnippet,
} from '@ensdomains/ensjs-abi/v2/verifiableFactory'
import {
  userRegistryRegisterSnippet,
  userRegistrySetSubregistrySnippet,
} from '@ensdomains/ensjs-abi/v2/userRegistry'
import { permissionedRegistryGetSubregistrySnippet } from '@ensdomains/ensjs-abi/v2/permissionedRegistry'
import {
  ENS_ETH_REGISTRY_SEPOLIA,
  ENS_VERIFIABLE_FACTORY_SEPOLIA,
  ENS_USER_REGISTRY_IMPL_SEPOLIA,
  ENS_PUBLIC_RESOLVER_SEPOLIA,
} from './lib/constants.js'
import { getAccount, getRpcUrl, optionalEnv } from './lib/config.js'
import { readContract, writeContract } from './lib/client.js'

const PARENT_LABEL = optionalEnv('ENS_PARENT_LABEL', 'mandate')
const CHILD_LABEL = optionalEnv('ENS_CHILD_LABEL', 'testagent')

// Matches ensjs's DEFAULT_ROLE_BITMAP — one bit per role nybble.
const DEFAULT_ROLE_BITMAP = BigInt(
  '0x1111111111111111111111111111111111111111111111111111111111111111',
)

// ENSv2 token id: labelhash with the low 32 bits cleared.
const tokenIdFor = (label: string) =>
  BigInt(keccak256(stringToBytes(label))) & ~((1n << 32n) - 1n)

const account = getAccount()
const rpcUrl = getRpcUrl()
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) })
const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) })

async function main() {
  const parentTokenId = tokenIdFor(PARENT_LABEL)

  console.log('=== ENSv2 subname creation ===')
  console.log('Parent:        ', `${PARENT_LABEL}.eth`)
  console.log('Child:         ', `${CHILD_LABEL}.${PARENT_LABEL}.eth`)
  console.log('Owner:         ', account.address)
  console.log('.eth registry: ', ENS_ETH_REGISTRY_SEPOLIA)
  console.log('parent tokenId:', parentTokenId.toString())
  console.log()

  // ── Does the parent already have a subregistry? ──────────────────────────
  let subregistry = zeroAddress as Address
  try {
    subregistry = await readContract<Address>(publicClient, {
      address: ENS_ETH_REGISTRY_SEPOLIA,
      abi: permissionedRegistryGetSubregistrySnippet,
      functionName: 'getSubregistry',
      args: [parentTokenId],
    })
  } catch {
    console.log('(getSubregistry read failed — assuming none)')
  }
  console.log('Existing subregistry:', subregistry)

  if (subregistry === zeroAddress) {
    // ── Step 1: deploy a user-registry proxy ──────────────────────────────
    console.log('\nStep 1: deploying subregistry via VerifiableFactory...')
    const initCallData = encodeFunctionData({
      abi: subregistryInitializeSnippet,
      functionName: 'initialize',
      args: [account.address, DEFAULT_ROLE_BITMAP],
    })
    const salt = BigInt(keccak256(stringToBytes(new Date().toISOString())))

    const deployHash = await writeContract(walletClient, {
      address: ENS_VERIFIABLE_FACTORY_SEPOLIA,
      abi: verifiableFactoryDeployProxySnippet,
      functionName: 'deployProxy',
      args: [ENS_USER_REGISTRY_IMPL_SEPOLIA, salt, initCallData],
      chain: sepolia,
      account,
    })
    const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash })
    console.log('  block', deployReceipt.blockNumber.toString(), '| tx:', deployHash)

    const created = deployReceipt.logs
      .map((l) => l.address)
      .find((a) => a.toLowerCase() !== ENS_VERIFIABLE_FACTORY_SEPOLIA.toLowerCase())
    if (!created) throw new Error('Could not find the deployed proxy address in the receipt logs')
    subregistry = created as Address
    console.log('  subregistry:', subregistry)

    // ── Step 2: attach it to the parent label ─────────────────────────────
    console.log('\nStep 2: attaching subregistry to', `${PARENT_LABEL}.eth`, '...')
    const setHash = await writeContract(walletClient, {
      address: ENS_ETH_REGISTRY_SEPOLIA,
      abi: userRegistrySetSubregistrySnippet,
      functionName: 'setSubregistry',
      args: [parentTokenId, subregistry],
      chain: sepolia,
      account,
    })
    const setReceipt = await publicClient.waitForTransactionReceipt({ hash: setHash })
    console.log('  block', setReceipt.blockNumber.toString(), '| tx:', setHash)
  } else {
    console.log('  (already attached — skipping steps 1 and 2)')
  }

  // ── Step 3: register the child inside the subregistry ────────────────────
  console.log('\nStep 3: registering', CHILD_LABEL, 'in the subregistry...')
  const expires = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60)
  const subHash = await writeContract(walletClient, {
    address: subregistry,
    abi: userRegistryRegisterSnippet,
    functionName: 'register',
    args: [
      CHILD_LABEL,
      account.address,
      zeroAddress, // the child gets no subregistry of its own
      ENS_PUBLIC_RESOLVER_SEPOLIA,
      DEFAULT_ROLE_BITMAP,
      expires,
    ],
    chain: sepolia,
    account,
  })
  const subReceipt = await publicClient.waitForTransactionReceipt({ hash: subHash })
  console.log('  block', subReceipt.blockNumber.toString(), '| tx:', subHash)

  console.log('\n✓ Subname created:', `${CHILD_LABEL}.${PARENT_LABEL}.eth`)
  console.log('\nSave this for the text-record step:')
  console.log('  ENS_SUBREGISTRY_ADDRESS=' + subregistry)
}

main().catch((err) => {
  console.error('FAILED:', err.shortMessage ?? err.message ?? err)
  const d = err.cause?.data
  if (d?.errorName) console.error('  revert:', d.errorName, JSON.stringify(d.args ?? []))
  process.exit(1)
})
