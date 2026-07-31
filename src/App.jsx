import React, { useEffect, useMemo, useState } from 'react'
import './App.css'

const SAMPLE_MENU = [
  { id: 1, name: '순두부찌개', category: '전체', price: 12000, desc: '얼큰하고 따뜻한 순두부찌개' },
  { id: 2, name: '콩국수', category: '전체', price: 9000, desc: '시원하고 고소한 콩국수' },
  { id: 3, name: '두루치기', category: '전체', price: 9000, desc: '달콤하고 진한 두루치기' },
  { id: 4, name: '두부조림', category: '전체', price: 13000, desc: '부드럽고 담백한 두부조림' }
]

const STATUS_OPTIONS = ['접수', '준비중', '완료']
const ADMIN_PASSWORD = '1234'

function formatCurrency(n) {
  return n.toLocaleString('ko-KR') + '원'
}

function getStoredValue(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch (e) {
    return fallback
  }
}

export default function App() {
  const [menu, setMenu] = useState(() => getStoredValue('menuItems', SAMPLE_MENU))
  const [category, setCategory] = useState('전체')
  const [cart, setCart] = useState(() => getStoredValue('cart', []))
  const [view, setView] = useState('menu')
  const [waitlist, setWaitlist] = useState(() => getStoredValue('waitlist', []))
  const [activeWaitNumber, setActiveWaitNumber] = useState(() => {
    const stored = Number(getStoredValue('activeWaitNumber', null))
    return Number.isFinite(stored) && stored > 0 ? stored : null
  })
  const [orders, setOrders] = useState(() => getStoredValue('orders', []).map(order => ({ ...order, status: order.status || '접수' })))
  const [adminAuthenticated, setAdminAuthenticated] = useState(() => getStoredValue('adminAuthenticated', false))
  const [adminPassword, setAdminPassword] = useState('')
  const [adminMenuForm, setAdminMenuForm] = useState({ id: null, name: '', price: '', desc: '', category: '' })
  const [form, setForm] = useState({ name: '', phone: '', party: 2 })
  const [orderInfo, setOrderInfo] = useState(null)

  useEffect(() => { localStorage.setItem('menuItems', JSON.stringify(menu)) }, [menu])
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('waitlist', JSON.stringify(waitlist)) }, [waitlist])
  useEffect(() => { localStorage.setItem('orders', JSON.stringify(orders)) }, [orders])
  useEffect(() => {
    if (activeWaitNumber) {
      localStorage.setItem('activeWaitNumber', String(activeWaitNumber))
    } else {
      localStorage.removeItem('activeWaitNumber')
    }
  }, [activeWaitNumber])
  useEffect(() => {
    if (adminAuthenticated) {
      localStorage.setItem('adminAuthenticated', 'true')
    } else {
      localStorage.removeItem('adminAuthenticated')
    }
  }, [adminAuthenticated])

  const categories = useMemo(() => ['전체', ...Array.from(new Set(menu.map(m => m.category)))], [menu])
  const filtered = useMemo(() => category === '전체' ? menu : menu.filter(m => m.category === category), [menu, category])
  const currentWait = useMemo(() => waitlist.find(w => w.waitNumber === activeWaitNumber) || null, [waitlist, activeWaitNumber])
  const activeWaitOrders = useMemo(() => orders.filter(o => o.waitNumber === activeWaitNumber), [orders, activeWaitNumber])
  const groupedOrders = useMemo(() => {
    return orders.reduce((acc, order) => {
      const key = String(order.waitNumber)
      if (!acc[key]) acc[key] = []
      acc[key].push(order)
      return acc
    }, {})
  }, [orders])

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

  function registerWaitlist(e) {
    e.preventDefault()
    const nextNumber = waitlist.reduce((max, w) => Math.max(max, Number(w.waitNumber || 0)), 0) + 1
    const entry = {
      id: Date.now(),
      waitNumber: nextNumber,
      name: form.name || '익명',
      phone: form.phone || '-',
      party: Number(form.party) || 1,
      time: Date.now()
    }
    setWaitlist(prev => [...prev, entry])
    setActiveWaitNumber(nextNumber)
    setForm({ name: '', phone: '', party: 2 })
    setView('menu')
  }

  function estimateWaitPosition(pos) {
    const avgMinPerParty = 7
    return pos * avgMinPerParty
  }

  function placeOrder({ preorder = false } = {}) {
    if (cart.length === 0) {
      alert('장바구니가 비어있습니다.')
      return
    }
    if (!activeWaitNumber) {
      alert('대기등록을 먼저 해주세요.')
      return
    }

    const id = 'ORD-' + Date.now().toString().slice(-6)
    const order = {
      id,
      waitNumber: activeWaitNumber,
      waitName: currentWait?.name || '익명',
      items: cart.map(item => ({ ...item })),
      total,
      preorder,
      status: '접수',
      time: Date.now()
    }
    setOrders(prev => [...prev, order])
    setOrderInfo(order)
    setCart([])
    setView('complete')
  }

  function clearWait(id) {
    setWaitlist(prev => prev.filter(w => w.id !== id))
  }

  function handleAdminLogin(e) {
    e.preventDefault()
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminAuthenticated(true)
      setAdminPassword('')
      setView('admin')
    } else {
      alert('관리자 비밀번호가 올바르지 않습니다.')
    }
  }

  function handleAdminLogout() {
    setAdminAuthenticated(false)
    setAdminPassword('')
    setView('menu')
  }

  function resetAdminMenuForm() {
    setAdminMenuForm({ id: null, name: '', price: '', desc: '', category: '' })
  }

  function handleAdminMenuSubmit(e) {
    e.preventDefault()
    const trimmedName = adminMenuForm.name.trim()
    const trimmedDesc = adminMenuForm.desc.trim()
    const trimmedCategory = adminMenuForm.category.trim()
    const priceValue = Number(adminMenuForm.price)

    if (!trimmedName || !trimmedCategory || !trimmedDesc || Number.isNaN(priceValue) || priceValue <= 0) {
      alert('메뉴 이름, 가격, 설명, 카테고리를 모두 올바르게 입력해주세요.')
      return
    }

    if (adminMenuForm.id) {
      setMenu(prev => prev.map(item => item.id === adminMenuForm.id ? { ...item, name: trimmedName, price: priceValue, desc: trimmedDesc, category: trimmedCategory } : item))
    } else {
      const newItem = { id: Date.now(), name: trimmedName, price: priceValue, desc: trimmedDesc, category: trimmedCategory }
      setMenu(prev => [...prev, newItem])
    }

    resetAdminMenuForm()
  }

  function handleAdminDelete(id) {
    setMenu(prev => prev.filter(item => item.id !== id))
  }

  function handleAdminEdit(item) {
    setAdminMenuForm({ id: item.id, name: item.name, price: String(item.price), desc: item.desc, category: item.category })
  }

  function updateOrderStatus(orderId, status) {
    setOrders(prev => prev.map(order => order.id === orderId ? { ...order, status } : order))
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="brand">스마트 주문 — 식당</h1>
        <div className="header-actions">
          <button className="btn ghost" onClick={() => setView('menu')}>메뉴</button>
          <button className="btn" onClick={() => setView('checkout')}>장바구니 ({cart.reduce((s, c) => s + c.qty, 0)})</button>
          <button className="btn soft" onClick={() => setView('waitlist')}>대기등록</button>
          <button className="btn ghost" onClick={() => { if (adminAuthenticated) setView('admin'); else setView('adminLogin') }}>관리자 모드</button>
        </div>
      </header>

      <main className="app-main">
        {view === 'adminLogin' && (
          <section className="admin-login-screen">
            <div className="admin-login-card">
              <h2>관리자 모드</h2>
              <p className="muted">프로토타입용 비밀번호를 입력해 관리자 화면으로 진입합니다.</p>
              <form className="admin-login-form" onSubmit={handleAdminLogin}>
                <label>비밀번호
                  <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="1234" />
                </label>
                <div className="admin-actions">
                  <button className="btn" type="submit">로그인</button>
                  <button className="btn ghost" type="button" onClick={() => setView('menu')}>취소</button>
                </div>
              </form>
            </div>
          </section>
        )}

        {view === 'admin' && (
          <section className="admin-screen">
            <div className="admin-header">
              <div>
                <h2>관리자 화면</h2>
                <p className="muted">메뉴를 관리하고 대기번호별 주문 상태를 확인합니다.</p>
              </div>
              <button className="btn ghost" onClick={handleAdminLogout}>로그아웃</button>
            </div>

            <div className="admin-grid">
              <div className="admin-card">
                <h3>메뉴 관리</h3>
                <form className="admin-form" onSubmit={handleAdminMenuSubmit}>
                  <label>메뉴 이름
                    <input value={adminMenuForm.name} onChange={e => setAdminMenuForm(prev => ({ ...prev, name: e.target.value }))} placeholder="메뉴 이름" />
                  </label>
                  <label>가격
                    <input type="number" min="1" value={adminMenuForm.price} onChange={e => setAdminMenuForm(prev => ({ ...prev, price: e.target.value }))} placeholder="12000" />
                  </label>
                  <label>설명
                    <input value={adminMenuForm.desc} onChange={e => setAdminMenuForm(prev => ({ ...prev, desc: e.target.value }))} placeholder="설명" />
                  </label>
                  <label>카테고리
                    <input value={adminMenuForm.category} onChange={e => setAdminMenuForm(prev => ({ ...prev, category: e.target.value }))} placeholder="전체" />
                  </label>
                  <div className="admin-actions">
                    <button className="btn" type="submit">{adminMenuForm.id ? '메뉴 수정' : '메뉴 추가'}</button>
                    <button className="btn soft" type="button" onClick={resetAdminMenuForm}>초기화</button>
                  </div>
                </form>

                <div className="admin-list">
                  {menu.map(item => (
                    <div className="admin-list-item" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <div className="muted small">{formatCurrency(item.price)} · {item.category}</div>
                        <div className="muted small">{item.desc}</div>
                      </div>
                      <div className="admin-item-actions">
                        <button className="btn soft" type="button" onClick={() => handleAdminEdit(item)}>수정</button>
                        <button className="btn ghost" type="button" onClick={() => handleAdminDelete(item.id)}>삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-card">
                <h3>주문 관리</h3>
                {Object.entries(groupedOrders).length === 0 ? (
                  <div className="empty">현재 주문이 없습니다.</div>
                ) : (
                  Object.entries(groupedOrders).sort(([a], [b]) => Number(a) - Number(b)).map(([waitNumber, waitOrders]) => (
                    <div className="admin-order-group" key={waitNumber}>
                      <h4>대기 {waitNumber}번</h4>
                      {waitOrders.map(order => (
                        <div className="admin-order-card" key={order.id}>
                          <div className="admin-order-header">
                            <div>
                              <strong>{order.waitName}</strong>
                              <div className="muted small">{order.preorder ? '미리 주문' : '주문'} · {new Date(order.time).toLocaleString()}</div>
                            </div>
                            <div className="status-switcher">
                              {STATUS_OPTIONS.map(status => (
                                <button
                                  key={status}
                                  className={order.status === status ? 'status-btn active' : 'status-btn'}
                                  onClick={() => updateOrderStatus(order.id, status)}
                                  type="button"
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </div>
                          <ul className="order-list">
                            {order.items.map(item => (
                              <li key={item.id} className="order-item">{item.name} × {item.qty}</li>
                            ))}
                          </ul>
                          <div className="order-total">총 {formatCurrency(order.total)}</div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {view === 'menu' && (
          <section className="menu-screen">
            <div className="sidebar">
              <h2>카테고리</h2>
              <div className="categories">
                {categories.map(cat => (
                  <button key={cat} className={cat === category ? 'chip active' : 'chip'} onClick={() => setCategory(cat)}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="menu-content">
              <div className="status-card">
                <div>
                  <div className="status-title">현재 대기 상태</div>
                  <div className="status-value">
                    {currentWait ? <>대기 <span className="wait-badge">{currentWait.waitNumber}번</span> · {currentWait.name}</> : '대기등록 후 주문을 연결할 수 있어요.'}
                  </div>
                </div>
                {activeWaitOrders.length > 0 && <div className="status-sub">주문 {activeWaitOrders.length}건</div>}
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
            </div>
          </section>
        )}

        {view === 'checkout' && (
          <section className="checkout-screen">
            <h2>장바구니</h2>
            <div className="status-card compact">
              <div>
                <div className="status-title">주문 연결</div>
                <div className="status-value">
                  {activeWaitNumber ? <>대기 <span className="wait-badge">{activeWaitNumber}번</span> 주문으로 연결됩니다.</> : '대기등록을 먼저 해주세요.'}
                </div>
              </div>
            </div>

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
                <button className="btn" onClick={() => placeOrder({ preorder: false })}>주문하기</button>
                <button className="btn ghost" onClick={() => placeOrder({ preorder: true })}>미리 주문하기</button>
              </div>
            </div>
          </section>
        )}

        {view === 'waitlist' && (
          <section className="waitlist-screen">
            <h2>대기 등록</h2>
            <div className="status-card compact">
              <div>
                <div className="status-title">대기번호 안내</div>
                <div className="status-value">
                  {currentWait ? <>현재 <span className="wait-badge">대기 {currentWait.waitNumber}번</span>으로 연결돼 있습니다.</> : '대기 등록 시 자동으로 번호가 발급됩니다.'}
                </div>
              </div>
            </div>

            <form className="wait-form" onSubmit={registerWaitlist}>
              <label>대표자명
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="이름" />
              </label>
              <label>전화번호
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" />
              </label>
              <label>인원수
                <input type="number" min={1} value={form.party} onChange={e => setForm(f => ({ ...f, party: e.target.value }))} />
              </label>
              <div className="wait-actions">
                <button className="btn" type="submit">대기 등록</button>
                <button type="button" className="btn ghost" onClick={() => { setForm({ name: '', phone: '', party: 2 }) }}>초기화</button>
              </div>
            </form>

            <div className="current-wait">
              <h3>현재 대기팀 ({waitlist.length})</h3>
              <ul className="wait-list">
                {waitlist.map((w, idx) => {
                  const waitOrders = orders.filter(order => order.waitNumber === w.waitNumber)
                  const totalOrderAmount = waitOrders.reduce((sum, order) => sum + order.total, 0)
                  const menuSummary = waitOrders.flatMap(order => order.items.map(item => ({ name: item.name, qty: item.qty })))
                  return (
                    <li key={w.id} className="wait-item">
                      <div className="wait-main">
                        <div className="wait-header">
                          <strong>대기 {w.waitNumber}번</strong>
                          <span className="wait-meta">· {w.party}명</span>
                        </div>
                        <div className="wait-person-info">
                          <div><span className="info-label">대표자</span> {w.name}</div>
                          <div><span className="info-label">전화번호</span> {w.phone}</div>
                        </div>

                        <div className="wait-order-block">
                          <div className="order-section-title">주문</div>
                          {waitOrders.length > 0 ? (
                            <>
                              <ul className="order-line-list">
                                {menuSummary.length > 0 ? menuSummary.map((item, index) => (
                                  <li key={`${item.name}-${index}`}>
                                    {item.name} × {item.qty}
                                  </li>
                                )) : <li>주문 없음</li>}
                              </ul>
                              <div className="order-summary-row">
                                <span>총 주문금액</span>
                                <strong>{formatCurrency(totalOrderAmount)}</strong>
                              </div>
                            </>
                          ) : (
                            <div className="muted small">주문 없음</div>
                          )}
                        </div>

                        <div className="wait-footer-meta">
                          <span>예상 대기 {estimateWaitPosition(idx)}분</span>
                        </div>
                      </div>
                      <div className="wait-actions-inline">
                        <button className="btn soft" onClick={() => { navigator.clipboard?.writeText(w.phone || '') }}>전화복사</button>
                        <button className="btn ghost" onClick={() => clearWait(w.id)}>취소</button>
                      </div>
                    </li>
                  )
                })}
                {waitlist.length === 0 && <li className="muted">현재 대기팀이 없습니다.</li>}
              </ul>
            </div>
          </section>
        )}

        {view === 'complete' && orderInfo && (
          <section className="complete-screen">
            <h2>주문 완료</h2>
            <div className="order-card">
              <div className="status-title">주문 연결 정보</div>
              <div className="status-value">대기 <span className="wait-badge">{orderInfo.waitNumber}번</span> 주문</div>
              <div className="order-meta">주문번호: <strong>{orderInfo.id}</strong></div>
              <div className="order-meta">손님: <strong>{orderInfo.waitName}</strong></div>
              <div className="order-meta">총액: <strong>{formatCurrency(orderInfo.total)}</strong></div>
              <div className="order-meta">주문시간: {new Date(orderInfo.time).toLocaleString()}</div>
              <h4>주문내역</h4>
              <ul className="order-list">
                {orderInfo.items.map(it => (
                  <li key={it.id} className="order-item">{it.name} x {it.qty} · {formatCurrency(it.price * it.qty)}</li>
                ))}
              </ul>
              <div className="complete-actions">
                <button className="btn" onClick={() => { setView('menu'); setOrderInfo(null) }}>메인으로</button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <div>간단한 스마트 주문 데모 • 반응형 디자인</div>
        <div className="footer-actions">
          <button className="btn small" onClick={() => { setCategory('전체'); setView('menu') }}>홈</button>
          <button className="btn small ghost" onClick={() => { setView('checkout') }}>장바구니</button>
        </div>
      </footer>
    </div>
  )
}
