import mongoose from "mongoose";
import Account from "./src/models/Account";
import { transaction } from "./src/utils/mongoose";

const DB_URI = 'mongodb://127.0.0.1:27017/friends?replSet=rs0';

const transfer = async (from, to, amount) => {
  const result = await transaction(async (dbSession) => {

    const options = { session: dbSession, new: true };

    const fromAccount = await Account.findOneAndUpdate({ name: from }, { $inc: { balance: -amount } }, options);
    if (fromAccount.balance < 0) {
      throw new Error('Insufficient funds: ' + (fromAccount.balance + amount));
    }

    const toAccount = await Account.findOneAndUpdate({ name: to }, { $inc: { balance: amount } }, options);

    return {
      from: fromAccount,
      to: toAccount
    }
  });

  console.log(`Transfer finished and reported new values.`);
  console.log(`New balances: A: $${result.from.balance}, B: $${result.to.balance}`);

};

const initialState = async () => {
  await Account.deleteMany();
  console.log('Deleted all previous accounts!');

  await Account.create([{ name: 'A', balance: 5 }, { name: 'B', balance: 10 }]);
  console.log(`Created Account A: $5 and Account B: $10`);
};

const testTxnFunc = async () => {
  console.log('\n\n======================================');
  console.log('Testing A simple transfer in a transaction.');
  await initialState();
  console.log('Scenario: transferring $4 from A to B\n');

  await transfer('A', 'B', 4); // Success
};

const testTxnFuncError = async () => {
  console.log('\n\n======================================');
  console.log('Testing a transfer that will fail within the transaction because of application logic.');
  await initialState();
  console.log('Scenario: transferring $6 from A to B.');
  console.log(`Expecting error: 'Insufficient funds: 5'\n`);

  try {
    // Fails because then A would have a negative balance
    return await transfer('A', 'B', 6);
  } catch (error) {
    console.log('Received Error: ', error.message); // "Insufficient funds: 1"
  }
};

const testWriteConflict = async () => {
  console.log('\n\n======================================');
  console.log('Testing a case of race to acquire the write lock with two simultaneous transactions. One will initially fail and succeed later on the retry.');
  await initialState();
  console.log('Scenario: two transfers:\n\t$4 from A to B\n\t$1 from A to B\n');

  // without the retry logic when we see 'TransientTransactionError'
  // the following should throw "MongoError: WriteConflict"
  await Promise.all([
    transfer('A', 'B', 4),
    transfer('A', 'B', 1)
  ]);
};

const main = async () => {
  await mongoose.connect(DB_URI, { useNewUrlParser: true });

  console.log('Connected to database!!');

  await testTxnFunc();

  await testTxnFuncError();

  await testWriteConflict();
};

(async () => {
  try {
    await main();
    process.exit(0);
  } catch (e) {
    console.log('main had an error: ', e.message);
    process.exit(1);
  }
})();
