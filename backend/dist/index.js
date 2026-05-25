import 'dotenv/config';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { z } from 'zod';
import { getEnv } from './env';
import { createAnonSupabase, createUserSupabase } from './supabase';
import { isValidUsername, normalizeUsername, usernameToEmail } from './username';
const env = getEnv();
const app = Fastify({ logger: true });
await app.register(cors, {
    origin: env.CORS_ORIGIN ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});
app.get('/health', async () => ({ ok: true }));
const AuthBodySchema = z.object({
    username: z.string().min(1),
    password: z.string().min(6),
});
app.post('/auth/register', async (req, reply) => {
    const body = AuthBodySchema.safeParse(req.body);
    if (!body.success)
        return reply.code(400).send({ error: 'invalid_body' });
    const username = normalizeUsername(body.data.username);
    if (!isValidUsername(username))
        return reply.code(400).send({ error: 'invalid_username' });
    const supabase = createAnonSupabase(env);
    if (!supabase)
        return reply.code(503).send({ error: 'supabase_not_configured' });
    const email = usernameToEmail(username);
    const { data, error } = await supabase.auth.signUp({
        email,
        password: body.data.password,
        options: { data: { username } },
    });
    if (error)
        return reply.code(400).send({ error: error.message });
    return reply.send({ session: data.session, user: data.user });
});
app.post('/auth/login', async (req, reply) => {
    const body = AuthBodySchema.safeParse(req.body);
    if (!body.success)
        return reply.code(400).send({ error: 'invalid_body' });
    const username = normalizeUsername(body.data.username);
    if (!isValidUsername(username))
        return reply.code(400).send({ error: 'invalid_username' });
    const supabase = createAnonSupabase(env);
    if (!supabase)
        return reply.code(503).send({ error: 'supabase_not_configured' });
    const email = usernameToEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: body.data.password });
    if (error)
        return reply.code(401).send({ error: error.message });
    return reply.send({ session: data.session, user: data.user });
});
function getBearer(req) {
    const h = req.headers['authorization'];
    if (typeof h !== 'string')
        return null;
    const m = h.match(/^Bearer (.+)$/);
    return m?.[1] ?? null;
}
app.get('/me', async (req, reply) => {
    const bearer = getBearer(req);
    if (!bearer)
        return reply.code(401).send({ error: 'missing_bearer' });
    const supabase = createUserSupabase(env, bearer);
    if (!supabase)
        return reply.code(503).send({ error: 'supabase_not_configured' });
    const userRes = await supabase.auth.getUser();
    if (userRes.error)
        return reply.code(401).send({ error: userRes.error.message });
    let boardState = null;
    const rpcRes = await supabase.rpc('get_board_state');
    if (!rpcRes.error)
        boardState = rpcRes.data;
    return reply.send({ user: userRes.data.user, board: boardState });
});
app.post('/players', async (req, reply) => {
    const bearer = getBearer(req);
    if (!bearer)
        return reply.code(401).send({ error: 'missing_bearer' });
    const supabase = createUserSupabase(env, bearer);
    if (!supabase)
        return reply.code(503).send({ error: 'supabase_not_configured' });
    const rpcRes = await supabase.rpc('create_player');
    if (rpcRes.error)
        return reply.code(400).send({ error: rpcRes.error.message });
    return reply.send({ player: rpcRes.data });
});
app.patch('/players/:id', async (req, reply) => {
    const bearer = getBearer(req);
    if (!bearer)
        return reply.code(401).send({ error: 'missing_bearer' });
    const ColorKeySchema = z.enum(['violet', 'indigo', 'cyan', 'teal', 'lime', 'yellow', 'orange', 'rose']);
    const body = z
        .object({
        name: z.string().min(1).max(24).optional(),
        colorKey: ColorKeySchema.optional(),
        avatarUrl: z.string().min(1).nullable().optional(),
    })
        .refine((v) => v.name !== undefined || v.colorKey !== undefined || v.avatarUrl !== undefined, {
        message: 'empty_patch',
    })
        .safeParse(req.body);
    if (!body.success)
        return reply.code(400).send({ error: 'invalid_body' });
    const supabase = createUserSupabase(env, bearer);
    if (!supabase)
        return reply.code(503).send({ error: 'supabase_not_configured' });
    const playerId = z.string().uuid().safeParse(req.params.id);
    if (!playerId.success)
        return reply.code(400).send({ error: 'invalid_player_id' });
    const patch = {};
    if (body.data.name !== undefined)
        patch.name = body.data.name;
    if (body.data.colorKey !== undefined)
        patch.color_key = body.data.colorKey;
    if (body.data.avatarUrl !== undefined)
        patch.avatar_url = body.data.avatarUrl;
    const { error } = await supabase.from('players').update(patch).eq('id', playerId.data).is('deleted_at', null);
    if (error)
        return reply.code(400).send({ error: error.message });
    return reply.send({ ok: true });
});
app.delete('/players/:id', async (req, reply) => {
    const bearer = getBearer(req);
    if (!bearer)
        return reply.code(401).send({ error: 'missing_bearer' });
    const supabase = createUserSupabase(env, bearer);
    if (!supabase)
        return reply.code(503).send({ error: 'supabase_not_configured' });
    const playerId = z.string().uuid().safeParse(req.params.id);
    if (!playerId.success)
        return reply.code(400).send({ error: 'invalid_player_id' });
    const rpcRes = await supabase.rpc('delete_player', { p_player_id: playerId.data });
    if (rpcRes.error)
        return reply.code(400).send({ error: rpcRes.error.message });
    return reply.send({ board: rpcRes.data });
});
app.post('/events', async (req, reply) => {
    const bearer = getBearer(req);
    if (!bearer)
        return reply.code(401).send({ error: 'missing_bearer' });
    const body = z
        .object({
        actorPlayerId: z.string().uuid(),
        targetPlayerId: z.string().uuid(),
        ball: z.union([z.literal(3), z.literal(6), z.literal(9)]),
    })
        .safeParse(req.body);
    if (!body.success)
        return reply.code(400).send({ error: 'invalid_body' });
    const supabase = createUserSupabase(env, bearer);
    if (!supabase)
        return reply.code(503).send({ error: 'supabase_not_configured' });
    const rpcRes = await supabase.rpc('apply_event', {
        actor_player_id: body.data.actorPlayerId,
        target_player_id: body.data.targetPlayerId,
        ball: body.data.ball,
    });
    if (rpcRes.error)
        return reply.code(400).send({ error: rpcRes.error.message });
    return reply.send({ board: rpcRes.data });
});
app.post('/undo', async (req, reply) => {
    const bearer = getBearer(req);
    if (!bearer)
        return reply.code(401).send({ error: 'missing_bearer' });
    const supabase = createUserSupabase(env, bearer);
    if (!supabase)
        return reply.code(503).send({ error: 'supabase_not_configured' });
    const rpcRes = await supabase.rpc('undo');
    if (rpcRes.error)
        return reply.code(400).send({ error: rpcRes.error.message });
    return reply.send({ board: rpcRes.data });
});
app.post('/redo', async (req, reply) => {
    const bearer = getBearer(req);
    if (!bearer)
        return reply.code(401).send({ error: 'missing_bearer' });
    const supabase = createUserSupabase(env, bearer);
    if (!supabase)
        return reply.code(503).send({ error: 'supabase_not_configured' });
    const rpcRes = await supabase.rpc('redo');
    if (rpcRes.error)
        return reply.code(400).send({ error: rpcRes.error.message });
    return reply.send({ board: rpcRes.data });
});
app.listen({ port: env.PORT, host: '0.0.0.0' });
