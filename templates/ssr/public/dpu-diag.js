(function(){
var errors=0,maxGap=0,last=performance.now();
addEventListener('error',function(){errors++});
setInterval(function(){var n=performance.now();maxGap=Math.max(maxGap,n-last-100);last=n},100);
function row(k,v,ok){return '<tr><th class="pr-4 text-left font-normal">'+k+'</th><td class="'+(ok===true?'font-semibold text-emerald-700':ok===false?'font-bold text-red-700':'')+'">'+v+'</td></tr>'}
function paint(){
 var left=document.querySelectorAll('template[for]').length,
 pending=document.querySelectorAll('[data-testid=fallback]').length,
 done=document.readyState==='complete',native=('htmlFor' in (HTMLTemplateElement.prototype||{}));
 document.getElementById('dpu-rows').innerHTML=
  row('native &lt;template for&gt; support',native,!!native)+
  row('leftover &lt;template for&gt; '+(done?'(final)':'(streaming…)'),left,done?left===0:undefined)+
  row('fallbacks still showing',pending)+
  row('uncaught errors',errors,errors===0)+
  row('worst main-thread stall (ms)',Math.round(maxGap),maxGap<500)+
  row('document.readyState',document.readyState);
 document.getElementById('dpu-log').textContent='templates='+left+' fallbacks='+pending+' errors='+errors}
paint();setInterval(paint,250)})();
