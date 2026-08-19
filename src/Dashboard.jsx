import { useState, useEffect, useRef } from 'react'
import { Chart } from 'chart.js/auto'
import {
  LayoutGrid, Wallet, Receipt, Repeat, History, Shield, Target, TrendingUp, LogOut, X, Pause, Play, ChevronDown,
  Home, ShoppingCart, UtensilsCrossed, Dumbbell, Plane, Tv, Zap, ShoppingBag, HeartPulse, Sparkles, PiggyBank, Menu
} from 'lucide-react'
import { supabase } from './supabaseClient'
import './Dashboard.css'

const CATEGORIES = ['Housing', 'Groceries', 'Food & Delivery', 'Fitness', 'Travel', 'Subscriptions', 'Utilities', 'Shopping', 'Health', 'Other']
const INVESTMENT_CATEGORIES = ['Mutual Fund', 'Stocks', 'Gold', 'Fixed Deposit', 'PF', 'Other']

const CATEGORY_ICONS = {
  Housing: Home, Groceries: ShoppingCart, 'Food & Delivery': UtensilsCrossed, Fitness: Dumbbell,
  Travel: Plane, Subscriptions: Tv, Utilities: Zap, Shopping: ShoppingBag, Health: HeartPulse,
  Other: Sparkles, Income: Wallet
}
const CATEGORY_COLORS = {
  Housing: '#5B8C7B', Groceries: '#8FAF9A', 'Food & Delivery': '#C77B62', Fitness: '#C9A15A',
  Travel: '#7A93B8', Subscriptions: '#A78BC4', Utilities: '#D4A5A0', Shopping: '#E0B85C',
  Health: '#6FAAB0', Other: '#B7B3A9'
}
const TAB_ICONS = { overview: LayoutGrid, salary: Wallet, expenses: Receipt, recurring: Repeat, budgets: Target, emergency: Shield, investments: TrendingUp, savings: PiggyBank, history: History }

function CategoryIcon({ category, size = 16 }) {
  const Icon = CATEGORY_ICONS[category] || Sparkles
  return <Icon size={size} strokeWidth={2} />
}

function lastDayOfMonth(y, monthIndex0) {
  return new Date(y, monthIndex0 + 1, 0).getDate()
}
function effectiveDueDay(rule, y, monthIndex0) {
  if (rule.day_mode === 'first') return 1
  if (rule.day_mode === 'last') return lastDayOfMonth(y, monthIndex0)
  return rule.day_of_month
}
function dayModeLabel(rule) {
  if (rule.day_mode === 'first') return 'First day'
  if (rule.day_mode === 'last') return 'Last day'
  return `Day ${rule.day_of_month}`
}

