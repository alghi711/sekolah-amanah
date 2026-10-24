'use strict';
const content = window.AMANAH_CONTENT;
const grid = document.querySelector('#news-grid');
const loadMore = document.querySelector('#load-more');
const status = document.querySelector('#news-status');
const search = document.querySelector('#news-search');
const dialog = document.querySelector('#content-dialog');
const dialogBody = document.querySelector('#dialog-body');
let category = 'all';
let visible = 6;
let returnFocus;
const dateFormat = new Intl.DateTimeFormat('id-ID', {day:'numeric',month:'short',year:'numeric'});
function element(tag, className, text) {
  const node = document.createElement(tag);
  if(className) node.className = className;
  if(text !== undefined) node.textContent = text;
  return node;
}
function readableTitle(title) {
  if(title !== title.toUpperCase()) return title;
  return title.charAt(0) + title.slice(1).toLowerCase().replace(/\b(smk|smp|sd|tk|tka|asts|ldks|akm|bsi|bnn|tkj)\b/g, value => value.toUpperCase());
}
function externalLink(label, href, className='text-link') {
  const a = element('a',className,label);
  a.href=href; a.target='_blank'; a.rel='noopener noreferrer';
  return a;
}
function filteredPosts(posts, filter, query) {
  const needle = query.trim().toLocaleLowerCase('id');
  return posts.filter(post => (filter === 'all' || post.category === filter) && `${post.title} ${post.school}`.toLocaleLowerCase('id').includes(needle));
}
function renderNews() {
  const posts = filteredPosts(content.posts,category,search.value);
  grid.replaceChildren();
  posts.slice(0,visible).forEach(post => {
    const article=element('article','news-card');
    const picture=element('div','news-image-wrap');
    if(post.image) {
      const img=element('img','news-image');
      img.src=post.image; img.alt=readableTitle(post.title); img.loading='lazy'; img.width=768; img.height=465;
      picture.append(img);
    }
    picture.append(element('span','news-category',post.category === 'prestasi' ? 'PRESTASI' : 'KEGIATAN'));
    const meta=element('div','news-meta');
    const time=element('time','',dateFormat.format(new Date(post.date)));time.dateTime=post.date;
    meta.append(element('span','',post.school),time);
    const button=element('button','','Baca cerita ↗');
    button.type='button';button.setAttribute('aria-label',`Baca ${readableTitle(post.title)}`);
    button.addEventListener('click',()=>openArticle(post));
    article.append(picture,meta,element('h3','',readableTitle(post.title)),button);
    grid.append(article);
  });
  if(!posts.length) grid.append(element('p','empty','Belum ada cerita yang cocok. Coba kata kunci lain atau pilih semua kabar.'));
  loadMore.hidden=posts.length<=visible;
  status.textContent=`Menampilkan ${Math.min(visible,posts.length)} dari ${posts.length} cerita.`;
}
function showDialog() {
  returnFocus=document.activeElement;
  dialog.showModal();
  document.body.classList.add('modal-open');
  dialog.scrollTop=0;
  document.querySelector('.dialog-close').focus();
}
function openArticle(post) {
  dialogBody.replaceChildren();
  const title=element('h2','dialog-body-title',readableTitle(post.title));title.id='dialog-title';
  dialogBody.append(element('div','eyebrow',`${post.school} / ${post.category.toUpperCase()}`),title,element('p','dialog-meta',dateFormat.format(new Date(post.date))));
  if(post.image){const img=element('img','dialog-photo');img.src=post.image;img.alt=readableTitle(post.title);dialogBody.append(img);}
  let list;
  post.blocks.forEach(block=>{
    if(block.type==='li'){
      if(!list){list=element('ul');dialogBody.append(list);}
      list.append(element('li','',block.text));
    }else{
      list=undefined;
      dialogBody.append(element(block.type==='p'?'p':'h3','',block.text));
    }
  });
  const actions=element('div','dialog-actions');
  actions.append(externalLink('Baca di website Amanah ↗',post.url));
  dialogBody.append(actions);
  showDialog();
}
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');returnFocus?.focus();});
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{
  category=button.dataset.filter;visible=6;
  document.querySelectorAll('.filter').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});
  renderNews();
}));
document.querySelectorAll('[data-news-category]').forEach(link=>link.addEventListener('click',()=>{
  category=link.dataset.newsCategory;visible=6;search.value='';
  document.querySelectorAll('.filter').forEach(button=>{const active=button.dataset.filter===category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  renderNews();
}));
search.addEventListener('input',()=>{visible=6;renderNews();});
loadMore.addEventListener('click',()=>{const previous=grid.children.length;visible+=6;renderNews();grid.children[previous]?.querySelector('button')?.focus();});
const menuButton=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
function closeMenu(){navigation.classList.remove('is-open');menuButton.setAttribute('aria-expanded','false');}
menuButton.addEventListener('click',()=>{const open=navigation.classList.toggle('is-open');menuButton.setAttribute('aria-expanded',String(open));});
navigation.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&navigation.classList.contains('is-open')){closeMenu();menuButton.focus();}});
const partners=document.querySelector('#partners');
content.partners.forEach((src,index)=>{const img=element('img');img.src=src;img.alt=`Logo partner kerja sama Amanah ${index+1}`;img.loading='lazy';img.width=300;img.height=150;partners.append(img);});
renderNews();

const requestedId = new URLSearchParams(window.location.search).get('berita');
const requestedPost = content.posts.find(post => String(post.id) === requestedId);
if (requestedPost) openArticle(requestedPost);
