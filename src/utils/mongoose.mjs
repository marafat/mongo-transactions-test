import mongoose from "mongoose";
import * as log from './log';

const LOG_PREFIX = '[MONGOOSE UTILS]';

const runTransactionAndCommit = async (txnFunc, dbSession) => {

  dbSession.startTransaction();
  log.info(LOG_PREFIX, 'Transaction started!');

  try {
    const result = await txnFunc(dbSession);
    await commitWithRetry(dbSession);
    return result;
  } catch (error) {

    log.info(LOG_PREFIX,'Error running or committing the transaction. Aborting...');
    await dbSession.abortTransaction();

    if ( error.errorLabels && error.errorLabels.indexOf('TransientTransactionError') >= 0) {
      log.info(LOG_PREFIX,'Transient transaction error, retrying...');
      return runTransactionAndCommit(txnFunc, dbSession);
    }

    throw error;
  }
};

const commitWithRetry = async (dbSession) => {
  try {
    await dbSession.commitTransaction();
    log.info(LOG_PREFIX, 'Transaction committed!');
  } catch (error) {
    if (error.errorLabels && error.errorLabels.indexOf('UnknownTransactionCommitResult') >= 0) {
      log.info(LOG_PREFIX, 'Unknown result upon committing a transaction, retrying...');
      await commitWithRetry(dbSession);
    } else {
      log.info(LOG_PREFIX,'Error with commit...');
      throw error;
    }
  }
};

export const transaction = async (txnFunc) => {

  const dbSession = await mongoose.startSession();
  log.info(LOG_PREFIX,'Session Created!');

  try {
    return await runTransactionAndCommit(txnFunc, dbSession);
  } finally {
    dbSession.endSession();
    log.info(LOG_PREFIX,'Session Ended!');
  }

};
