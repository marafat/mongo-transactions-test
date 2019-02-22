import SFTP from 'promise-sftp';

const ROVI_FTP = {
  host: 'ftp.rovicorp.com',
  user: 'plexinc',
  password: 'C0b1IF'
};

const main = async () => {
  const sftp = new SFTP();

  try {
    await sftp.connect(ROVI_FTP);
    console.log('[ROVI_SEED]', 'Connected to ROVI FTP!');
  } catch (err) {
    console.error('[ROVI_SEED]', `Connect error: ${err.message}`);
  }


};

(async () => {
  await main();
})();
