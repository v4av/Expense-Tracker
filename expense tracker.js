import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, updateProfile, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, LogOut, PieChart } from 'lucide-react';

// config
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  // states
  const [user, setUser] = useState(null);
  const [data, setData] = useState([]); // transactions
  const [loading, setLoading] = useState(true);

  // form inputs
  const [text, setText] = useState('');
  const [num, setNum] = useState('');
  const [type, setType] = useState('expense');
  const [cat, setCat] = useState('food');
  
  // login inputs
  const [name, setName] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // load user
  useEffect(() => {
    // console.log("checking auth");
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // load data
  useEffect(() => {
    if (user) {
      // console.log("getting data");
      const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'));
      
      const unsub = onSnapshot(q, (snap) => {
        var temp = [];
        snap.forEach(d => {
            // temp.push(d.data());
            let item = d.data();
            item.id = d.id;
            temp.push(item);
        });
        setData(temp);
      });
      return () => unsub();
    }
  }, [user]);

  const login = async (e) => {
    e.preventDefault();
    if (!name) { alert("Enter name"); return; }
    
    setLoggingIn(true);
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            const res = await signInAnonymously(auth);
            await updateProfile(res.user, { displayName: name });
        }
    } catch(err) {
        console.log(err);
    }
    setLoggingIn(false);
  }

  // add transaction
  function submit(e) {
    e.preventDefault();
    
    if(text == '' || num == '') {
      alert("Please fill all fields");
      return;
    }

    // handle category
    let finalCat = cat;
    if(type == 'income') {
        finalCat = 'Salary';
    }

    // add to firebase
    addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), {
      description: text,
      amount: parseFloat(num),
      type: type,
      category: finalCat,
      createdAt: serverTimestamp()
    });

    // clear
    setText('');
    setNum('');
  }

  // delete
  const remove = (id) => {
    if(window.confirm('Delete?')) {
        deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id));
    }
  }

  // calculations
  var inc = 0;
  var exp = 0;
  var cats = {};

  // loop through data
  for(var i=0; i<data.length; i++) {
      let t = data[i];
      let val = Number(t.amount);

      if(t.type == 'income') {
          inc += val;
      } else {
          exp += val;
          // chart logic
          if(cats[t.category]) {
              cats[t.category] += val;
          } else {
              cats[t.category] = val;
          }
      }
  }
  let total = inc - exp;

  if (loading) return <div style={{padding: 20}}>Loading...</div>;

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow w-80">
          <h2 className="text-xl font-bold mb-4 text-center">Expense Tracker</h2>
          <form onSubmit={login}>
            <input 
              className="w-full border p-2 mb-4 rounded" 
              placeholder="Your Name"
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
            <button className="w-full bg-blue-500 text-white p-2 rounded">
              {loggingIn ? '...' : 'Start'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      
      {/* Sidebar */}
      <div className="md:w-64 bg-white border-r p-5">
        <h2 className="font-bold text-xl text-blue-600 mb-5 flex gap-2">
          <Wallet /> WalletApp
        </h2>
        <p className="mb-8 text-sm">User: {user.displayName}</p>
        <button onClick={() => signOut(auth)} className="text-red-500 flex gap-2 text-sm">
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 p-5 md:p-10">
        <h1 className="text-2xl font-bold mb-5">My Dashboard</h1>

        {/* Cards */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="bg-white p-5 rounded border-l-4 border-blue-500 shadow-sm flex-1">
            <span className="text-gray-500 text-xs">Balance</span>
            <div className="text-2xl font-bold">${total}</div>
          </div>
          <div className="bg-white p-5 rounded border-l-4 border-green-500 shadow-sm flex-1">
            <span className="text-gray-500 text-xs">Income</span>
            <div className="text-2xl font-bold text-green-600">${inc}</div>
          </div>
          <div className="bg-white p-5 rounded border-l-4 border-red-500 shadow-sm flex-1">
            <span className="text-gray-500 text-xs">Expense</span>
            <div className="text-2xl font-bold text-red-600">${exp}</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="lg:w-2/3">
            {/* Form */}
            <div className="bg-white p-5 rounded shadow mb-5">
              <h3 className="font-bold mb-3">Add Item</h3>
              <form onSubmit={submit}>
                <div className="flex gap-2 mb-3">
                  <input 
                    className="border p-2 rounded w-full" 
                    placeholder="Note"
                    value={text}
                    onChange={e => setText(e.target.value)}
                  />
                  <input 
                    className="border p-2 rounded w-32" 
                    placeholder="0.00" 
                    type="number"
                    value={num}
                    onChange={e => setNum(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select className="border p-2 rounded" value={type} onChange={e => setType(e.target.value)}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>

                  {type == 'expense' && (
                    <select className="border p-2 rounded" value={cat} onChange={e => setCat(e.target.value)}>
                      <option value="food">Food</option>
                      <option value="travel">Travel</option>
                      <option value="bills">Bills</option>
                      <option value="other">Other</option>
                    </select>
                  )}
                  
                  <button className="bg-blue-600 text-white px-5 rounded ml-auto">
                    Save
                  </button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="bg-white rounded shadow p-5">
              <h3 className="font-bold mb-3">History</h3>
              {data.length == 0 ? <p className="text-gray-400 text-sm">No records.</p> : null}
              
              <div style={{maxHeight: 400, overflowY: 'auto'}}>
                {data.map((item, i) => (
                  <div key={i} className="flex justify-between items-center border-b py-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${item.type == 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {item.type == 'income' ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                      </div>
                      <div>
                        <div className="font-medium">{item.description}</div>
                        <div className="text-xs text-gray-400">{item.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={item.type == 'income' ? 'text-green-600 font-bold' : 'font-bold'}>
                        {item.type == 'income' ? '+' : '-'}${item.amount}
                      </span>
                      <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:w-1/3">
            <div className="bg-white p-5 rounded shadow h-full">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <PieChart size={18} /> Stats
              </h3>
              
              {Object.keys(cats).length > 0 ? (
                <div>
                  {Object.keys(cats).map(k => {
                    let v = cats[k];
                    let pct = (v / exp) * 100;
                    return (
                      <div key={k} className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{k}</span>
                          <span>{Math.round(pct)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center mt-10">Add data to see chart.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
