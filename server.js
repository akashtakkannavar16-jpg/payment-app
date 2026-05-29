const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/phonepe_clone';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch((error) => {
  console.error('MongoDB connection error:', error.message);
  process.exit(1);
});

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  upiId: { type: String, required: true, unique: true, lowercase: true, trim: true },
  balance: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  senderUpiId: { type: String, required: true, lowercase: true, trim: true },
  receiverUpiId: { type: String, required: true, lowercase: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  remarks: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], required: true, default: 'PENDING' },
  createdAt: { type: Date, default: () => new Date() }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

app.get('/api/seed', async (req, res) => {
  try {
    const profiles = [
      {
        fullName: 'Ananya Singh',
        phoneNumber: '+91 98765 43210',
        upiId: 'ananya@ybl',
        balance: 7950.25
      },
      {
        fullName: 'Rohit Sharma',
        phoneNumber: '+91 91234 56780',
        upiId: 'rohit@ybl',
        balance: 4210.5
      },
      {
        fullName: 'Priya Verma',
        phoneNumber: '+91 99887 66554',
        upiId: 'priya@ybl',
        balance: 11250.0
      }
    ];

    const createdUsers = [];
    for (const profile of profiles) {
      const user = await User.findOneAndUpdate(
        { upiId: profile.upiId.toLowerCase() },
        { $set: profile },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      createdUsers.push(user);
    }

    const sampleTransactions = [
      {
        senderUpiId: 'rohit@ybl',
        receiverUpiId: 'ananya@ybl',
        amount: 650.0,
        remarks: 'Dinner split',
        status: 'SUCCESS'
      },
      {
        senderUpiId: 'priya@ybl',
        receiverUpiId: 'ananya@ybl',
        amount: 280.75,
        remarks: 'Groceries',
        status: 'SUCCESS'
      },
      {
        senderUpiId: 'ananya@ybl',
        receiverUpiId: 'priya@ybl',
        amount: 500.0,
        remarks: 'Rent contribution',
        status: 'SUCCESS'
      }
    ];

    const createdTransactions = [];
    for (const tx of sampleTransactions) {
      const transaction = await Transaction.findOneAndUpdate(
        {
          senderUpiId: tx.senderUpiId,
          receiverUpiId: tx.receiverUpiId,
          amount: tx.amount,
          remarks: tx.remarks
        },
        { $set: tx },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      createdTransactions.push(transaction);
    }

    return res.json({
      message: 'Seed data created successfully.',
      users: createdUsers,
      transactions: createdTransactions
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ message: 'Seed route failed', error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { __v: 0 }).sort({ fullName: 1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to retrieve users', error: error.message });
  }
});

app.post('/api/transfer', async (req, res) => {
  const { senderUpiId, receiverUpiId, amount, remarks } = req.body;
  const normalizedSender = String(senderUpiId || '').toLowerCase().trim();
  const normalizedReceiver = String(receiverUpiId || '').toLowerCase().trim();
  const transferAmount = Number(amount);

  if (!normalizedSender || !normalizedReceiver || Number.isNaN(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ message: 'Valid sender, receiver and amount are required.' });
  }

  const session = await mongoose.startSession();
  try {
    const transactionResult = await session.withTransaction(async () => {
      const senderUser = await User.findOne({ upiId: normalizedSender }).session(session);
      const receiverUser = await User.findOne({ upiId: normalizedReceiver }).session(session);

      if (!senderUser) {
        throw new Error('Sender UPI ID does not exist.');
      }
      if (!receiverUser) {
        throw new Error('Receiver UPI ID does not exist.');
      }
      if (senderUser.upiId === receiverUser.upiId) {
        throw new Error('Cannot transfer to the same UPI ID.');
      }
      if (senderUser.balance < transferAmount) {
        throw new Error('Insufficient balance to complete transfer.');
      }

      senderUser.balance -= transferAmount;
      receiverUser.balance += transferAmount;

      await senderUser.save({ session });
      await receiverUser.save({ session });

      const newTransaction = await Transaction.create([
        {
          senderUpiId: normalizedSender,
          receiverUpiId: normalizedReceiver,
          amount: transferAmount,
          remarks: String(remarks || 'UPI transfer').slice(0, 120),
          status: 'SUCCESS'
        }
      ], { session });

      return {
        transaction: newTransaction[0],
        senderBalance: senderUser.balance,
        receiverBalance: receiverUser.balance
      };
    });

    if (!transactionResult) {
      throw new Error('Transaction could not be completed successfully.');
    }

    return res.json({
      success: true,
      transaction: transactionResult.transaction,
      senderBalance: transactionResult.senderBalance,
      receiverBalance: transactionResult.receiverBalance
    });
  } catch (error) {
    await session.abortTransaction();
    const failedTransaction = await Transaction.create({
      senderUpiId: normalizedSender,
      receiverUpiId: normalizedReceiver,
      amount: transferAmount,
      remarks: String(remarks || 'UPI transfer').slice(0, 120),
      status: 'FAILED'
    });
    return res.status(400).json({
      success: false,
      message: error.message || 'Transfer failed due to an internal error.',
      transaction: failedTransaction
    });
  } finally {
    session.endSession();
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    const filter = {};

    if (query) {
      const regex = new RegExp(query, 'i');
      filter.$or = [
        { senderUpiId: regex },
        { receiverUpiId: regex },
        { remarks: regex },
        { status: regex }
      ];
    }

    const transactions = await Transaction.find(filter).sort({ createdAt: -1 }).limit(120).lean();
    return res.json(transactions);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to retrieve transaction history', error: error.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
