import { defineStore } from 'pinia'
import { createSupabaseClient } from '../supabase'
import { useAuthStore } from './auth'

export type Player = {
  id: string
  name: string
  sortOrder: number
  colorKey: PlayerColorKey
  avatarUrl: string | null
  score: number
}

export type Ball = 3 | 6 | 9

export type PlayerColorKey = 'violet' | 'indigo' | 'cyan' | 'teal' | 'lime' | 'yellow' | 'orange' | 'rose'

export const PLAYER_COLOR_OPTIONS: Array<{
  key: PlayerColorKey
  label: string
  hex: string
  cardClass: string
  headerClass: string
}> = [
  {
    key: 'violet',
    label: 'Tím / Hồng',
    hex: '#A855F7',
    cardClass: 'border-violet-400/40 bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15',
    headerClass: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
  },
  {
    key: 'indigo',
    label: 'Indigo',
    hex: '#818CF8',
    cardClass: 'border-indigo-400/40 bg-gradient-to-br from-indigo-500/20 to-sky-500/10',
    headerClass: 'bg-gradient-to-r from-indigo-400 to-sky-500',
  },
  {
    key: 'cyan',
    label: 'Cyan',
    hex: '#22D3EE',
    cardClass: 'border-cyan-400/40 bg-gradient-to-br from-cyan-500/20 to-sky-500/10',
    headerClass: 'bg-gradient-to-r from-cyan-400 to-sky-500',
  },
  {
    key: 'teal',
    label: 'Teal',
    hex: '#2DD4BF',
    cardClass: 'border-teal-400/40 bg-gradient-to-br from-teal-400/20 to-cyan-500/10',
    headerClass: 'bg-gradient-to-r from-teal-400 to-cyan-400',
  },
  {
    key: 'lime',
    label: 'Lime',
    hex: '#A3E635',
    cardClass: 'border-lime-400/40 bg-gradient-to-br from-lime-400/20 to-emerald-500/10',
    headerClass: 'bg-gradient-to-r from-lime-400 to-emerald-500',
  },
  {
    key: 'yellow',
    label: 'Vàng',
    hex: '#FDE047',
    cardClass: 'border-yellow-300/40 bg-gradient-to-br from-yellow-300/20 to-amber-500/10',
    headerClass: 'bg-gradient-to-r from-yellow-300 to-amber-400',
  },
  {
    key: 'orange',
    label: 'Cam',
    hex: '#FB923C',
    cardClass: 'border-orange-400/40 bg-gradient-to-br from-orange-500/20 to-amber-500/10',
    headerClass: 'bg-gradient-to-r from-orange-400 to-amber-500',
  },
  {
    key: 'rose',
    label: 'Rose',
    hex: '#FB7185',
    cardClass: 'border-rose-400/40 bg-gradient-to-br from-rose-500/20 to-pink-500/10',
    headerClass: 'bg-gradient-to-r from-rose-400 to-pink-500',
  },
]

export type ScoreEvent = {
  seq: number
  actorPlayerId: string
  targetPlayerId: string
  ball: Ball
  value: number
  createdAt: number
  isDeleted: boolean
}

export type Board = {
  cursor: number
  players: Player[]
  history: ScoreEvent[]
}

type BoardPayload = {
  cursor: number
  players: Array<{
    id: string
    name: string
    sortOrder: number
    colorKey: PlayerColorKey
    avatarUrl: string | null
    score: number
  }>
  history: Array<{
    seq: number
    actorPlayerId: string
    targetPlayerId: string
    ball: Ball
    value: number
    createdAt: string | number
    isDeleted?: boolean
  }>
}

type PendingAction =
  | {
      type: 'apply_event'
      id: string
      ts: number
      actorPlayerId: string
      targetPlayerId: string
      ball: Ball
    }
  | {
      type: 'undo'
      id: string
      ts: number
    }
  | {
      type: 'redo'
      id: string
      ts: number
    }