export default function Dashboard({ session }) {
  const userId = session.user.id
  const [tab, setTab] = useState('overview')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [salaries, setSalaries] = useState([])
  const [expenses, setExpenses] = useState([])
  const [recurring, setRecurring] = useState([])
  const [efEntries, setEfEntries] = useState([])
  const [efTargetMonths, setEfTargetMonths] = useState(6)
  const [budgets, setBudgets] = useState([])
  const [investments, setInvestments] = useState([])
  const [savingsEntries, setSavingsEntries] = useState([])
  const [expMonthFilter, setExpMonthFilter] = useState(new Date().toISOString().slice(0, 7))
  const [expandedMonth, setExpandedMonth] = useState(null)

  const [salAmount, setSalAmount] = useState('')
  const [salDate, setSalDate] = useState(new Date().toISOString().slice(0, 10))
  const [salForMonth, setSalForMonth] = useState(new Date().toISOString().slice(0, 7))
  const [salNote, setSalNote] = useState('')

  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState('Groceries')
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10))
  const [expDesc, setExpDesc] = useState('')
  const [expIsRecurring, setExpIsRecurring] = useState(false)
  const [expDayMode, setExpDayMode] = useState('fixed')
  const [expRecurDay, setExpRecurDay] = useState('')

  const [recName, setRecName] = useState('')
  const [recAmount, setRecAmount] = useState('')
  const [recDayMode, setRecDayMode] = useState('fixed')
  const [recDay, setRecDay] = useState('')
  const [recCategory, setRecCategory] = useState('Housing')
  const [recStartMonth, setRecStartMonth] = useState(new Date().toISOString().slice(0, 7))

  const [efAmount, setEfAmount] = useState('')
  const [efDate, setEfDate] = useState(new Date().toISOString().slice(0, 10))
  const [efType, setEfType] = useState('contribution')
  const [efNote, setEfNote] = useState('')

  const [budgetCategory, setBudgetCategory] = useState('Groceries')
  const [budgetLimit, setBudgetLimit] = useState('')

  const [invName, setInvName] = useState('')
  const [invCategory, setInvCategory] = useState('Mutual Fund')
  const [invAmount, setInvAmount] = useState('')
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10))
  const [invType, setInvType] = useState('contribution')
  const [invNote, setInvNote] = useState('')

  const [savingsAmount, setSavingsAmount] = useState('')
  const [savingsDate, setSavingsDate] = useState(new Date().toISOString().slice(0, 10))
  const [savingsNote, setSavingsNote] = useState('')

  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const donutRef = useRef(null)
  const donutInstance = useRef(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (tab === 'overview') { drawChart(); drawDonut() } }, [tab, salaries, expenses])

  const todayISO = () => new Date().toISOString().slice(0, 10)
  const fmt = n => (n < 0 ? '−₹' + Math.abs(Math.round(n)).toLocaleString('en-IN') : '₹' + Math.round(n).toLocaleString('en-IN'))
  const monthKey = d => d.slice(0, 7)
  const monthLabel = mk => {
    const [y, m] = mk.split('-')
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  }

  function goToTab(id) {
    setTab(id)
    setDrawerOpen(false)
  }

  async function loadAll() {
    const { data: sal } = await supabase.from('salaries').select('*').eq('user_id', userId)
    const { data: exp } = await supabase.from('expenses').select('*').eq('user_id', userId)
    const { data: rec } = await supabase.from('recurring_rules').select('*').eq('user_id', userId)
    const { data: ef } = await supabase.from('emergency_fund_entries').select('*').eq('user_id', userId)
    const { data: bud } = await supabase.from('category_budgets').select('*').eq('user_id', userId)
    const { data: inv } = await supabase.from('investment_entries').select('*').eq('user_id', userId)
    const { data: savings } = await supabase.from('savings_entries').select('*').eq('user_id', userId)
    setSalaries(sal || [])
    setExpenses(exp || [])
    setRecurring(rec || [])
    setEfEntries(ef || [])
    setBudgets(bud || [])
    setInvestments(inv || [])
    setSavingsEntries(savings || [])
    await loadSettings()
    await autoPost(rec || [], exp || [])
  }

  async function loadSettings() {
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
    if (data) {
      setEfTargetMonths(data.emergency_fund_target_months)
    } else {
      await supabase.from('user_settings').insert({ user_id: userId, emergency_fund_target_months: 6 })
      setEfTargetMonths(6)
    }
  }

  async function updateTargetMonths(val) {
    setEfTargetMonths(val)
    await supabase.from('user_settings').upsert({ user_id: userId, emergency_fund_target_months: val })
  }

  async function autoPost(rules, existingExpenses) {
    const now = new Date()
    const y = now.getFullYear()
    const monthIndex0 = now.getMonth()
    const curMonth = now.toISOString().slice(0, 7)
    const curDay = now.getDate()
    let changed = false
    for (const r of rules.filter(r => r.active)) {
      if (r.start_month > curMonth) continue
      const dueDay = effectiveDueDay(r, y, monthIndex0)
      const already = existingExpenses.some(e => e.recurring_id === r.id && e.date.slice(0, 7) === curMonth)
      if (already || curDay < dueDay) continue
      const dd = String(dueDay).padStart(2, '0')
      await supabase.from('expenses').insert({
        user_id: userId, amount: r.amount, category: r.category,
        date: `${curMonth}-${dd}`, description: r.name, recurring_id: r.id, is_auto: true
      })
      changed = true
    }
    if (changed) {
      const { data: exp } = await supabase.from('expenses').select('*').eq('user_id', userId)
      setExpenses(exp || [])
    }
  }

  function drawChart() {
    if (!chartRef.current) return
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(d.toISOString().slice(0, 7))
    }
    const inc = months.map(mk => salaries.filter(s => s.for_month === mk).reduce((s, x) => s + Number(x.amount), 0))
    const exp = months.map(mk => expenses.filter(e => monthKey(e.date) === mk).reduce((s, x) => s + Number(x.amount), 0))

    if (chartInstance.current) chartInstance.current.destroy()
    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: months.map(mk => {
          const [y, m] = mk.split('-')
          return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        }),
        datasets: [
          { label: 'Income', data: inc, backgroundColor: '#5B8C7B', borderRadius: 5, barPercentage: .55 },
          { label: 'Expenses', data: exp, backgroundColor: '#C77B62', borderRadius: 5, barPercentage: .55 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', align: 'end', labels: { color: '#8C8880', boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8C8880', font: { size: 11 } } },
          y: {
            beginAtZero: true, max: 100000,
            ticks: { stepSize: 20000, color: '#8C8880', font: { size: 10 }, callback: v => v === 0 ? '₹0' : '₹' + Math.round(v / 1000) + 'k' },
            grid: { color: 'rgba(46,44,40,0.06)' }
          }
        }
      }
    })
  }

  function drawDonut() {
    if (!donutRef.current) return
    const now = new Date()
    const curMonth = now.toISOString().slice(0, 7)
    const today = todayISO()
    const byCat = {}
    expenses.filter(e => monthKey(e.date) === curMonth && e.date <= today).forEach(e => {
      byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount)
    })
    const labels = Object.keys(byCat)
    const data = Object.values(byCat)
    const colors = labels.map(l => CATEGORY_COLORS[l] || '#B7B3A9')

    if (donutInstance.current) donutInstance.current.destroy()
    if (labels.length === 0) return
    donutInstance.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#FFFFFF', borderWidth: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
    })
  }

  async function addSalary(e) {
    e.preventDefault()
    if (!salAmount) return
    await supabase.from('salaries').insert({ user_id: userId, amount: Number(salAmount), date: salDate, for_month: salForMonth, note: salNote })
    setSalAmount(''); setSalNote('')
    loadAll()
  }

  async function addExpense(e) {
    e.preventDefault()
    if (!expAmount) return
    if (expIsRecurring) {
      if (expDayMode === 'fixed' && !expRecurDay) return
      await supabase.from('recurring_rules').insert({
        user_id: userId, name: expDesc || expCategory, amount: Number(expAmount),
        category: expCategory, day_mode: expDayMode,
        day_of_month: expDayMode === 'fixed' ? Number(expRecurDay) : 1,
        active: true, start_month: expDate.slice(0, 7)
      })
    } else {
      await supabase.from('expenses').insert({ user_id: userId, amount: Number(expAmount), category: expCategory, date: expDate, description: expDesc || expCategory, is_auto: false })
    }
    setExpAmount(''); setExpDesc(''); setExpIsRecurring(false); setExpDayMode('fixed'); setExpRecurDay('')
    loadAll()
  }

  async function addRecurring(e) {
    e.preventDefault()
    if (!recName || !recAmount) return
    if (recDayMode === 'fixed' && !recDay) return
    await supabase.from('recurring_rules').insert({
      user_id: userId, name: recName, amount: Number(recAmount), category: recCategory,
      day_mode: recDayMode, day_of_month: recDayMode === 'fixed' ? Number(recDay) : 1,
      active: true, start_month: recStartMonth
    })
    setRecName(''); setRecAmount(''); setRecDay(''); setRecDayMode('fixed')
    setRecStartMonth(new Date().toISOString().slice(0, 7))
    loadAll()
  }

  async function addEfEntry(e) {
    e.preventDefault()
    if (!efAmount) return
    await supabase.from('emergency_fund_entries').insert({
      user_id: userId, amount: Number(efAmount), date: efDate, type: efType, note: efNote
    })
    setEfAmount(''); setEfNote('')
    loadAll()
  }

  async function addBudget(e) {
    e.preventDefault()
    if (!budgetLimit) return
    await supabase.from('category_budgets').upsert(
      { user_id: userId, category: budgetCategory, monthly_limit: Number(budgetLimit) },
      { onConflict: 'user_id,category' }
    )
    setBudgetLimit('')
    loadAll()
  }

  async function addInvestment(e) {
    e.preventDefault()
    if (!invName || !invAmount) return
    await supabase.from('investment_entries').insert({
      user_id: userId, name: invName, category: invCategory, amount: Number(invAmount),
      date: invDate, type: invType, note: invNote
    })
    setInvName(''); setInvAmount(''); setInvNote('')
    loadAll()
  }

  async function deleteSalary(id) { await supabase.from('salaries').delete().eq('id', id); loadAll() }
  async function deleteExpense(id) { await supabase.from('expenses').delete().eq('id', id); loadAll() }
  async function deleteRecurring(id) {
    await supabase.from('recurring_rules').delete().eq('id', id)
    await supabase.from('expenses').delete().eq('recurring_id', id)
    loadAll()
  }
  async function toggleRecurring(id, active) {
    await supabase.from('recurring_rules').update({ active: !active }).eq('id', id)
    loadAll()
  }
  async function deleteEfEntry(id) { await supabase.from('emergency_fund_entries').delete().eq('id', id); loadAll() }
  async function deleteBudget(id) { await supabase.from('category_budgets').delete().eq('id', id); loadAll() }
  async function deleteInvestment(id) { await supabase.from('investment_entries').delete().eq('id', id); loadAll() }

  async function addSavings(e) {
    e.preventDefault()
    if (!savingsAmount) return
    await supabase.from('savings_entries').insert({
      user_id: userId, amount: Number(savingsAmount), date: savingsDate, note: savingsNote
    })
    setSavingsAmount(''); setSavingsNote('')
    loadAll()
  }

  async function deleteSavings(id) {
    await supabase.from('savings_entries').delete().eq('id', id)
    loadAll()
  }

  const today = todayISO()
  const now = new Date()
  const totalIn = salaries.reduce((s, x) => s + Number(x.amount), 0)
  const totalOut = expenses.reduce((s, x) => s + Number(x.amount), 0)
  const balance = totalIn - totalOut
  const curMonth = now.toISOString().slice(0, 7)
  const monthIn = salaries.filter(s => s.for_month === curMonth).reduce((s, x) => s + Number(x.amount), 0)
  const monthOut = expenses
    .filter(e => monthKey(e.date) === curMonth && e.date <= today)
    .reduce((s, x) => s + Number(x.amount), 0)
  const earlyRules = recurring.filter(r => r.active && r.start_month <= curMonth && effectiveDueDay(r, now.getFullYear(), now.getMonth()) <= 5)
  const reserve = earlyRules.reduce((s, x) => s + Number(x.amount), 0)
  const reserveNote = earlyRules.length
    ? `${earlyRules.map(r => r.name).join(' + ')} land${earlyRules.length === 1 ? 's' : ''} before the 5th — usually covered by the income you already have, not the one still on its way.`
    : 'No early-month bills set up yet. Add one from the Recurring tab.'

  const activity = [
    ...salaries.map(s => ({ type: 'in', date: s.date, desc: s.note || 'Income', amount: s.amount, category: 'Income' })),
    ...expenses.filter(e => e.date <= today).map(e => ({ type: 'out', date: e.date, desc: e.description, amount: e.amount, category: e.category, auto: e.is_auto }))
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)

  const upcomingOneTime = expenses
    .filter(e => !e.recurring_id && e.date > today)
    .map(e => ({ date: e.date, desc: e.description, amount: e.amount, category: e.category, kind: 'scheduled' }))

  const upcomingRecurring = recurring
    .filter(r => r.active)
    .map(r => {
      const nextMonth = r.start_month > curMonth ? r.start_month : curMonth
      const [ny, nm] = nextMonth.split('-').map(Number)
      const dueDay = effectiveDueDay(r, ny, nm - 1)
      const date = `${nextMonth}-${String(dueDay).padStart(2, '0')}`
      return { date, desc: r.name, amount: r.amount, category: r.category, kind: 'recurring' }
    })
    .filter(x => x.date > today)

  const upcoming = [...upcomingOneTime, ...upcomingRecurring].sort((a, b) => a.date.localeCompare(b.date))
  const upcomingThisMonth = upcoming.filter(x => monthKey(x.date) === curMonth)
  const upcomingThisMonthSum = upcomingThisMonth.reduce((s, x) => s + Number(x.amount), 0)

  const upcomingRecurringSum = upcomingRecurring.reduce((s, x) => s + Number(x.amount), 0)
  const trueBalance = balance - upcomingRecurringSum

  const daysInMonth = lastDayOfMonth(now.getFullYear(), now.getMonth())
  const daysLeftInMonth = daysInMonth - now.getDate() + 1
  const leftToSpend = monthIn - monthOut - upcomingThisMonthSum
  const safeToSpendToday = Math.max(0, leftToSpend / daysLeftInMonth)

  const expMonths = [...new Set(expenses.map(e => monthKey(e.date)))].sort().reverse()
  if (!expMonths.includes(curMonth)) expMonths.unshift(curMonth)
  const filteredExpenses = expenses.filter(e => monthKey(e.date) === expMonthFilter).sort((a, b) => b.date.localeCompare(a.date))
  const sortedSalaries = [...salaries].sort((a, b) => b.date.localeCompare(a.date))
  const sortedRecurring = [...recurring].sort((a, b) => a.day_of_month - b.day_of_month)

  const allMonthsSet = new Set([
    ...salaries.map(s => s.for_month),
    ...expenses.map(e => monthKey(e.date))
  ])
  const allMonths = [...allMonthsSet].sort().reverse()

  function monthActivity(mk) {
    return [
      ...salaries.filter(s => s.for_month === mk).map(s => ({ type: 'in', date: s.date, desc: s.note || 'Income', amount: s.amount, category: 'Income' })),
      ...expenses.filter(e => monthKey(e.date) === mk).map(e => ({ type: 'out', date: e.date, desc: e.description, amount: e.amount, category: e.category, auto: e.is_auto, future: e.date > today }))
    ].sort((a, b) => b.date.localeCompare(a.date))
  }
  function monthIncomeFor(mk) { return salaries.filter(s => s.for_month === mk).reduce((s, x) => s + Number(x.amount), 0) }
  function monthExpenseFor(mk) { return expenses.filter(e => monthKey(e.date) === mk).reduce((s, x) => s + Number(x.amount), 0) }

  function pastMonthKeys(n) {
    const arr = []
    for (let i = 1; i <= n; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      arr.push(d.toISOString().slice(0, 7))
    }
    return arr
  }
  const recentMonthVals = pastMonthKeys(3).map(mk => monthExpenseFor(mk)).filter(v => v > 0)
  const avgMonthlyExpense = recentMonthVals.length
    ? recentMonthVals.reduce((a, b) => a + b, 0) / recentMonthVals.length
    : monthOut

  const efContributions = efEntries.filter(e => e.type === 'contribution').reduce((s, x) => s + Number(x.amount), 0)
  const efWithdrawals = efEntries.filter(e => e.type === 'withdrawal').reduce((s, x) => s + Number(x.amount), 0)
  const efBalance = efContributions - efWithdrawals
  const efTargetAmount = avgMonthlyExpense * efTargetMonths
  const efMonthsCovered = avgMonthlyExpense > 0 ? efBalance / avgMonthlyExpense : 0
  const efProgressPct = efTargetAmount > 0 ? Math.min(100, (efBalance / efTargetAmount) * 100) : 0
  const sortedEf = [...efEntries].sort((a, b) => b.date.localeCompare(a.date))

  function categorySpent(cat) {
    return expenses.filter(e => e.category === cat && monthKey(e.date) === curMonth && e.date <= today).reduce((s, x) => s + Number(x.amount), 0)
  }
  const sortedBudgets = [...budgets].sort((a, b) => a.category.localeCompare(b.category))

  const invContrib = investments.filter(i => i.type === 'contribution').reduce((s, x) => s + Number(x.amount), 0)
  const invWithdraw = investments.filter(i => i.type === 'withdrawal').reduce((s, x) => s + Number(x.amount), 0)
  const investmentsTotal = invContrib - invWithdraw
  const sortedSavings = [...savingsEntries].sort((a, b) => b.date.localeCompare(a.date))
  const currentSavings = savingsEntries.reduce((sum, entry) => sum + Number(entry.amount), 0)

  const dueRecurringExpenses = upcomingRecurring.filter(e => e.date <= today)

  const dueExpenses = [
    ...expenses.filter(e => e.date <= today),
    ...dueRecurringExpenses
  ]

  const dueMonths = new Set(dueExpenses.map(e => monthKey(e.date)))
  dueMonths.add(curMonth)

  let incomeCoverageShortfall = 0

  for (const mk of dueMonths) {
    const monthIncome = salaries
      .filter(s => s.for_month === mk)
      .reduce((sum, s) => sum + Number(s.amount), 0)

    const monthExpenses = dueExpenses
      .filter(e => monthKey(e.date) === mk)
      .reduce((sum, e) => sum + Number(e.amount), 0)

    incomeCoverageShortfall += Math.max(0, monthExpenses - monthIncome)
  }

  const availableSavings = Math.max(0, currentSavings - incomeCoverageShortfall)

  const totalBalance = trueBalance + currentSavings
  const netWorth = totalBalance + investmentsTotal + efBalance
  const sortedInvestments = [...investments].sort((a, b) => b.date.localeCompare(a.date))
  const invByCategory = {}
  investments.forEach(i => {
    const sign = i.type === 'contribution' ? 1 : -1
    invByCategory[i.category] = (invByCategory[i.category] || 0) + sign * Number(i.amount)
  })

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'salary', label: 'Income' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'recurring', label: 'Recurring' },
    { id: 'budgets', label: 'Budgets' },
    { id: 'emergency', label: 'Emergency Fund' },
    { id: 'investments', label: 'Investments' },
    { id: 'savings', label: 'Savings' },
    { id: 'history', label: 'History' }
  ]

  const userEmail = session.user.email || ''
  const userInitial = userEmail.charAt(0).toUpperCase() || 'U'

  function DayModePicker({ value, onChange }) {
    const options = [
      { id: 'fixed', label: 'Specific day' },
      { id: 'first', label: 'First day' },
      { id: 'last', label: 'Last day' }
    ]
    return (
      <div className="radio-group">
        {options.map(o => (
          <label key={o.id} className={`radio-option ${value === o.id ? 'active' : ''}`}>
            <input type="radio" checked={value === o.id} onChange={() => onChange(o.id)} />
            {o.label}
          </label>
        ))}
      </div>
    )
  }

  function budgetState(pct) {
    if (pct >= 100) return 'over'
    if (pct >= 80) return 'warn'
    return 'ok'
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo">L</div>
          <div className="name">Ledger <span>Income, expenses & recurring bills</span></div>
        </div>

        <nav className="sidebar-nav">
          {TABS.map(t => {
            const TabIcon = TAB_ICONS[t.id]
            return (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                <span className="nav-icon"><TabIcon size={16} strokeWidth={2} /></span>
                <span>{t.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-account">
          <div className="account-info">
            <div className="avatar">{userInitial}</div>
            <div className="account-text">
              <div className="account-email" title={userEmail}>{userEmail}</div>
              <div className="account-sub">Signed in</div>
            </div>
          </div>
          <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
            <LogOut size={14} strokeWidth={2} /> Log out
          </button>
        </div>
      </aside>

      <header className="mobile-topbar">
        <div className="mobile-topbar-left">
          <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <Menu size={20} strokeWidth={2} />
          </button>
          <div className="brand">
            <div className="logo">L</div>
            <div className="name">Ledger</div>
          </div>
        </div>
        <button className="logout-icon-btn" onClick={() => supabase.auth.signOut()} aria-label="Log out">
          <LogOut size={18} strokeWidth={2} />
        </button>
      </header>

      <div className={`mobile-drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)}></div>

      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="brand">
            <div className="logo">L</div>
            <div className="name">Ledger</div>
          </div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {TABS.map(t => {
            const TabIcon = TAB_ICONS[t.id]
            return (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => goToTab(t.id)}>
                <span className="nav-icon"><TabIcon size={16} strokeWidth={2} /></span>
                <span>{t.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-account">
          <div className="account-info">
            <div className="avatar">{userInitial}</div>
            <div className="account-text">
              <div className="account-email" title={userEmail}>{userEmail}</div>
              <div className="account-sub">Signed in</div>
            </div>
          </div>
          <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
            <LogOut size={14} strokeWidth={2} /> Log out
          </button>
        </div>
      </div>

      <main className="main-content">
        {tab === 'overview' && (
          <div className="tab-panel">
            <div className="hero">
              <div className="card balance-card">
                <div className="lbl">Total balance</div>
                <div className="amt"><span className="rs">₹</span>{Math.round(totalBalance).toLocaleString('en-IN')}</div>
                <div className="balance-row">
                  <div className="mini"><div className="k">This month in</div><div className="v in">{fmt(monthIn)}</div></div>
                  <div className="mini"><div className="k">This month out</div><div className="v out">{fmt(monthOut)}</div></div>
                  <div className="mini"><div className="k">Left to spend</div><div className="v">{fmt(leftToSpend)}</div></div>
                </div>
                {upcomingRecurringSum > 0 && (
                  <p className="balance-note">Already holds back {fmt(upcomingRecurringSum)} for recurring bills that haven't been charged yet, so this number is what's genuinely free to spend.</p>
                )}

                <div className="ef-widget">
                  <div className="ef-widget-top">
                    <span className="lbl">Emergency fund</span>
                    <span className="months">{efMonthsCovered.toFixed(1)} / {efTargetMonths} months</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${efProgressPct}%` }}></div></div>
                  <div className="progress-caption"><b>{fmt(efBalance)}</b> saved toward {fmt(efTargetAmount)} target</div>
                </div>
              </div>
              <div className="card reserve-card">
                <div className="lbl">Keep aside for early bills</div>
                <div className="amt">{fmt(reserve)}</div>
                <p>{reserveNote}</p>
              </div>
            </div>

            <div className="section">
              <div className="grid-2">
                <div className="card safe-spend-card">
                  <div className="lbl">Safe to spend today</div>
                  <div className="amt">{fmt(safeToSpendToday)}</div>
                  <p>What's left this month, minus every bill still due (one-time or recurring), spread across the {daysLeftInMonth} days remaining.</p>
                </div>
                <div className="card balance-card">
                  <div className="lbl">Net worth</div>
                  <div className="amt">{fmt(netWorth)}</div>
                  <div className="networth-grid" style={{ marginTop: 14, gridTemplateColumns: 'repeat(3,1fr)' }}>
                    <div className="networth-item"><div className="k">Bank</div><div className="v">{fmt(totalBalance)}</div></div>
                    <div className="networth-item"><div className="k">Investments</div><div className="v">{fmt(investmentsTotal)}</div></div>
                    <div className="networth-item"><div className="k">Emergency</div><div className="v">{fmt(efBalance)}</div></div>
                  </div>
                  <p className="balance-note">As you spend, this drops right along with your bank balance, it's not a separate pot.</p>
                </div>
              </div>
            </div>

            {upcoming.length > 0 && (
              <div className="section">
                <div className="section-head"><h2>Coming up</h2><span className="hint">Scheduled & upcoming recurring</span></div>
                <div className="card list-card">
                  {upcoming.map((x, i) => (
                    <div className="list-row upcoming-row" key={i}>
                      <div className="left">
                        <div className="icon-dot"><CategoryIcon category={x.category} /></div>
                        <div>
                          <div className="desc">{x.desc} <span className={`badge ${x.kind === 'scheduled' ? 'scheduled' : 'upcoming'}`}>{x.kind === 'scheduled' ? 'scheduled' : 'upcoming'}</span></div>
                          <div className="meta">{x.date} · {x.category}</div>
                        </div>
                      </div>
                      <div className="amt out">− {fmt(x.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="section">
              <div className="grid-2">
                <div className="card">
                  <div className="section-head" style={{ margin: 0, marginBottom: 6 }}><h2 style={{ fontSize: 15 }}>Income vs. expenses</h2></div>
                  <div className="chart-box"><canvas ref={chartRef}></canvas></div>
                </div>
                <div className="card" style={{ padding: 0 }}>
                  <div className="section-head" style={{ margin: '18px 24px 0' }}><h2 style={{ fontSize: 15 }}>Where it went this month</h2></div>
                  <div className="chart-box short" style={{ height: 160, padding: '10px 24px 0' }}><canvas ref={donutRef}></canvas></div>
                  {Object.keys(CATEGORY_COLORS).filter(c => categorySpent(c) > 0).length === 0
                    ? <div className="empty">No expenses logged yet this month.</div>
                    : (
                      <div className="donut-legend">
                        {Object.keys(CATEGORY_COLORS).filter(c => categorySpent(c) > 0).sort((a, b) => categorySpent(b) - categorySpent(a)).map(c => (
                          <div className="donut-legend-row" key={c}>
                            <span className="donut-legend-left"><span className="donut-swatch" style={{ background: CATEGORY_COLORS[c] }}></span>{c}</span>
                            <span className="val">{fmt(categorySpent(c))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-head"><h2>Recent activity</h2><span className="hint">Latest 8</span></div>
              <div className="card list-card">
                {activity.length === 0 && <div className="empty">No activity yet — add income or an expense to get started.</div>}
                {activity.map((x, i) => (
                  <div className="list-row" key={i}>
                    <div className="left">
                      <div className={`icon-dot ${x.type}`}><CategoryIcon category={x.category} /></div>
                      <div>
                        <div className="desc">{x.desc}{x.auto && <span className="badge auto">auto</span>}</div>
                        <div className="meta">{x.date} · {x.category}</div>
                      </div>
                    </div>
                    <div className={`amt ${x.type}`}>{x.type === 'in' ? '+' : '−'} {fmt(x.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'salary' && (
          <div className="tab-panel">
            <div className="section" style={{ marginTop: 20 }}>
              <div className="grid-2">
                <div className="card form-card">
                  <h3>Add income</h3>
                  <form onSubmit={addSalary}>
                    <label>Amount received</label>
                    <input type="number" placeholder="e.g. 108000" min="1" value={salAmount} onChange={e => setSalAmount(e.target.value)} required />
                    <div className="form-row">
                      <div>
                        <label>Date received</label>
                        <input type="date" value={salDate} onChange={e => setSalDate(e.target.value)} required />
                      </div>
                      <div>
                        <label>For month</label>
                        <input type="month" value={salForMonth} onChange={e => setSalForMonth(e.target.value)} required />
                      </div>
                    </div>
                    <label>Note (optional)</label>
                    <input type="text" placeholder="e.g. Exemplifi salary" value={salNote} onChange={e => setSalNote(e.target.value)} />
                    <button type="submit" className="submit-btn">Add income</button>
                    <p className="form-note">Since your pay date isn't fixed, tag it for the month you're budgeting it against, not just the calendar date it landed.</p>
                  </form>
                </div>
                <div className="card list-card" style={{ alignSelf: 'start' }}>
                  {sortedSalaries.length === 0 && <div className="empty">No income entries yet.</div>}
                  {sortedSalaries.map(s => (
                    <div className="list-row" key={s.id}>
                      <div className="left">
                        <div className="icon-dot in"><Wallet size={16} strokeWidth={2} /></div>
                        <div>
                          <div className="desc">{s.note || 'Income'}</div>
                          <div className="meta">For {monthLabel(s.for_month)} · received {s.date}</div>
                        </div>
                      </div>
                      <div className="row-actions">
                        <div className="amt in">+ {fmt(s.amount)}</div>
                        <button className="del-btn" onClick={() => deleteSalary(s.id)}><X size={14} strokeWidth={2} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'expenses' && (
          <div className="tab-panel">
            <div className="section" style={{ marginTop: 20 }}>
              <div className="grid-2">
                <div className="card form-card">
                  <h3>Add expense</h3>
                  <form onSubmit={addExpense}>
                    <label>Amount</label>
                    <input type="number" placeholder="e.g. 3140" min="1" value={expAmount} onChange={e => setExpAmount(e.target.value)} required />
                    <div className="form-row">
                      <div>
                        <label>Category</label>
                        <select value={expCategory} onChange={e => setExpCategory(e.target.value)}>
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Date</label>
                        <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} required disabled={expIsRecurring} />
                      </div>
                    </div>
                    <label>Description</label>
                    <input type="text" placeholder="e.g. Big Basket groceries" value={expDesc} onChange={e => setExpDesc(e.target.value)} />
                    {!expIsRecurring && expDate > today && (
                      <p className="form-note">This is a future date, so it'll show as Scheduled and won't count in "this month out" until it arrives, but it's already subtracted from your available balance.</p>
                    )}
                    <div className="check-row">
                      <input type="checkbox" id="expRecurring" checked={expIsRecurring} onChange={e => setExpIsRecurring(e.target.checked)} />
                      <label htmlFor="expRecurring">Make this a repeating monthly expense</label>
                    </div>
                    {expIsRecurring && (
                      <>
                        <label>Repeats on</label>
                        <DayModePicker value={expDayMode} onChange={setExpDayMode} />
                        {expDayMode === 'fixed' && (
                          <input type="number" min="1" max="28" placeholder="e.g. 1 for rent" value={expRecurDay} onChange={e => setExpRecurDay(e.target.value)} style={{ marginTop: 10 }} />
                        )}
                        <p className="form-note">This will auto-post every month from now on, and until it does, its next due amount is already held back from your Available balance and Net worth.</p>
                      </>
                    )}
                    <button type="submit" className="submit-btn">Add expense</button>
                  </form>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span className="hint" style={{ fontSize: 12.5, color: 'var(--muted)' }}>Showing</span>
                    <select className="month-filter" value={expMonthFilter} onChange={e => setExpMonthFilter(e.target.value)}>
                      {expMonths.map(mk => <option key={mk} value={mk}>{monthLabel(mk)}</option>)}
                    </select>
                  </div>
                  <div className="card list-card">
                    {filteredExpenses.length === 0 && <div className="empty">No expenses logged for this month.</div>}
                    {filteredExpenses.map(e => (
                      <div className="list-row" key={e.id}>
                        <div className="left">
                          <div className="icon-dot out"><CategoryIcon category={e.category} /></div>
                          <div>
                            <div className="desc">
                              {e.description}
                              {e.is_auto && <span className="badge auto">auto</span>}
                              {!e.is_auto && e.date > today && <span className="badge scheduled">scheduled</span>}
                            </div>
                            <div className="meta">{e.date} · {e.category}</div>
                          </div>
                        </div>
                        <div className="row-actions">
                          <div className="amt out">− {fmt(e.amount)}</div>
                          <button className="del-btn" onClick={() => deleteExpense(e.id)}><X size={14} strokeWidth={2} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'recurring' && (
          <div className="tab-panel">
            <div className="section" style={{ marginTop: 20 }}>
              <div className="card" style={{ background: 'var(--accent-soft)', borderColor: '#E7D6A8', padding: '16px 20px' }}>
                <p style={{ margin: 0, fontSize: 12.5, color: '#7A5D24', lineHeight: 1.6 }}>
                  Rules due on or before the <b>5th</b> are flagged automatically — since your income can land anywhere between the 1st and the 4th, these are effectively funded by <b>last month's</b> income. Keep that buffer in mind before spending the new one.
                </p>
              </div>
            </div>
            <div className="section">
              <div className="grid-2">
                <div className="card form-card">
                  <h3>New recurring rule</h3>
                  <form onSubmit={addRecurring}>
                    <label>Name</label>
                    <input type="text" placeholder="e.g. Rent" value={recName} onChange={e => setRecName(e.target.value)} required />
                    <label>Amount</label>
                    <input type="number" min="1" value={recAmount} onChange={e => setRecAmount(e.target.value)} required />
                    <label>Repeats on</label>
                    <DayModePicker value={recDayMode} onChange={setRecDayMode} />
                    {recDayMode === 'fixed' && (
                      <input type="number" min="1" max="28" placeholder="e.g. 1 for rent" value={recDay} onChange={e => setRecDay(e.target.value)} style={{ marginTop: 10 }} required />
                    )}
                    <div className="form-row">
                      <div>
                        <label>Category</label>
                        <select value={recCategory} onChange={e => setRecCategory(e.target.value)}>
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Start month</label>
                        <input type="month" value={recStartMonth} onChange={e => setRecStartMonth(e.target.value)} required />
                      </div>
                    </div>
                    {recStartMonth > curMonth && (
                      <p className="form-note">This won't start posting until {monthLabel(recStartMonth)} — it'll show as Upcoming until then.</p>
                    )}
                    <button type="submit" className="submit-btn">Add rule</button>
                  </form>
                </div>
                <div className="card list-card">
                  {sortedRecurring.length === 0 && <div className="empty">No recurring rules yet. Add rent or a subscription to auto-post it every month.</div>}
                  {sortedRecurring.map(r => (
                    <div className="list-row" key={r.id}>
                      <div className="left">
                        <div className="icon-dot out"><CategoryIcon category={r.category} /></div>
                        <div>
                          <div className="desc">
                            {r.name}
                            {effectiveDueDay(r, now.getFullYear(), now.getMonth()) <= 5 && <span className="badge auto">early</span>}
                            {r.start_month > curMonth && <span className="badge upcoming">upcoming</span>}
                            {!r.active && <span className="badge paused">paused</span>}
                          </div>
                          <div className="meta">
                            {dayModeLabel(r)} of every month · {r.category}
                            {r.start_month > curMonth && ` · starts ${monthLabel(r.start_month)}`}
                          </div>
                        </div>
                      </div>
                      <div className="row-actions">
                        <div className="amt out">{fmt(r.amount)}</div>
                        <button className="del-btn" onClick={() => toggleRecurring(r.id, r.active)} title={r.active ? 'Pause' : 'Resume'}>
                          {r.active ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
                        </button>
                        <button className="del-btn" onClick={() => deleteRecurring(r.id)}><X size={14} strokeWidth={2} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'budgets' && (
          <div className="tab-panel">
            <div className="section" style={{ marginTop: 20 }}>
              <div className="grid-2">
                <div className="card form-card">
                  <h3>Set a budget</h3>
                  <form onSubmit={addBudget}>
                    <label>Category</label>
                    <select value={budgetCategory} onChange={e => setBudgetCategory(e.target.value)}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <label>Monthly limit</label>
                    <input type="number" min="1" placeholder="e.g. 4000" value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)} required />
                    <button type="submit" className="submit-btn">Save limit</button>
                    <p className="form-note">Setting a limit for a category that already has one updates it instead of duplicating.</p>
                  </form>
                </div>
                <div className="card" style={{ padding: 0 }}>
                  {sortedBudgets.length === 0 && <div className="empty">No budgets set yet. Pick a category and give it a monthly cap.</div>}
                  {sortedBudgets.map(b => {
                    const spent = categorySpent(b.category)
                    const pct = Math.min(100, (spent / b.monthly_limit) * 100)
                    const state = budgetState((spent / b.monthly_limit) * 100)
                    return (
                      <div className="budget-row" key={b.id}>
                        <div className="budget-row-top">
                          <span className="budget-cat"><CategoryIcon category={b.category} size={14} /> {b.category}
                            <button className="del-btn budget-del" onClick={() => deleteBudget(b.id)}><X size={13} strokeWidth={2} /></button>
                          </span>
                          <span className="budget-nums"><b>{fmt(spent)}</b> / {fmt(b.monthly_limit)}</span>
                        </div>
                        <div className="budget-bar"><div className={`budget-bar-fill ${state}`} style={{ width: `${pct}%` }}></div></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'emergency' && (
          <div className="tab-panel">
            <div className="section" style={{ marginTop: 20 }}>
              <div className="card ef-hero">
                <div className="lbl">Emergency fund</div>
                <div className="amt">{fmt(efBalance)}</div>
                <div className="target-line">Target: <b>{fmt(efTargetAmount)}</b> ({efTargetMonths} months of your average spend, {fmt(avgMonthlyExpense)}/mo)</div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${efProgressPct}%` }}></div></div>
                <div className="progress-caption"><b>{efMonthsCovered.toFixed(1)} months</b> covered · {efProgressPct.toFixed(0)}% of target</div>

                <div className="target-editor">
                  <label>Target</label>
                  <input type="number" min="1" max="24" value={efTargetMonths} onChange={e => updateTargetMonths(Number(e.target.value))} />
                  <span>months of expenses</span>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="grid-2">
                <div className="card form-card">
                  <h3>Add entry</h3>
                  <form onSubmit={addEfEntry}>
                    <label>Type</label>
                    <div className="type-toggle">
                      <label className={efType === 'contribution' ? 'active-in' : ''}>
                        <input type="radio" checked={efType === 'contribution'} onChange={() => setEfType('contribution')} />
                        Contribution
                      </label>
                      <label className={efType === 'withdrawal' ? 'active-out' : ''}>
                        <input type="radio" checked={efType === 'withdrawal'} onChange={() => setEfType('withdrawal')} />
                        Withdrawal
                      </label>
                    </div>
                    <label>Amount</label>
                    <input type="number" min="1" value={efAmount} onChange={e => setEfAmount(e.target.value)} required />
                    <label>Date</label>
                    <input type="date" value={efDate} onChange={e => setEfDate(e.target.value)} required />
                    <label>Note (optional)</label>
                    <input type="text" placeholder="e.g. Moved from this month's savings" value={efNote} onChange={e => setEfNote(e.target.value)} />
                    <button type="submit" className="submit-btn">Add entry</button>
                    <p className="form-note">This is tracked separately from your expenses, setting money aside here doesn't count as spending.</p>
                  </form>
                </div>
                <div className="card list-card" style={{ alignSelf: 'start' }}>
                  {sortedEf.length === 0 && <div className="empty">No entries yet. Log your first contribution to start building your buffer.</div>}
                  {sortedEf.map(e => (
                    <div className="list-row" key={e.id}>
                      <div className="left">
                        <div className={`icon-dot ${e.type === 'contribution' ? 'in' : 'out'}`}><Shield size={16} strokeWidth={2} /></div>
                        <div>
                          <div className="desc">{e.note || (e.type === 'contribution' ? 'Contribution' : 'Withdrawal')}</div>
                          <div className="meta">{e.date}</div>
                        </div>
                      </div>
                      <div className="row-actions">
                        <div className={`amt ${e.type === 'contribution' ? 'in' : 'out'}`}>{e.type === 'contribution' ? '+' : '−'} {fmt(e.amount)}</div>
                        <button className="del-btn" onClick={() => deleteEfEntry(e.id)}><X size={14} strokeWidth={2} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'investments' && (
          <div className="tab-panel">
            <div className="section" style={{ marginTop: 20 }}>
              <div className="card balance-card">
                <div className="lbl">Net worth</div>
                <div className="amt">{fmt(netWorth)}</div>
                <div className="networth-grid" style={{ marginTop: 14, gridTemplateColumns: 'repeat(3,1fr)' }}>
                  <div className="networth-item"><div className="k">Bank</div><div className="v">{fmt(totalBalance)}</div></div>
                  <div className="networth-item"><div className="k">Investments</div><div className="v">{fmt(investmentsTotal)}</div></div>
                  <div className="networth-item"><div className="k">Emergency fund</div><div className="v">{fmt(efBalance)}</div></div>
                </div>
                {Object.keys(invByCategory).length > 0 && (
                  <div className="donut-legend" style={{ padding: '18px 0 0' }}>
                    {Object.entries(invByCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                      <div className="donut-legend-row" key={cat}>
                        <span className="donut-legend-left"><span className="donut-swatch" style={{ background: CATEGORY_COLORS[cat] || 'var(--primary)' }}></span>{cat}</span>
                        <span className="val">{fmt(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="section">
              <div className="grid-2">
                <div className="card form-card">
                  <h3>Add investment entry</h3>
                  <form onSubmit={addInvestment}>
                    <label>Name</label>
                    <input type="text" placeholder="e.g. Nifty Index Fund SIP" value={invName} onChange={e => setInvName(e.target.value)} required />
                    <div className="form-row">
                      <div>
                        <label>Category</label>
                        <select value={invCategory} onChange={e => setInvCategory(e.target.value)}>
                          {INVESTMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Amount</label>
                        <input type="number" min="1" value={invAmount} onChange={e => setInvAmount(e.target.value)} required />
                      </div>
                    </div>
                    <label>Type</label>
                    <div className="type-toggle">
                      <label className={invType === 'contribution' ? 'active-in' : ''}>
                        <input type="radio" checked={invType === 'contribution'} onChange={() => setInvType('contribution')} />
                        Added
                      </label>
                      <label className={invType === 'withdrawal' ? 'active-out' : ''}>
                        <input type="radio" checked={invType === 'withdrawal'} onChange={() => setInvType('withdrawal')} />
                        Withdrawn
                      </label>
                    </div>
                    <label>Date</label>
                    <input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} required />
                    <label>Note (optional)</label>
                    <input type="text" placeholder="e.g. Monthly SIP" value={invNote} onChange={e => setInvNote(e.target.value)} />
                    <button type="submit" className="submit-btn">Add entry</button>
                    <p className="form-note">This tracks money in and out, not live market value, so treat the totals as your invested amount, not current worth.</p>
                  </form>
                </div>
                <div className="card list-card" style={{ alignSelf: 'start' }}>
                  {sortedInvestments.length === 0 && <div className="empty">No investment entries yet.</div>}
                  {sortedInvestments.map(i => (
                    <div className="list-row" key={i.id}>
                      <div className="left">
                        <div className={`icon-dot ${i.type === 'contribution' ? 'in' : 'out'}`}><TrendingUp size={16} strokeWidth={2} /></div>
                        <div>
                          <div className="desc">{i.name}</div>
                          <div className="meta">{i.date} · {i.category}</div>
                        </div>
                      </div>
                      <div className="row-actions">
                        <div className={`amt ${i.type === 'contribution' ? 'in' : 'out'}`}>{i.type === 'contribution' ? '+' : '−'} {fmt(i.amount)}</div>
                        <button className="del-btn" onClick={() => deleteInvestment(i.id)}><X size={14} strokeWidth={2} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'savings' && (
          <div className="tab-panel">
            <div className="section" style={{ marginTop: 20 }}>
              <div className="card balance-card">
                <div className="lbl">Available savings</div>
                <div className="amt">{fmt(availableSavings)}</div>
                {incomeCoverageShortfall > 0 ? (
                  <p className="balance-note">{fmt(incomeCoverageShortfall)} is being covered from savings because the expenses that are due are not fully covered by recorded income.</p>
                ) : (
                  <p className="balance-note">Future recurring expenses stay untouched until their due date. Once an expense is due, only the amount not covered by that month's income is taken from savings.</p>
                )}
              </div>
            </div>

            <div className="section">
              <div className="grid-2">
                <div className="card form-card">
                  <h3>Add savings</h3>
                  <form onSubmit={addSavings}>
                    <label>Current amount</label>
                    <input type="number" min="0" placeholder="e.g. 50000" value={savingsAmount} onChange={e => setSavingsAmount(e.target.value)} required />
                    <label>Date</label>
                    <input type="date" value={savingsDate} onChange={e => setSavingsDate(e.target.value)} required />
                    <label>Note (optional)</label>
                    <input type="text" placeholder="e.g. Savings as of August" value={savingsNote} onChange={e => setSavingsNote(e.target.value)} />
                    <button type="submit" className="submit-btn">Add savings</button>
                    <p className="form-note">Each entry is added to your total savings. Use a new entry when you add more money to savings.</p>
                  </form>
                </div>

                <div className="card list-card" style={{ alignSelf: 'start' }}>
                  {sortedSavings.length === 0 && <div className="empty">No savings recorded yet. Add your current savings amount to get started.</div>}
                  {sortedSavings.map(s => (
                    <div className="list-row" key={s.id}>
                      <div className="left">
                        <div className="icon-dot in"><PiggyBank size={16} strokeWidth={2} /></div>
                        <div>
                          <div className="desc">{s.note || 'Savings balance'}</div>
                          <div className="meta">{s.date}</div>
                        </div>
                      </div>
                      <div className="row-actions">
                        <div className="amt in">{fmt(s.amount)}</div>
                        <button className="del-btn" onClick={() => deleteSavings(s.id)}><X size={14} strokeWidth={2} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="tab-panel">
            <div className="section" style={{ marginTop: 20 }}>
              <div className="section-head"><h2>Past months</h2><span className="hint">{allMonths.length} month{allMonths.length === 1 ? '' : 's'} on record</span></div>
              <div className="card history-card">
                {allMonths.length === 0 && <div className="empty">Nothing recorded yet, once you add income or an expense it'll show up here.</div>}
                {allMonths.map(mk => {
                  const inc = monthIncomeFor(mk)
                  const out = monthExpenseFor(mk)
                  const items = monthActivity(mk)
                  const isOpen = expandedMonth === mk
                  return (
                    <div className="month-block" key={mk}>
                      <button className="month-header" onClick={() => setExpandedMonth(isOpen ? null : mk)}>
                        <div className="month-header-left">
                          <ChevronDown className={`chevron ${isOpen ? 'open' : ''}`} size={16} strokeWidth={2} />
                          <span className="month-name">{monthLabel(mk)}</span>
                        </div>
                        <div className="month-header-right">
                          <span className="month-stat in">+{fmt(inc)}</span>
                          <span className="month-stat out">−{fmt(out)}</span>
                          <span className="month-stat net">{fmt(inc - out)}</span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="month-detail">
                          {items.length === 0 && <div className="month-empty">No entries this month.</div>}
                          {items.map((x, i) => (
                            <div className="list-row" key={i}>
                              <div className="left">
                                <div className={`icon-dot ${x.type}`}><CategoryIcon category={x.category} /></div>
                                <div>
                                  <div className="desc">
                                    {x.desc}
                                    {x.auto && <span className="badge auto">auto</span>}
                                    {x.future && <span className="badge scheduled">scheduled</span>}
                                  </div>
                                  <div className="meta">{x.date} · {x.category}</div>
                                </div>
                              </div>
                              <div className={`amt ${x.type}`}>{x.type === 'in' ? '+' : '−'} {fmt(x.amount)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <footer>Ledger — your data, saved to your account, visible only to you.</footer>
      </main>
    </div>
  )
}