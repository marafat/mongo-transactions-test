import mongoose from "mongoose";


const runTransactionAndRetryCommit = async (txnFunc, session) => {

  session.startTransaction();
  console.log('Transaction started!');

  try {
    await txnFunc(session);
  } catch (error) {
    console.log('txnFunc error happened');
    await session.abortTransaction();
    console.log('Transaction Aborted!');
    throw error;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await session.commitTransaction();
      console.log('Transaction committed!');
      break;
    } catch (error) {
      if ( error.errorLabels && error.errorLabels.includes('UnknownTransactionCommitResult') ) {
        console.log('Unknown result upon committing a transaction, retrying...');
      } else {
        // The error is not re-triable
        await session.abortTransaction();
        console.log('Transaction Aborted!');
        throw error;
      }
    }
  }
};

export const transaction = async (txnFunc) => {

  const session = await mongoose.startSession();
  console.log('Session Created!');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runTransactionAndRetryCommit(txnFunc, session);
      session.endSession();
      console.log('Session Ended!');
      break;
    } catch (error) {
      if ( error.errorLabels && error.errorLabels.includes('TransientTransactionError') ) {
        console.log('Transient transaction error, retrying...');
      } else {
        session.endSession();
        console.log('Session Ended!');
        throw error;
      }
    }
  }
};
