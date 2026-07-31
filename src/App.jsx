import React, { useEffect, useMemo, useState } from 'react'
import './App.css'

const SAMPLE_MENU = [
  { id: 1, name: '치즈버거', category: '버거', price: 8500, desc: '고소한 치즈와 신선한 패티' },
  { id: 2, name: '불고기버거', category: '버거', price: 9200, desc: '달콤한 불고기 소스' },
  { id: 3, name: '감자튀김', category: '사이드', price: 3500, desc: '바삭한 프렌치프라이' },
  { id: 4, name: '콜라', category: '음료', price: 2000, desc: '시원한 탄산음료' },
  { id: 5, name: '치즈스틱', category: '사이드', price: 4200, desc: '녹는 치즈의 유혹' },
  { id: 6, name: '치킨마요', category: '샌드위치', price: 7500, desc: '매콤달콤 치킨마요' },
  { id: 7, name: '시저샐러드', category: '샐러드', price: 6800, desc: '신선한 채소와 시저드레싱' }
]

function formatCurrency(n) {
  return n.toLocaleString('ko-KR') + '원'
}

export default function App() {
  const [menu] = useState(SAMPLE_MENU)
  const [category, setCategory] = useState('전체')
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch(e){return []}
  })
  const [view, setView] = useState('menu') // menu, checkout, waitlist, complete
  const [waitlist, setWaitlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('waitlist') || '[]') } catch(e){return []}
  })
  const [form, setForm] = useState({ name: '', phone: '', party: 2 })
  const [orderInfo, setOrderInfo] = useState(null)

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('waitlist', JSON.stringify(waitlist)) }, [waitlist])

  const categories = useMemo(() => ['전체', ...Array.from(new Set(menu.map(m => m.category)))], [menu])

  const filtered = useMemo(() => category === '전체' ? menu : menu.filter(m => m.category === category), [menu, category])

  function addToCart(item) {
    setCart(prev => {
      const found = prev.find(p => p.id === item.id)
      if (found) return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function changeQty(id, delta) {
    setCart(prev => prev.map(p => p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p).filter(p => p.qty > 0))
  }

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0)

  // Waitlist handling
  function registerWaitlist(e) {
    e.preventDefault()
    const entry = { id: Date.now(), name: form.name || '익명', phone: form.phone || '-', party: Number(form.party) || 1, time: Date.now() }
    setWaitlist(prev => [...prev, entry])
    setForm({ name: '', phone: '', party: 2 })
  }

  function estimateWaitPosition(pos) {
    const avgMinPerParty = 7
    return pos * avgMinPerParty
  }

  function placeOrder({ preorder=false } = {}) {
    if (cart.length === 0) {
      alert('장바구니가 비어있습니다.')
      return
    }
    const id = 'ORD-' + Date.now().toString().slice(-6)
    const order = { id, items: cart, total, preorder, time: Date.now() }
    setOrderInfo(order)
    setCart([])
    setView('complete')
  }

  function clearWait(id) {
    setWaitlist(prev => prev.filter(w => w.id !== id))
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="brand">스마트 주문 — 식당</h1>
        <div className="header-actions">
          <button className="btn ghost" onClick={() => setView('menu')}>메뉴</button>
          <button className="btn" onClick={() => setView('checkout')}>장바구니 ({cart.reduce((s,c)=>s+c.qty,0)})</button>
          <button className="btn soft" onClick={() => setView('waitlist')}>대기등록</button>
        </div>
      </header>

      <main className="app-main">
        {view === 'menu' && (
          <section className="menu-screen">
            <div className="sidebar">
              <h2>카테고리</h2>
              <div className="categories">
                {categories.map(cat => (
                  <button key={cat} className={cat===category? 'chip active' : 'chip'} onClick={() => setCategory(cat)}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="menu-list">
              {filtered.map(item => (
                <article className="menu-card" key={item.id}>
                  <div className="menu-body">
                    <h3>{item.name}</h3>
                    <p className="muted">{item.desc}</p>
                    <div className="price">{formatCurrency(item.price)}</div>
                  </div>
                  <div className="menu-actions">
                    <button className="btn" onClick={() => addToCart(item)}>담기</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {view === 'checkout' && (
          <section className="checkout-screen">
            <h2>장바구니</h2>
            <div className="cart-list">
              {cart.length === 0 && <div className="empty">장바구니가 비어있습니다.</div>}
              {cart.map(p => (
                <div className="cart-item" key={p.id}>
                  <div className="ci-info">
                    <strong>{p.name}</strong>
                    <div className="muted small">{formatCurrency(p.price)} x {p.qty}</div>
                  </div>
                  <div className="ci-actions">
                    <button className="icon" onClick={() => changeQty(p.id, -1)}>-</button>
                    <span className="qty">{p.qty}</span>
                    <button className="icon" onClick={() => changeQty(p.id, +1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-footer">
              <div className="total">총 합계: <strong>{formatCurrency(total)}</strong></div>
              <div className="checkout-actions">
                <button className="btn soft" onClick={() => setView('menu')}>쇼핑 계속</button>
                <button className="btn" onClick={() => placeOrder({preorder:false})}>주문하기</button>
                <button className="btn ghost" onClick={() => placeOrder({preorder:true})}>미리 주문하기</button>
              </div>
            </div>
          </section>
        )}

        {view === 'waitlist' && (
          <section className="waitlist-screen">
            <h2>대기 등록</h2>
            <form className="wait-form" onSubmit={registerWaitlist}>
              <label>대표자명
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="이름" />
              </label>
              <label>전화번호
                <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="010-0000-0000" />
              </label>
              <label>인원수
                <input type="number" min={1} value={form.party} onChange={e=>setForm(f=>({...f,party:e.target.value}))} />
              </label>
              <div className="wait-actions">
                <button className="btn" type="submit">대기 등록</button>
                <button type="button" className="btn ghost" onClick={()=>{setForm({name:'',phone:'',party:2})}}>초기화</button>
              </div>
            </form>

            <div className="current-wait">
              <h3>현재 대기팀 ({waitlist.length})</h3>
              <ul>
                {waitlist.map((w, idx) => (
                  <li key={w.id} className="wait-item">
                    <div>
                      <strong>{w.name}</strong> · {w.party}명
                      <div className="muted small">예상 대기: {estimateWaitPosition(idx)}분</div>
                    </div>
                    <div className="wait-actions-inline">
                      <button className="btn soft" onClick={()=>{navigator.clipboard?.writeText(w.phone || '')}}>전화복사</button>
                      <button className="btn ghost" onClick={()=>clearWait(w.id)}>취소</button>
                    </div>
                  </li>
                ))}
                {waitlist.length === 0 && <li className="muted">현재 대기팀이 없습니다.</li>}
              </ul>
            </div>
          </section>
        )}

        {view === 'complete' && orderInfo && (
          <section className="complete-screen">
            <h2>주문 완료</h2>
            <div className="order-card">
              <div>주문번호: <strong>{orderInfo.id}</strong></div>
              <div>총액: <strong>{formatCurrency(orderInfo.total)}</strong></div>
              <div>주문시간: {new Date(orderInfo.time).toLocaleString()}</div>
              <h4>주문내역</h4>
              <ul>
                {orderInfo.items.map(it => (
                  <li key={it.id}>{it.name} x {it.qty} · {formatCurrency(it.price*it.qty)}</li>
                ))}
              </ul>
              <div className="complete-actions">
                <button className="btn" onClick={()=>{setView('menu'); setOrderInfo(null)}}>메인으로</button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <div>간단한 스마트 주문 데모 • 반응형 디자인</div>
        <div className="footer-actions">
          <button className="btn small" onClick={()=>{setCategory('전체'); setView('menu')}}>홈</button>
          <button className="btn small ghost" onClick={()=>{setView('checkout')}}>장바구니</button>
        </div>
      </footer>
    </div>
  )
}
