/**
 * Environment loading and signer resolution for the script suite.
 *
 * Loads .env via dotenv on import, so every script gets it from a single
 * place rather than repeating `import 'dotenv/config'` in each entrypoint.
 *
 * Accepts PRIVATE_KEY (hex) or MNEMONIC (BIP-39 seed phrase). PRIVATE_KEY
 * wins when both are present.
 */

import 'dotenv/config'
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts'

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required — set it in .env (see .env.example)`)
  }
  return value
}

/** Optional env var: treats blank/whitespace as absent, unlike `??`. */
export function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim()
  return value ? value : fallback
}

export function getRpcUrl(): string {
  return requireEnv('SEPOLIA_RPC_URL')
}

/** Resolve the signing account from the environment. */
/**
 * A second account, acting as the settlement counterparty.
 *
 * ERC-8004's ReputationRegistry rejects self-feedback ("Self-feedback not
 * allowed"), so the agent's own owner cannot write its reputation — feedback
 * has to come from a client. On testnet we use another account derived from the
 * same mnemonic to stand in for that counterparty. Disclosed in ASSUMPTIONS.md;
 * in production this would be the actual trade counterparty.
 */
export function getClientAccount() {
  const mnemonic = process.env.MNEMONIC?.trim()
  if (mnemonic) {
    return mnemonicToAccount(mnemonic, {
      addressIndex: Number(process.env.CLIENT_ACCOUNT_INDEX?.trim() || '0'),
    })
  }
  const pk = process.env.CLIENT_PRIVATE_KEY?.trim()
  if (pk) {
    return privateKeyToAccount((pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`)
  }
  throw new Error(
    'Settlement feedback needs a second account: set MNEMONIC (with CLIENT_ACCOUNT_INDEX) or CLIENT_PRIVATE_KEY',
  )
}

export function getAccount() {
  const pk = process.env.PRIVATE_KEY?.trim()
  if (pk) {
    return privateKeyToAccount((pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`)
  }

  const mnemonic = process.env.MNEMONIC?.trim()
  if (mnemonic) return mnemonicToAccount(mnemonic)

  throw new Error('Set either PRIVATE_KEY or MNEMONIC in .env (see .env.example)')
}
