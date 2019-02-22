import mongoose from "mongoose";


const runTransactionAndRetryCommit = async (mutator) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const options = { session };
  await mutator(options);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await session.commitTransaction();
      session.endSession();
      break;
    } catch (e) {
      // todo catch OperationFailure, ConnectionFailure error types
      if (e.message.includes('UnknownTransactionCommitResult')) {
        console.log('Unknown result upon committing a transaction, retrying...');
        continue;
      }

      // The error is not re-triable
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }
};

export const transaction = (mutator) => {

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return runTransactionAndRetryCommit(mutator);
    } catch (e) {
      // todo catch OperationFailure, ConnectionFailure error types
      if (e.message.includes('TransientTransactionError')) {
        console.log('Transient transaction error, retrying...');
        continue;
      }
      throw e;
    }
  }
};
