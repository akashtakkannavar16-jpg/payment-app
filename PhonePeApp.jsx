import React, { useEffect, useMemo, useState } from 'react';

const PhonePeApp = () => {
  const [activeScreen, setActiveScreen] = useState('home');
  const [selectedPayee, setSelectedPayee] = useState(null);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('For quick transfer');
  const [upiPin, setUpiPin] = useState('');
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState({
    fullName: 'manoj g',
    phoneNumber: '+91 99160 49018',
    upiId: 'manoj@ybl',
    balance: 7950.25
  });

  const payees = useMemo(
    () => [
      { name: 'To Mobile Number', upiId: 'iranna mali@ybl', mode: 'Mobile Number', avatar: '📱', label: 'vinay manmi ' },
      { name: 'To Bank / UPI ID', upiId: 'basu nandigoni@ybl', mode: 'UPI ID', avatar: '🏦', label: 'mallu hatti' },
      { name: 'To Self Account', upiId: 'sreesail belagali@ybl', mode: 'Own Account', avatar: '🧾', label: 'Self Account' },
      { name: 'Check Balance', upiId: 'balance@ybl', mode: 'Wallet', avatar: '💰', label: 'My Balance' }
    ],
    []
  );

  const promoSlides = useMemo(
    () => [
      {
        title: 'Fast transfers with premium security',
        subtitle: 'Send money instantly to contacts, UPI IDs, or bank accounts.',
        badge: 'Instant payments',
        accent: 'Encrypted UPI rails with native PIN flow.'
      },
      {
        title: 'Recharge bills and subscriptions',
        subtitle: 'Mobile, DTH, electricity and credit card payments in one place.',
        badge: 'Smart reminders',
        accent: 'Never miss a due date with effortless pay flows.'
      },
      {
        title: 'Secure UPI PIN verification',
        subtitle: 'Complete payments with a custom keypad and PIN overlay.',
        badge: 'Safe authorization',
        accent: 'Local confirmation before every transaction.'
      }
    ],
    []
  );

  const services = useMemo(
    () => [
      { label: 'Mobile Recharge', icon: '📱' },
      { label: 'DTH Recharge', icon: '📺' },
      { label: 'Electricity', icon: '💡' },
      { label: 'Credit Card', icon: '💳' }
    ],
    []
  );

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (query = '') => {
    try {
      const response = await fetch(`/api/history?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Unable to load history');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      setStatusMessage('Unable to load transaction history.');
    }
  };

  const handlePayeeSelect = (item) => {
    if (item.name === 'Check Balance') {
      setStatusMessage(`Your current balance is ₹ ${currentUser.balance.toFixed(2)}`);
      return;
    }
    setSelectedPayee(item);
    setAmount('');
    setRemarks('For quick transfer');
    setStatusMessage('');
    setActiveScreen('payment');
  };

  const nextPromo = () => setActivePromoIndex((index) => (index + 1) % promoSlides.length);
  const prevPromo = () => setActivePromoIndex((index) => (index - 1 + promoSlides.length) % promoSlides.length);

  const openPinModal = () => {
    if (!amount || Number(amount) <= 0) {
      setStatusMessage('Enter a valid amount to proceed.');
      return;
    }
    setUpiPin('');
    setIsPinOpen(true);
    setStatusMessage('');
  };

  const updatePin = (digit) => {
    if (digit === 'delete') {
      setUpiPin((pin) => pin.slice(0, -1));
      return;
    }
    if (upiPin.length >= 6) return;
    setUpiPin((pin) => pin + digit);
  };

  const handleVerifyPin = async () => {
    if (upiPin.length < 4) {
      setStatusMessage('Enter the 4-digit demo UPI PIN to authorize payment.');
      return;
    }
    if (upiPin !== '1234') {
      setStatusMessage('Incorrect PIN. Use ****for demo authorization.');
      return;
    }
    setIsPinOpen(false);
    setStatusMessage('Processing payment...');
    try {
      const payload = {
        senderUpiId: currentUser.upiId,
        receiverUpiId: selectedPayee.upiId,
        amount: Number(amount),
        remarks
      };
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Transaction Success');
      setReceipt({
        status: result.transaction.status,
        txId: result.transaction._id,
        amount: result.transaction.amount,
        remarks: result.transaction.remarks,
        receiverUpiId: result.transaction.receiverUpiId,
        senderUpiId: result.transaction.senderUpiId,
        time: new Date(result.transaction.createdAt).toLocaleString()
      });
      setCurrentUser((user) => ({ ...user, balance: result.senderBalance }));
      setActiveScreen('receipt');
      fetchHistory(searchQuery);
    } catch (error) {
      setReceipt({
        status: 'Success',
        txId: `ERR-${Date.now()}`,
        amount: Number(amount),
        remarks,
        receiverUpiId: selectedPayee?.upiId || '',
        senderUpiId: currentUser.upiId,
        time: new Date().toLocaleString()
      });
      setActiveScreen('receipt');
      setStatusMessage(error.message || 'Payment Success.');
    }
  };

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return history;
    return history.filter((item) => {
      return (
        item.senderUpiId.toLowerCase().includes(query) ||
        item.receiverUpiId.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.remarks.toLowerCase().includes(query)
      );
    });
  }, [history, searchQuery]);

  const currentPromo = promoSlides[activePromoIndex];

  return (
    <div className="min-h-screen bg-slate-900 py-6 px-3 sm:px-6">
      <div className="max-w-md mx-auto min-h-screen shadow-2xl rounded-[40px] bg-slate-950 ring-1 ring-slate-800 overflow-hidden relative">
        <div className="pb-28">
          <div className="px-5 pt-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-[#5f259f] to-[#742ea1] shadow-xl flex items-center justify-center text-xl font-semibold text-white">
                  A
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Active location</p>
                  <p className="mt-1 text-white text-lg font-semibold">Mahalingapur , Karnataka</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <button className="rounded-3xl bg-slate-900 p-3 shadow-sm ring-1 ring-slate-800 hover:bg-slate-800">
                  <span role="img" aria-label="scanner" className="text-xl">📷</span>
                </button>
                <button className="rounded-3xl bg-slate-900 p-3 shadow-sm ring-1 ring-slate-800 hover:bg-slate-800">
                  <span role="img" aria-label="notifications" className="text-xl">🔔</span>
                </button>
              </div>
            </div>

            <div className="mb-6 rounded-[32px] bg-gradient-to-br from-[#5f259f] via-[#742ea1] to-[#7c41d8] p-5 shadow-2xl ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="uppercase tracking-[0.2em] text-slate-200 text-xs">Premium Wallet</p>
                  <h1 className="mt-2 text-2xl font-semibold text-white">Hello, {currentUser.fullName}</h1>
                </div>
                <div className="rounded-3xl bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/90">Active</div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[28px] bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Balance</p>
                  <p className="mt-3 text-3xl font-semibold text-white">₹ {currentUser.balance.toFixed(2)}</p>
                </div>
                <div className="rounded-[28px] bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-200">UPI ID</p>
                  <p className="mt-3 text-lg font-semibold text-white">{currentUser.upiId}</p>
                </div>
              </div>
            </div>

            {activeScreen === 'home' && (
              <>
                <section className="mb-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Transfer Money</p>
                      <h2 className="text-white text-xl font-semibold">Quick actions</h2>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Secure</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {payees.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handlePayeeSelect(item)}
                        className="group rounded-[28px] border border-slate-800 bg-slate-900/80 p-4 text-left transition hover:border-[#742ea1] hover:bg-slate-800"
                      >
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-[#5f259f] to-[#742ea1] text-white shadow-lg text-2xl">
                          {item.avatar}
                        </div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.label}</p>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="mb-6">
                  <div className="overflow-hidden rounded-[32px] bg-slate-900 ring-1 ring-white/10 shadow-xl">
                    <div className="relative overflow-hidden bg-gradient-to-r from-[#5f259f] via-[#742ea1] to-[#7c41d8] px-5 py-6 text-white">
                      <div className="absolute inset-y-0 right-0 w-2 bg-white/10" />
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Featured</p>
                      <h3 className="mt-3 text-2xl font-semibold">{currentPromo.title}</h3>
                      <p className="mt-2 text-sm text-slate-200">{currentPromo.subtitle}</p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-white/90">
                        <span>✨</span>
                        <span>{currentPromo.badge}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-4 py-4">
                      <button
                        onClick={prevPromo}
                        className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300 hover:border-[#742ea1] hover:text-white"
                      >
                        Previous
                      </button>
                      <button
                        onClick={nextPromo}
                        className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300 hover:border-[#742ea1] hover:text-white"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </section>

                <section className="mb-32">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Recharge & Pay Bills</p>
                      <h2 className="text-white text-xl font-semibold">Daily essentials</h2>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Explore</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {services.map((service) => (
                      <div key={service.label} className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-4 transition hover:border-[#742ea1] hover:bg-slate-800">
                        <div className="mb-3 h-14 w-14 rounded-3xl bg-slate-800/80 text-2xl flex items-center justify-center text-[#ffb300]">
                          {service.icon}
                        </div>
                        <p className="font-medium text-white">{service.label}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {activeScreen === 'payment' && selectedPayee && (
              <div className="space-y-5 pb-28">
                <div className="rounded-[32px] border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Paying</p>
                      <p className="text-xl font-semibold text-white">{selectedPayee.label}</p>
                      <p className="text-xs text-slate-500">{selectedPayee.upiId}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-800 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {selectedPayee.mode}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] bg-slate-950 p-4 ring-1 ring-slate-800">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Amount</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="₹ 0.00"
                        className="mt-3 w-full rounded-[24px] border border-slate-800 bg-slate-900 px-4 py-4 text-3xl font-semibold text-white outline-none focus:border-[#742ea1]"
                      />
                    </div>
                    <div className="rounded-[28px] bg-slate-950 p-4 ring-1 ring-slate-800">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Remarks</label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={4}
                        className="mt-3 w-full resize-none rounded-[24px] border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-[#742ea1]"
                      />
                    </div>
                  </div>
                </div>
                {statusMessage && <p className="text-sm text-amber-300">{statusMessage}</p>}
                <button
                  onClick={openPinModal}
                  className="fixed bottom-7 left-5 right-5 z-10 rounded-full bg-gradient-to-r from-[#5f259f] to-[#742ea1] px-6 py-4 text-base font-semibold text-white shadow-2xl shadow-[#742ea1]/30 transition hover:brightness-110"
                >
                  PROCEED TO PAY
                </button>
              </div>
            )}

            {activeScreen === 'receipt' && receipt && (
              <div className="space-y-6 pb-28">
                <div className={`rounded-[32px] border ${receipt.status === 'SUCCESS' ? 'border-emerald-700/50 bg-gradient-to-br from-emerald-950/40 to-slate-900/60' : 'border-amber-700/50 bg-gradient-to-br from-amber-950/40 to-slate-900/60'} p-6 text-center shadow-xl`}>
                  <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${receipt.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'} text-6xl shadow-lg`}>
                    {receipt.status === 'SUCCESS' ? '✓' : '✕'}
                  </div>
                  <h3 className={`text-3xl font-bold ${receipt.status === 'SUCCESS' ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {receipt.status === 'SUCCESS' ? 'Transaction Successful!' : 'Transaction Failed'}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">Your payment has been processed</p>
                  <div className="mt-5 rounded-2xl bg-slate-950/50 px-4 py-3 ring-1 ring-slate-700">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Transaction ID</p>
                    <p className="mt-2 break-all font-mono text-sm font-semibold text-white">{receipt.txId}</p>
                  </div>
                </div>

                <div className="space-y-4 rounded-[32px] border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
                  <DetailRow label="From" value={receipt.senderUpiId} />
                  <DetailRow label="To" value={receipt.receiverUpiId} />
                  <DetailRow label="Amount" value={`₹ ${receipt.amount.toFixed(2)}`} />
                  <DetailRow label="Remarks" value={receipt.remarks} />
                  <DetailRow label="Time" value={receipt.time} />
                  <DetailRow label="Status" value={receipt.status} highlight />
                </div>

                <button
                  onClick={() => {
                    setActiveScreen('home');
                    setStatusMessage('');
                  }}
                  className="w-full rounded-full bg-gradient-to-r from-[#5f259f] to-[#742ea1] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#742ea1]/25 transition hover:brightness-110"
                >
                  ← Back to Dashboard
                </button>
                {statusMessage && <p className="text-center text-sm text-amber-300">{statusMessage}</p>}
              </div>
            )}

            {activeScreen === 'passbook' && (
              <div className="pb-28">
                <div className="mb-5 rounded-[32px] border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Passbook</p>
                      <h2 className="text-white text-xl font-semibold">Transaction history</h2>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Live</span>
                  </div>
                  <div className="rounded-[28px] border border-slate-800 bg-slate-950 p-3">
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        fetchHistory(e.target.value);
                      }}
                      placeholder="Search UPI ID, status, remarks"
                      className="w-full rounded-[24px] border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-[#742ea1]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredHistory.length === 0 ? (
                    <div className="rounded-[32px] border border-dashed border-slate-700 bg-slate-900/80 p-8 text-center text-slate-500">
                      No transactions match your search.
                    </div>
                  ) : (
                    filteredHistory.map((item) => {
                      const isSent = item.senderUpiId === currentUser.upiId;
                      return (
                        <div key={item._id} className="rounded-[32px] border border-slate-800 bg-slate-900/85 p-4 shadow-sm">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-12 w-12 items-center justify-center rounded-3xl ${isSent ? 'bg-purple-700/20 text-purple-200' : 'bg-emerald-700/20 text-emerald-200'}`}>
                                {isSent ? '↗️' : '↙️'}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white">{isSent ? 'Sent to' : 'Received from'}</p>
                                <p className="text-sm text-slate-400">{isSent ? item.receiverUpiId : item.senderUpiId}</p>
                              </div>
                            </div>
                            <div className="rounded-full bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
                              ₹ {item.amount.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 border-t border-slate-800 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                            <span>{new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className={`rounded-full px-3 py-1 text-[10px] uppercase ${item.status === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-300' : item.status === 'succussful' ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-600/50 text-slate-200'}`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 px-5 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <NavButton
              label="Home"
              icon="🏠"
              active={activeScreen === 'home'}
              onClick={() => {
                setActiveScreen('home');
                setStatusMessage('');
              }}
            />
            <NavButton
              label="Passbook"
              icon="📒"
              active={activeScreen === 'passbook'}
              onClick={() => {
                setActiveScreen('passbook');
                setStatusMessage('');
              }}
            />
            <NavButton
              label="Payments"
              icon="💸"
              active={activeScreen === 'payment'}
              onClick={() => {
                if (selectedPayee) setActiveScreen('payment');
              }}
              disabled={!selectedPayee}
            />
          </div>
        </nav>

        {isPinOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/95 px-4 pb-6 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[36px] bg-slate-950 p-5 shadow-2xl ring-1 ring-white/10">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Secure UPI PIN</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Authorize payment</h2>
                </div>
                <button onClick={() => setIsPinOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <p className="mb-5 text-sm text-slate-400">Enter PIN <span className="font-semibold text-white">1234</span> for demo payment authorization.</p>
              <div className="mb-6 flex justify-center gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 w-16 rounded-3xl border border-slate-800 bg-slate-900 text-3xl font-semibold text-white flex items-center justify-center">
                    {upiPin[index] || '•'}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'delete', '0'].map((key) => (
                  <button
                    key={key}
                    onClick={() => updatePin(key)}
                    className={`rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-5 text-xl font-semibold text-white transition hover:border-[#742ea1] hover:bg-slate-800 ${key === 'delete' ? 'col-span-2 text-sm' : ''}`}
                  >
                    {key === 'delete' ? 'Delete' : key}
                  </button>
                ))}
              </div>
              <button
                onClick={handleVerifyPin}
                className="mt-5 w-full rounded-full bg-gradient-to-r from-[#5f259f] to-[#742ea1] px-6 py-4 text-base font-semibold text-white shadow-xl shadow-[#742ea1]/20"
              >
                Verify & Pay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NavButton = ({ label, icon, active, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-1 rounded-3xl px-4 py-2 transition ${active ? 'bg-slate-900 text-[#ffb300] shadow-lg shadow-[#5f259f]/15' : 'text-slate-400 hover:text-white'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
  >
    <span>{icon}</span>
    <span className="text-xs">{label}</span>
  </button>
);

const DetailRow = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between gap-3 rounded-3xl bg-slate-950/80 px-4 py-3">
    <span className="text-sm text-slate-400">{label}</span>
    <span className={`text-sm font-semibold ${highlight ? 'text-emerald-300' : 'text-white'}`}>{value}</span>
  </div>
);

export default PhonePeApp;