function toTs(v: string | number) {
  if (typeof v === 'number') return v
  const t = Date.parse(v)
  return Number.isFinite(t) ? t : Date.now()
}

function normalizeBoard(payload: BoardPayload | null): Board {
  if (!payload) return { cursor: 0, players: [], history: [] }
  return {
    cursor: payload.cursor ?? 0,
    players: (payload.players ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      sortOrder: p.sortOrder,
      colorKey: p.colorKey,
      avatarUrl: p.avatarUrl ?? null,
      score: p.score ?? 0,
    })),
    history: (payload.history ?? [])
      .map((e) => ({
        seq: e.seq,
        actorPlayerId: e.actorPlayerId,
        targetPlayerId: e.targetPlayerId,
        ball: e.ball,
        value: e.value,
        createdAt: toTs(e.createdAt),
        isDeleted: Boolean(e.isDeleted),
      }))
      .sort((a, b) => a.seq - b.seq),
  }
}

const LS_SNAPSHOT_PREFIX = 'ban_den_board_snapshot_v1:'
const LS_PENDING_PREFIX = 'ban_den_board_pending_v1:'

function snapshotKey(userId: string) {
  return `${LS_SNAPSHOT_PREFIX}${userId}`
}

function pendingKey(userId: string) {
  return `${LS_PENDING_PREFIX}${userId}`
}

