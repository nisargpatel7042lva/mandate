/**
 * Print the signer address and its Sepolia balances.
 * Read-only — no transactions, no gas. Use this to confirm .env is wired
 * correctly and to get the address you need to send faucet funds to.
 *
 * Usage: npm run whoami
 */

import { createPublicClient, http, formatEther, formatUnits } from 'viem'
import { sepolia } from 'viem/chains'
import { getAccount, getRpcUrl } from './lib/config.js'
import { ENS_TESTNET_USDC_SEPOLIA } from './lib/constants.js'
import { readContract } from './lib/client.js'

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

async function main() {
  const account = getAccount()
  const publicClient = createPublicClient({ chain: sepolia, transport: http(getRpcUrl()) })

  console.log('=== Mandate signer ===')
  console.log('Network:', 'Sepolia (chain ID 11155111)')
  console.log('Address:', account.address)
  console.log('Source: ', process.env.PRIVATE_KEY?.trim() ? 'PRIVATE_KEY' : 'MNEMONIC')
  console.log()

  const [balance, blockNumber] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.getBlockNumber(),
  ])

  console.log('Sepolia ETH:', formatEther(balance), 'ETH')

  let usdc = 0n
  try {
    usdc = await readContract<bigint>(publicClient, {
      address: ENS_TESTNET_USDC_SEPOLIA,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: ERC20_BALANCE_ABI as any,
      functionName: 'balanceOf',
      args: [account.address],
    })
    console.log('ENS testnet USDC:', formatUnits(usdc, 6), 'USDC')
  } catch (err) {
    console.log('ENS testnet USDC: read failed —', (err as Error).message?.split('\n')[0])
  }

  console.log('Current block:', blockNumber.toString())
  console.log()

  if (balance === 0n) {
    console.log('⚠ No Sepolia ETH. Fund this address before running any write script:')
    console.log(' ', account.address)
  }
  if (usdc === 0n) {
    console.log('⚠ No ENS testnet USDC — register-ens.ts will fail at the approve step.')
  }
}

main().catch((err) => {
  console.error('FAILED:', err.shortMessage ?? err.message ?? err)
  process.exit(1)
})
