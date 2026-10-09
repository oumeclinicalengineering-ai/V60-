export function Guide({message,compact=false}:{message:string;compact?:boolean}){
 return <aside className={`me-guide${compact?' compact':''}`} aria-label="MEサポくんの操作ガイド"><img src="./images/me-support.png" alt="小さな機器型キャラクター、MEサポくん" width="88" height="88"/><div className="guide-bubble"><small>MEサポくん · 操作ガイド</small><p>{message}</p></div></aside>;
}
