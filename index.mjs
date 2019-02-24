import mongoose from "mongoose";
import Account from "./src/models/Account";
import { txnWithDbSession } from "./src/utils/mongoose";

const DB_URI = 'mongodb://127.0.0.1:27017/friends?replSet=rs0';

const transfer = async (from, to, amount) => {
  const result = await txnWithDbSession(async (session) => {

    const options = { session, new: true };

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
  console.log(`New balances: A: ${result.from.balance}, B: ${result.to.balance}`);

};

const testWriteConflict = async () => {
  try {
    await Promise.all([
      transfer('A', 'B', 4),
      transfer('A', 'B', 1)
    ]);
  } catch (error) {
    console.log('Error: ', error.message); // "MongoError: WriteConflict"
  }
};

const testTxnFunc = async () => {
  await transfer('A', 'B', 4); // Success
  try {
    // Fails because then A would have a negative balance
    await transfer('A', 'B', 2);
  } catch (error) {
    console.log('Error: ', error.message); // "Insufficient funds: 1"
  }
};

const testTxnFuncError = () => {
  return transfer('A', 'B', 6);
};

const main = async () => {
  await mongoose.connect(DB_URI, { useNewUrlParser: true });

  console.log('Connected to database!!');

  await Account.deleteMany();
  console.log('Deleted all previous accounts!');

  // Insert accounts and transfer some money
  await Account.create([{ name: 'A', balance: 5 }, { name: 'B', balance: 10 }]);
  console.log(`Created Account A: $5 and Account B: $10`);

  await testTxnFunc();

  // await testTxnFuncError();

  // await testWriteConflict();
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
