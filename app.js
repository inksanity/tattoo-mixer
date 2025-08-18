console.log('Base app');

// ===== License: Firebase Realtime Database (one-time use) =====
(function initRealtimeLicense(){
  try{
    if(!window.TL_CONFIG?.proGate) return;

    // Init Firebase (compat)
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.TL_CONFIG.firebase);
    const auth = firebase.auth();
    const db = firebase.database();

    auth.signInAnonymously().catch(()=>{});

    // Stable device id
    const DEVICE_KEY = 'tl-device-id';
    let deviceId = localStorage.getItem(DEVICE_KEY);
    if(!deviceId){ deviceId = (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())); localStorage.setItem(DEVICE_KEY, deviceId); }

    // Already unlocked?
    if(localStorage.getItem('tl-pro-unlocked') === '1'){
      try{ setTier && setTier('pro'); }catch(e){}
    }

    // Ensure header button opens unlock modal
    const btnEnterKey = document.getElementById('btnEnterKey') || (typeof btnUpgrade !== 'undefined' ? btnUpgrade : null);
    const unlockModal = document.getElementById('unlockModal');
    const unlockCancel = document.getElementById('unlockCancel');
    const unlockConfirm = document.getElementById('unlockConfirm');
    const licenseInput = document.getElementById('licenseInput');
    const unlockStatus = document.getElementById('unlockStatus');

    if(btnEnterKey){
      btnEnterKey.onclick = ()=>{
        if(unlockStatus) unlockStatus.textContent='';
        if(licenseInput) licenseInput.value='';
        unlockModal.style.display='flex';
      };
    }
    if(unlockCancel){ unlockCancel.onclick = ()=> unlockModal.style.display='none'; }

    async function redeemKey(key){
      // Path: /licenses/<key>
      const ref = db.ref('licenses/'+key);
      const snap = await ref.get();
      if(!snap.exists()) return {ok:false, msg:'Invalid license key.'};
      const data = snap.val();
      if(data.used){
        if(data.claimedBy === deviceId){
          return {ok:true, already:true};
        }
        return {ok:false, msg:'This key has already been used.'};
      }
      // Transaction: first write wins
      const res = await ref.transaction(curr => {
        if(curr && curr.used === true) return; // abort, already used
        return {
          ...(curr||{}),
          used: true,
          claimedBy: deviceId,
          claimedAt: firebase.database.ServerValue.TIMESTAMP
        };
      }, {applyLocally:false});
      if(!res.committed){
        return {ok:false, msg:'This key has already been used.'};
      }
      return {ok:true};
    }

    if(unlockConfirm){
      unlockConfirm.onclick = async ()=>{
        const key = (licenseInput.value||'').trim();
        if(!key){ unlockStatus.textContent='Enter a license key.'; return; }
        unlockStatus.textContent='Checking key...';
        try{
          const out = await redeemKey(key);
          if(out.ok){
            localStorage.setItem('tl-pro-unlocked','1');
            try{ setTier && setTier('pro'); }catch(e){}
            unlockModal.style.display='none';
            if(typeof flash!=='undefined') flash(out.already?'Pro already unlocked on this device':'Pro unlocked — welcome!');
          }else{
            unlockStatus.textContent = out.msg || 'Could not redeem key.';
          }
        }catch(e){
          console.error(e);
          unlockStatus.textContent='Could not redeem key. Try again.';
        }
      };
    }
  }catch(e){ console.error('Realtime license init failed', e); }
})();