function safeParseJson(raw: string | null) {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function isBall(v: unknown): v is Ball {
  return v === 3 || v === 6 || v === 9
}

function valueOfBall(ball: Ball) {
  if (ball === 3) return 1
  if (ball === 6) return 2
  return 3
}

function normalizeSnapshot(v: unknown): Board | null {
  if (!v || typeof v !== 'object') return null
  const anyV = v as { cursor?: unknown; players?: unknown; history?: unknown }
  const cursor = typeof anyV.cursor === 'number' && Number.isFinite(anyV.cursor) ? anyV.cursor : 0
  const playersSrc = Array.isArray(anyV.players) ? anyV.players : []
  const historySrc = Array.isArray(anyV.history) ? anyV.history : []

  const players: Player[] = playersSrc
    .map((p) => {
      if (!p || typeof p !== 'object') return null
      const anyP = p as {
        id?: unknown
        name?: unknown
        sortOrder?: unknown
        colorKey?: unknown
        avatarUrl?: unknown
        score?: unknown
      }
      if (typeof anyP.id !== 'string') return null
      const name = typeof anyP.name === 'string' ? anyP.name : ''
      const sortOrder = typeof anyP.sortOrder === 'number' && Number.isFinite(anyP.sortOrder) ? anyP.sortOrder : 0
      const colorKey = typeof anyP.colorKey === 'string' ? (anyP.colorKey as PlayerColorKey) : 'violet'
      const avatarUrl = typeof anyP.avatarUrl === 'string' ? anyP.avatarUrl : null
      const score = typeof anyP.score === 'number' && Number.isFinite(anyP.score) ? anyP.score : 0
      return { id: anyP.id, name, sortOrder, colorKey, avatarUrl, score }
    })
    .filter((x): x is Player => Boolean(x))

  const history: ScoreEvent[] = historySrc
    .map((e) => {
      if (!e || typeof e !== 'object') return null
      const anyE = e as {
        seq?: unknown
        actorPlayerId?: unknown
        targetPlayerId?: unknown
        ball?: unknown
        value?: unknown
        createdAt?: unknown
        isDeleted?: unknown
      }
      if (typeof anyE.seq !== 'number' || !Number.isFinite(anyE.seq)) return null
      if (typeof anyE.actorPlayerId !== 'string') return null
      if (typeof anyE.targetPlayerId !== 'string') return null
      if (!isBall(anyE.ball)) return null
      const value = typeof anyE.value === 'number' && Number.isFinite(anyE.value) ? anyE.value : valueOfBall(anyE.ball)
      const createdAt =
        typeof anyE.createdAt === 'number' && Number.isFinite(anyE.createdAt) ? anyE.createdAt : Date.now()
      const isDeleted = Boolean(anyE.isDeleted)
      return {
        seq: anyE.seq,
        actorPlayerId: anyE.actorPlayerId,
        targetPlayerId: anyE.targetPlayerId,
        ball: anyE.ball,
        value,
        createdAt,
        isDeleted,
      }
    })
    .filter((x): x is ScoreEvent => Boolean(x))
    .sort((a, b) => a.seq - b.seq)

  return { cursor, players, history }
}

function normalizePending(v: unknown): PendingAction[] {
  if (!Array.isArray(v)) return []
  const out: PendingAction[] = []
  for (const x of v) {
    if (!x || typeof x !== 'object') continue
    const anyX = x as {
      id?: unknown
      ts?: unknown
      type?: unknown
      actorPlayerId?: unknown
      targetPlayerId?: unknown
      ball?: unknown
    }
    if (typeof anyX.id !== 'string') continue
    if (typeof anyX.ts !== 'number' || !Number.isFinite(anyX.ts)) continue
    const t = typeof anyX.type === 'string' ? anyX.type : null
    if (t === 'undo' || t === 'redo') {
      out.push({ type: t, id: anyX.id, ts: anyX.ts })
      continue
    }
    if (typeof anyX.actorPlayerId !== 'string') continue
    if (typeof anyX.targetPlayerId !== 'string') continue
    if (!isBall(anyX.ball)) continue
    out.push({
      type: 'apply_event',
      id: anyX.id,
      ts: anyX.ts,
      actorPlayerId: anyX.actorPlayerId,
      targetPlayerId: anyX.targetPlayerId,
      ball: anyX.ball,
    })
  }
  out.sort((a, b) => a.ts - b.ts)
  return out
}

function nextSeq(board: Board) {
  const maxHistory = board.history.reduce((m, e) => (e.seq > m ? e.seq : m), 0)
  const maxSeq = Math.max(board.cursor ?? 0, maxHistory)
  return maxSeq + 1
}

function cloneBoard(board: Board): Board {
  return {
    cursor: board.cursor,
    players: board.players.map((p) => ({ ...p })),
    history: board.history.map((e) => ({ ...e })),
  }
}

function applyUndoToBoard(board: Board): Board {
  const b = cloneBoard(board)
  const cursor = b.cursor ?? 0
  if (cursor <= 0) return b

  const curEvent = b.history.find((e) => e.seq === cursor && !e.isDeleted) ?? null

  let prev = 0
  for (const e of b.history) {
    if (!e.isDeleted && e.seq < cursor && e.seq > prev) prev = e.seq
  }

  if (!curEvent) {
    b.cursor = prev
    return b
  }

  const actorIdx = b.players.findIndex((p) => p.id === curEvent.actorPlayerId)
  const targetIdx = b.players.findIndex((p) => p.id === curEvent.targetPlayerId)
  if (actorIdx >= 0) {
    const actor = b.players[actorIdx]!
    b.players[actorIdx] = { ...actor, score: (actor.score ?? 0) - curEvent.value }
  }
  if (targetIdx >= 0) {
    const target = b.players[targetIdx]!
    b.players[targetIdx] = { ...target, score: (target.score ?? 0) + curEvent.value }
  }

  b.cursor = prev
  return b
}

function applyRedoToBoard(board: Board): Board {
  const b = cloneBoard(board)
  const cursor = b.cursor ?? 0

  let next: ScoreEvent | null = null
  for (const e of b.history) {
    if (e.isDeleted) continue
    if (e.seq <= cursor) continue
    if (!next || e.seq < next.seq) next = e
  }
  if (!next) return b

  const actorIdx = b.players.findIndex((p) => p.id === next.actorPlayerId)
  const targetIdx = b.players.findIndex((p) => p.id === next.targetPlayerId)
  if (actorIdx >= 0) {
    const actor = b.players[actorIdx]!
    b.players[actorIdx] = { ...actor, score: (actor.score ?? 0) + next.value }
  }
  if (targetIdx >= 0) {
    const target = b.players[targetIdx]!
    b.players[targetIdx] = { ...target, score: (target.score ?? 0) - next.value }
  }

  b.cursor = next.seq
  return b
}

function applyEventToBoard(board: Board, op: Extract<PendingAction, { type: 'apply_event' }>): Board {
  const b = cloneBoard(board)
  const actorIdx = b.players.findIndex((p) => p.id === op.actorPlayerId)
  const targetIdx = b.players.findIndex((p) => p.id === op.targetPlayerId)
  if (actorIdx < 0 || targetIdx < 0) return b

  if (b.cursor < nextSeq(b) - 1) {
    b.history = b.history.map((e) => (!e.isDeleted && e.seq > b.cursor ? { ...e, isDeleted: true } : e))
  }

  const seq = nextSeq(b)
  const value = valueOfBall(op.ball)

  b.history = b.history.concat({
    seq,
    actorPlayerId: op.actorPlayerId,
    targetPlayerId: op.targetPlayerId,
    ball: op.ball,
    value,
    createdAt: op.ts,
    isDeleted: false,
  })
  b.cursor = seq

  const actor = b.players[actorIdx]!
  const target = b.players[targetIdx]!
  b.players[actorIdx] = { ...actor, score: (actor.score ?? 0) + value }
  b.players[targetIdx] = { ...target, score: (target.score ?? 0) - value }

  return b
}

function applyActionToBoard(board: Board, action: PendingAction): Board {
  if (action.type === 'undo') return applyUndoToBoard(board)
  if (action.type === 'redo') return applyRedoToBoard(board)
  return applyEventToBoard(board, action)
}

function rebaseBoard(serverBoard: Board, pending: PendingAction[]) {
  let b = cloneBoard(serverBoard)
  for (const action of pending) b = applyActionToBoard(b, action)
  return b
}

let refreshInFlight: Promise<void> | null = null
let mutateChain: Promise<unknown> = Promise.resolve()
let flushInFlight: Promise<void> | null = null
let persistTimer: ReturnType<typeof setTimeout> | null = null

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = mutateChain.then(fn, fn)
  mutateChain = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

export const useBoardStore = defineStore('board', {
  state: () => ({
    loading: false,
    board: null as Board | null,
    error: null as string | null,
    hydrated: false,
    hydratedUserId: null as string | null,
    pendingActions: [] as PendingAction[],
    syncStatus: 'idle' as 'idle' | 'syncing' | 'offline' | 'error',
    syncError: null as string | null,
  }),
  getters: {
    cursorSeq: (state) => state.board?.cursor ?? 0,
    activePlayers: (state) => state.board?.players ?? [],
    canAddPlayer: (state) => (state.board?.players?.length ?? 0) < 4,
    canRedo: (state) => {
      const cursor = state.board?.cursor ?? 0
      return (state.board?.history ?? []).some((e) => !e.isDeleted && e.seq > cursor)
    },
    pendingCount: (state) => state.pendingActions.length,
    scoresByPlayerId(): Record<string, number> {
      const scores: Record<string, number> = {}
      for (const p of this.activePlayers) scores[p.id] = p.score ?? 0
      return scores
    },
    totalScore(): number {
      let t = 0
      for (const p of this.activePlayers) t += this.scoresByPlayerId[p.id] ?? 0
      return t
    },
    history(): Array<ScoreEvent & { applied: boolean }> {
      const cursor = this.cursorSeq
      return (this.board?.history ?? []).map((e) => ({ ...e, applied: !e.isDeleted && e.seq <= cursor }))
    },
  },
  actions: {
    hydrateFromCache() {
      const auth = useAuthStore()
      const userId = auth.userId
      if (!userId) {
        this.hydrated = true
        this.hydratedUserId = null
        this.pendingActions = []
        return
      }
      if (this.hydrated && this.hydratedUserId === userId) return
      if (this.hydratedUserId && this.hydratedUserId !== userId) {
        this.board = null
        this.pendingActions = []
        this.syncStatus = 'idle'
        this.syncError = null
      }
      const snap = normalizeSnapshot(safeParseJson(localStorage.getItem(snapshotKey(userId))))
      const pending = normalizePending(safeParseJson(localStorage.getItem(pendingKey(userId))))
      if (snap && !this.board) this.board = snap
      this.pendingActions = pending
      this.hydrated = true
      this.hydratedUserId = userId
    },
    persistSoon() {
      if (persistTimer) return
      persistTimer = setTimeout(() => {
        persistTimer = null
        this.persistNow()
      }, 250)
    },
    persistNow() {
      const auth = useAuthStore()
      const userId = auth.userId
      if (!userId) return
      try {
        if (this.board) localStorage.setItem(snapshotKey(userId), JSON.stringify(this.board))
      } catch {
        return
      }
      try {
        localStorage.setItem(pendingKey(userId), JSON.stringify(this.pendingActions))
      } catch {
        return
      }
    },
    ensureBoard() {
      if (!this.board) this.board = { cursor: 0, players: [], history: [] }
    },
    updateLocalPlayer(playerId: string, patch: Partial<Player>) {
      if (!this.board) return
      const idx = this.board.players.findIndex((p) => p.id === playerId)
      if (idx < 0) return
      this.board.players[idx] = { ...this.board.players[idx]!, ...patch }
    },
    async refresh() {
      const auth = useAuthStore()
      if (!auth.token) {
        this.board = { cursor: 0, players: [], history: [] }
        this.pendingActions = []
        this.hydrated = false
        this.hydratedUserId = null
        return
      }
      if (!this.hydrated) this.hydrateFromCache()
      if (refreshInFlight) return refreshInFlight
      refreshInFlight = (async () => {
        this.loading = true
        this.error = null
        try {
          const supabase = createSupabaseClient(auth.token)
          const { data, error } = await supabase.rpc('get_board_state')
          if (error) {
            const msg = (error.message ?? '').toLowerCase()
            if (msg.includes('jwt') || msg.includes('token')) auth.logout()
            throw error
          }
          const serverBoard = normalizeBoard(data as BoardPayload | null)
          this.board = this.pendingActions.length ? rebaseBoard(serverBoard, this.pendingActions) : serverBoard
          this.persistSoon()
          if (this.pendingActions.length) void this.flushPending()
        } catch (e) {
          this.error = 'Không tải được dữ liệu.'
        } finally {
          this.loading = false
        }
      })()
      try {
        await refreshInFlight
      } finally {
        refreshInFlight = null
      }
    },
    async addPlayer() {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token || !this.canAddPlayer) return
        type DbPlayer = {
          id: string
          name: string
          sort_order: number
          color_key: PlayerColorKey
          avatar_url: string | null
          deleted_at: string | null
        }
        const supabase = createSupabaseClient(auth.token)
        const { data, error } = await supabase.rpc('create_player')
        if (error) return
        const player = data as DbPlayer | null
        if (!player || player.deleted_at) return
        this.ensureBoard()
        const next: Player = {
          id: player.id,
          name: player.name,
          sortOrder: player.sort_order,
          colorKey: player.color_key,
          avatarUrl: player.avatar_url,
          score: 0,
        }
        this.board!.players = this.board!.players
          .concat(next)
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
        this.persistSoon()
      })
    },
    async patchPlayer(
      playerId: string,
      patch: { name?: string; colorKey?: PlayerColorKey; avatarUrl?: string | null },
    ) {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token) return
        this.ensureBoard()
        const before = this.board!.players.find((p) => p.id === playerId) ?? null
        if (before) {
          const optimistic: Partial<Player> = {}
          if (patch.name !== undefined) optimistic.name = patch.name
          if (patch.colorKey !== undefined) optimistic.colorKey = patch.colorKey
          if (patch.avatarUrl !== undefined) optimistic.avatarUrl = patch.avatarUrl
          this.updateLocalPlayer(playerId, optimistic)
          this.persistSoon()
        }
        try {
          const supabase = createSupabaseClient(auth.token)
          const dbPatch: Record<string, unknown> = {}
          if (patch.name !== undefined) dbPatch.name = patch.name
          if (patch.colorKey !== undefined) dbPatch.color_key = patch.colorKey
          if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl
          const { error } = await supabase.from('players').update(dbPatch).eq('id', playerId).is('deleted_at', null)
          if (error) throw error
        } catch (e) {
          if (before) this.updateLocalPlayer(playerId, before)
          if (before) this.persistSoon()
          throw e
        }
      })
    },
    async renamePlayer(playerId: string, name: string) {
      const n = name.trim()
      if (!n) return
      await this.patchPlayer(playerId, { name: n.slice(0, 24) })
    },
    async setPlayerColor(playerId: string, colorKey: PlayerColorKey) {
      await this.patchPlayer(playerId, { colorKey })
    },
    async setPlayerAvatarUrl(playerId: string, avatarUrl: string | null) {
      await this.patchPlayer(playerId, { avatarUrl })
    },
    setPlayerAvatarLocal(playerId: string, avatarUrl: string | null) {
      this.ensureBoard()
      this.updateLocalPlayer(playerId, { avatarUrl })
      this.persistSoon()
    },
    async deletePlayer(playerId: string) {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token) return
        if (this.pendingActions.length) await this.flushPending()
        if (this.pendingActions.length) return
        const supabase = createSupabaseClient(auth.token)
        const { data, error } = await supabase.rpc('delete_player', { p_player_id: playerId })
        if (error) return
        const serverBoard = normalizeBoard(data as BoardPayload | null)
        this.board = serverBoard
        this.persistSoon()
      })
    },
    async applyEvent(actorPlayerId: string, targetPlayerId: string, ball: Ball) {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token || !auth.userId) return
        this.ensureBoard()
        const action: PendingAction = {
          type: 'apply_event',
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
          actorPlayerId,
          targetPlayerId,
          ball,
        }
        this.pendingActions = this.pendingActions.concat(action)
        this.board = applyActionToBoard(this.board!, action)
        this.syncError = null
        this.persistSoon()
        void this.flushPending()
      })
    },
    async applyMultiBalls(actorPlayerId: string, targetPlayerId: string, balls: Ball[]) {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token || !auth.userId) return
        this.ensureBoard()
        const uniq = Array.from(new Set(balls)).filter((b): b is Ball => b === 3 || b === 6 || b === 9)
        if (!uniq.length) return
        uniq.sort((a, b) => a - b)
        const now = Date.now()
        const actions: Array<Extract<PendingAction, { type: 'apply_event' }>> = uniq.map((ball, i) => ({
          type: 'apply_event',
          id: `${now}_${i}_${Math.random().toString(16).slice(2)}`,
          ts: now + i,
          actorPlayerId,
          targetPlayerId,
          ball,
        }))
        let b = this.board!
        for (const a of actions) b = applyActionToBoard(b, a)
        this.board = b
        this.pendingActions = this.pendingActions.concat(actions)
        this.syncError = null
        this.persistSoon()
        void this.flushPending()
      })
    },
    async applyEventBatch(actorPlayerId: string, targetPlayerIds: string[], ball: Ball) {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token || !auth.userId) return
        this.ensureBoard()
        const now = Date.now()
        const actions: Array<Extract<PendingAction, { type: 'apply_event' }>> = targetPlayerIds.map((targetPlayerId, i) => ({
          type: 'apply_event',
          id: `${now}_${i}_${Math.random().toString(16).slice(2)}`,
          ts: now + i,
          actorPlayerId,
          targetPlayerId,
          ball,
        }))
        let b = this.board!
        for (const a of actions) b = applyActionToBoard(b, a)
        this.board = b
        this.pendingActions = this.pendingActions.concat(actions)
        this.syncError = null
        this.persistSoon()
        void this.flushPending()
      })
    },
    async applyCombo(actorPlayerId: string, targetPlayerId: string) {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token || !auth.userId) return
        this.ensureBoard()
        const now = Date.now()
        const actions: Array<Extract<PendingAction, { type: 'apply_event' }>> = [
          { type: 'apply_event', id: `${now}_0_${Math.random().toString(16).slice(2)}`, ts: now, actorPlayerId, targetPlayerId, ball: 3 },
          { type: 'apply_event', id: `${now}_1_${Math.random().toString(16).slice(2)}`, ts: now + 1, actorPlayerId, targetPlayerId, ball: 6 },
          { type: 'apply_event', id: `${now}_2_${Math.random().toString(16).slice(2)}`, ts: now + 2, actorPlayerId, targetPlayerId, ball: 9 },
        ]
        let b = this.board!
        for (const a of actions) b = applyActionToBoard(b, a)
        this.board = b
        this.pendingActions = this.pendingActions.concat(actions)
        this.syncError = null
        this.persistSoon()
        void this.flushPending()
      })
    },
    async flushPending() {
      const auth = useAuthStore()
      if (!auth.token || !auth.userId) return
      if (!this.pendingActions.length) return
      if (flushInFlight) return flushInFlight
      flushInFlight = (async () => {
        if (!this.pendingActions.length) return
        if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
          this.syncStatus = 'offline'
          return
        }
        this.syncStatus = 'syncing'
        this.syncError = null
        const supabase = createSupabaseClient(auth.token)
        let serverBoard: Board | null = null
        while (this.pendingActions.length) {
          const action = this.pendingActions[0]!
          try {
            const rpcRes =
              action.type === 'apply_event'
                ? await supabase.rpc('apply_event', {
                    actor_player_id: action.actorPlayerId,
                    target_player_id: action.targetPlayerId,
                    ball: action.ball,
                  })
                : action.type === 'undo'
                  ? await supabase.rpc('undo')
                  : await supabase.rpc('redo')

            const { data, error } = rpcRes as { data: unknown; error: { message?: string } | null }
            if (error) throw error
            serverBoard = normalizeBoard(data as BoardPayload | null)
            this.pendingActions = this.pendingActions.slice(1)
            this.board = this.pendingActions.length ? rebaseBoard(serverBoard, this.pendingActions) : serverBoard
            this.persistSoon()
          } catch (e) {
            const anyErr = e as { message?: string }
            const msg = (anyErr?.message ?? '').toLowerCase()
            if (msg.includes('jwt') || msg.includes('token')) auth.logout()
            this.syncStatus = typeof navigator !== 'undefined' && navigator && navigator.onLine === false ? 'offline' : 'error'
            this.syncError = 'Không đồng bộ được.'
            return
          }
        }
        this.syncStatus = 'idle'
      })()
      try {
        await flushInFlight
      } finally {
        flushInFlight = null
      }
    },
    async undo() {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token || !auth.userId) return
        this.ensureBoard()
        const action: PendingAction = {
          type: 'undo',
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
        }
        this.pendingActions = this.pendingActions.concat(action)
        this.board = applyActionToBoard(this.board!, action)
        this.syncError = null
        this.persistSoon()
        void this.flushPending()
      })
    },
    async redo() {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token || !auth.userId) return
        this.ensureBoard()
        const action: PendingAction = {
          type: 'redo',
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
        }
        this.pendingActions = this.pendingActions.concat(action)
        this.board = applyActionToBoard(this.board!, action)
        this.syncError = null
        this.persistSoon()
        void this.flushPending()
      })
    },
  },
})
