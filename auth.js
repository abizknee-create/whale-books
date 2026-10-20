// 구글 로그인 (Firebase Auth, 모듈식 SDK를 gstatic CDN에서 필요할 때만 불러옴 → 오프라인에서도 앱은 정상 작동)
import {firebaseConfig,FIREBASE_SDK,firebaseReady} from './config.js';
let A=null,user=null;const subs=new Set();
const notify=()=>subs.forEach(f=>{try{f(user)}catch(e){console.warn(e)}});
export const onUser=f=>{subs.add(f);f(user);};
export const currentUser=()=>user;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iP(ad|hone|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isSilk=()=>/Silk/.test(navigator.userAgent);
async function load(){
  if(A)return A;if(!firebaseReady())throw new Error('Firebase 설정값이 아직 없어요');
  const app=await import(`${FIREBASE_SDK}/firebase-app.js`);const au=await import(`${FIREBASE_SDK}/firebase-auth.js`);
  const fa=app.initializeApp(firebaseConfig);
  const auth=au.initializeAuth(fa,{persistence:[au.indexedDBLocalPersistence,au.browserLocalPersistence],popupRedirectResolver:au.browserPopupRedirectResolver});
  A={auth,au};
  au.onAuthStateChanged(auth,u=>{user=u;notify();});
  au.getRedirectResult(auth).catch(e=>console.warn('redirect',e));
  return A;
}
export async function initAuth(){if(!firebaseReady()||!navigator.onLine)return;try{await load();}catch(e){console.warn(e);}}
export async function signIn(){
  const {auth,au}=await load();const p=new au.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
  // 홈 화면 앱(iOS)·Silk는 팝업이 잘 막혀서 바로 리다이렉트
  if((isIOS()&&standalone())||isSilk())return au.signInWithRedirect(auth,p);
  try{await au.signInWithPopup(auth,p);}catch(e){
    if(['auth/popup-blocked','auth/popup-closed-by-user','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment','auth/web-storage-unsupported'].includes(e.code)&&e.code!=='auth/popup-closed-by-user')return au.signInWithRedirect(auth,p);
    if(e.code==='auth/popup-closed-by-user')return;throw e;}
}
export async function signOutUser(){const {auth,au}=await load();await au.signOut(auth);}
export async function idToken(){return user?user.getIdToken():null;}
