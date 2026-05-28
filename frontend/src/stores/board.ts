import { defineStore } from 'pinia'
import { http, type HttpError } from '../api/http'
import { getApiBaseUrl } from '../api/config'
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

let refreshInFlight: Promise<void> | null = null
let mutateChain: Promise<unknown> = Promise.resolve()

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
  }),
  getters: {
    cursorSeq: (state) => state.board?.cursor ?? 0,
    activePlayers: (state) => state.board?.players ?? [],
    canAddPlayer: (state) => (state.board?.players?.length ?? 0) < 4,
    canRedo: (state) => {
      const cursor = state.board?.cursor ?? 0
      return (state.board?.history ?? []).some((e) => !e.isDeleted && e.seq > cursor)
    },
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
        return
      }
      if (refreshInFlight) return refreshInFlight
      refreshInFlight = (async () => {
        const baseUrl = getApiBaseUrl()
        this.loading = true
        this.error = null
        try {
          const res = await http<{ board: BoardPayload | null }>('/me', { baseUrl, token: auth.token })
          this.board = normalizeBoard(res.board)
        } catch (e) {
          const err = e as HttpError
          if (err?.status === 401) auth.logout()
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
        const baseUrl = getApiBaseUrl()
        type DbPlayer = {
          id: string
          name: string
          sort_order: number
          color_key: PlayerColorKey
          avatar_url: string | null
          deleted_at: string | null
        }
        const res = await http<{ player: DbPlayer }>('/players', { baseUrl, token: auth.token, method: 'POST' })
        if (!res.player || res.player.deleted_at) return
        this.ensureBoard()
        const next: Player = {
          id: res.player.id,
          name: res.player.name,
          sortOrder: res.player.sort_order,
          colorKey: res.player.color_key,
          avatarUrl: res.player.avatar_url,
          score: 0,
        }
        this.board!.players = this.board!.players
          .concat(next)
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
      })
    },
    async patchPlayer(
      playerId: string,
      patch: { name?: string; colorKey?: PlayerColorKey; avatarUrl?: string | null },
    ) {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token) return
        const baseUrl = getApiBaseUrl()
        this.ensureBoard()
        const before = this.board!.players.find((p) => p.id === playerId) ?? null
        if (before) {
          const optimistic: Partial<Player> = {}
          if (patch.name !== undefined) optimistic.name = patch.name
          if (patch.colorKey !== undefined) optimistic.colorKey = patch.colorKey
          if (patch.avatarUrl !== undefined) optimistic.avatarUrl = patch.avatarUrl
          this.updateLocalPlayer(playerId, optimistic)
        }
        try {
          await http(`/players/${playerId}`, { baseUrl, token: auth.token, method: 'PATCH', body: patch })
        } catch (e) {
          if (before) this.updateLocalPlayer(playerId, before)
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
    },
    async deletePlayer(playerId: string) {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token) return
        const baseUrl = getApiBaseUrl()
        const res = await http<{ board: BoardPayload | null }>(`/players/${playerId}`, {
          baseUrl,
          token: auth.token,
          method: 'DELETE',
        })
        this.board = normalizeBoard(res.board)
      })
    },
    async applyEvent(actorPlayerId: string, targetPlayerId: string, ball: Ball) {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token) return
        const baseUrl = getApiBaseUrl()
        const res = await http<{ board: BoardPayload | null }>('/events', {
          baseUrl,
          token: auth.token,
          method: 'POST',
          body: { actorPlayerId, targetPlayerId, ball },
        })
        this.board = normalizeBoard(res.board)
      })
    },
    async undo() {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token) return
        const baseUrl = getApiBaseUrl()
        const res = await http<{ board: BoardPayload | null }>('/undo', {
          baseUrl,
          token: auth.token,
          method: 'POST',
        })
        this.board = normalizeBoard(res.board)
      })
    },
    async redo() {
      return enqueue(async () => {
        const auth = useAuthStore()
        if (!auth.token) return
        const baseUrl = getApiBaseUrl()
        const res = await http<{ board: BoardPayload | null }>('/redo', {
          baseUrl,
          token: auth.token,
          method: 'POST',
        })
        this.board = normalizeBoard(res.board)
      })
    },
  },
})
