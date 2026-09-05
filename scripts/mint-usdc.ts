/**
 * Mint the ENS registrar's testnet USDC to the project signer.
 *
 * The ENSv2 Sepolia registrar is paid in the USDC deployment at
 * ENS_TESTNET_USDC_SEPOLIA, which exposes an unrestricted mint(address,uint256).
 * There is no faucet — this is how you obtain it.
 *
 * Note this is NOT Circle's canonical Sepolia USDC. Both are called "USDC" with
 * 6 decimals; only this one is accepted by the registrar.
 *
 * Usage: npm run mint:usdc [amount]     (default 10000)
 */

import { createPublicClient, createWalletClient, http, formatUnits, parseUnits } from 'viem'
import { sepolia } from 'viem/chains'
import { getAccount, getRpcUrl } from './lib/config.js'
import { ENS_TESTNET_USDC_SEPOLIA } from './lib/constants.js'
import { readContract, writeContract } from './lib/client.js'

const MINTABLE_USDC_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

const amount = parseUnits(process.argv[2] ?? '10000', 6)

async function main() {
  const account = getAccount()
  const rpcUrl = getRpcUrl()
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) })
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) })

  console.log('=== Mint ENS registrar testnet USDC ===')
  console.log('Token: ', ENS_TESTNET_USDC_SEPOLIA)
  console.log('To:    ', account.address)
  console.log('Amount:', formatUnits(amount, 6), 'USDC')
  console.log()

  const balanceOf = () =>
    readContract<bigint>(publicClient, {
      address: ENS_TESTNET_USDC_SEPOLIA,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: MINTABLE_USDC_ABI as any,
      functionName: 'balanceOf',
      args: [account.address],
    })

  const before = await balanceOf()
  console.log('Balance before:', formatUnits(before, 6), 'USDC')

  const hash = await writeContract(walletClient, {
    address: ENS_TESTNET_USDC_SEPOLIA,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: MINTABLE_USDC_ABI as any,
    functionName: 'mint',
    args: [account.address, amount],
    chain: sepolia,
    account,
  })
  console.log('Tx submitted:', hash)

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('Confirmed in block:', receipt.blockNumber.toString())

  const after = await balanceOf()
  console.log('Balance after: ', formatUnits(after, 6), 'USDC')
  console.log('\n✓ Minted', formatUnits(after - before, 6), 'USDC')
}

main().catch((err) => {
  console.error('FAILED:', err.shortMessage ?? err.message ?? err)
  process.exit(1)
})
