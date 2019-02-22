import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name: String,
  balance: Number
});

const Account = mongoose.model('Account', schema);

export default Account;
