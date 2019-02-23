import mongoose from "mongoose";
import * as log from './log';

const LOG_PREFIX = '[MONGOOSE UTILS]';

const runTransactionAndCommit = async (txnFunc, session) => {

  session.startTransaction();
  log.info(LOG_PREFIX, 'Transaction started!');

  try {
    const result = await txnFunc(session);
    await commitWithRetry(session);
    return result;
  } catch (error) {

    log.info(LOG_PREFIX,'Error running or committing the transaction. Aborting...');
    await session.abortTransaction();

    if ( error.errorLabels && error.errorLabels.indexOf('TransientTransactionError') >= 0) {
      log.info(LOG_PREFIX,'Transient transaction error, retrying...');
      await runTransactionAndCommit(txnFunc, session);
    } else {
      throw error;
    }
  }
};

const commitWithRetry = async (session) => {
  try {
    await session.commitTransaction();
    log.info(LOG_PREFIX, 'Transaction committed!');
  } catch (error) {
    if (error.errorLabels && error.errorLabels.indexOf('UnknownTransactionCommitResult') >= 0) {
      log.info(LOG_PREFIX, 'Unknown result upon committing a transaction, retrying...');
      await commitWithRetry(session);
    } else {
      log.info(LOG_PREFIX,'Error with commit...');
      throw error;
    }
  }
};

export const transaction = async (txnFunc) => {

  const session = await mongoose.startSession();
  log.info(LOG_PREFIX,'Session Created!');

  try {
    return await runTransactionAndCommit(txnFunc, session);
  } finally {
    session.endSession();
    log.info(LOG_PREFIX,'Session Ended!');
  }

};
