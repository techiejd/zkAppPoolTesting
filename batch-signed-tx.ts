import {
  PrivateKey,
  Mina,
  isReady,
  shutdown,
  PublicKey,
  UInt64,
  AccountUpdate,
} from 'snarkyjs';
import * as fs from 'fs';

await isReady;

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let testAccounts: {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}[] = [];

let MINA = 10n ** 9n;

let supposedMax = 10;
let ifNoMax = 20;

for (let i = 0; i < ifNoMax; ++i) {
  const largeValue = 1000n * MINA;
  const k = PrivateKey.random();
  const pk = k.toPublicKey();
  Local.addAccount(pk, largeValue.toString());
  testAccounts.push({ privateKey: k, publicKey: pk });
}

let feePayer = testAccounts.pop();
let sender = testAccounts.pop();

// Transaction fee to use
let transactionFee = 100_000_000;
// 1 MINA = 1_000_000_000
// Starting with 1_000_000_000_000

// await fetchAccount({ publicKey: feePayer!.publicKey });

console.log('Making a transfer');
let tx = await Mina.transaction(
  {
    feePayerKey: feePayer!.privateKey,
    fee: transactionFee,
    memo: 'Batch differing senders',
    // nonce: feePayerNonce,
  },
  () => {
    let payer = AccountUpdate.create(sender!.publicKey);
    for (let i = 0; i < testAccounts.length; i++) {
      payer.send({
        to: testAccounts[i].publicKey,
        amount: UInt64.from(BigInt(i) * MINA)
      })
    }
    payer.requireSignature();
  }
);

// Need to sign the transaction before broadcast
tx.sign([sender!.privateKey]);

// Write this to a file so we can broadcast seperately
fs.writeFileSync('payments/tx.json', tx.toGraphqlQuery());

// Sending the transaction to debug
await tx.send();

shutdown();
