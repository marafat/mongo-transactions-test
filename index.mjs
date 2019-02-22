import mongoose from "mongoose";
import Account from "./src/models/Account";
import * as mongooseUtils from "./src/utils/mongoose";

const DB_URI = 'mongodb://127.0.0.1:27017/friends?replSet=rs0';

const transfer = async (from, to, amount) => {
  mongooseUtils.transaction(async (options) => {
    const A = await Account.findOneAndUpdate({ name: from }, { $inc: { balance: -amount } }, options);
    if (A.balance < 0) {
      // If A would have negative balance, fail and abort the transaction
      // `session.abortTransaction()` will undo the above `findOneAndUpdate()`
      throw new Error('Insufficient funds: ' + (A.balance + amount));
    }

    const B = await Account.findOneAndUpdate({ name: to }, { $inc: { balance: amount } }, options);

    console.log(`Finished a transfer from '${from}' to '${to}' of the amount: $${amount}`);
    console.log(`New balances: A: ${A.balance}, B: ${B.balance}`);
  })
};

const main = async () => {
  await mongoose.connect(DB_URI, { useNewUrlParser: true });

  console.log('Connected to database!!');

  await Account.deleteMany();

  // Insert accounts and transfer some money
  await Account.create([{ name: 'A', balance: 5 }, { name: 'B', balance: 10 }]);
  console.log(`Created Account A: $5 and Account B: $10`);

  await transfer('A', 'B', 4); // Success
  try {
    // Fails because then A would have a negative balance
    await transfer('A', 'B', 2);
  } catch (error) {
    console.log('Error: ', error.message); // "Insufficient funds: 1"
  }

};

(async () => {
  await main();
  process.exit(0);
})();
