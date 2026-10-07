/* eslint @typescript-eslint/no-require-imports: "off" -- CommonJS loader deliberately transpiles and mocks server modules. */
/*
 * Offline integration tests. Run with Node's built-in test runner:
 *   node --test --test-isolation=none scripts/test-whatsapp.cjs
 * Or set WHATSAPP_TEST_REPO to test a checkout from outside its scripts folder.
 * No Next server, network, database, .env loading, or persistent fixture writes.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const repo = path.resolve(process.env.WHATSAPP_TEST_REPO || path.join(__dirname, '..'));
const repoRequire = createRequire(path.join(repo, 'package.json'));
const ts = repoRequire('typescript');

// Transpile the real TypeScript in memory. Each loader has isolated modules/env.
// Every fetch is supplied by a test; accidental network calls fail immediately.
function sourceLoader({ mocks = {}, env = {}, fetch, logs = [] } = {}) {
  const cache = new Map();
  const context = vm.createContext({
    process: { env: { ...env } },
    console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args), log: () => {} },
    fetch: fetch || (async () => { throw new Error('Unexpected network call in an offline test'); }),
    Request, Response, Headers, FormData, File, Blob, AbortSignal, Buffer, URL,
    TextEncoder, TextDecoder, setTimeout, clearTimeout
  });
  function load(file) {
    let absolute = path.isAbsolute(file) ? file : path.join(repo, file);
    if (!path.extname(absolute)) absolute += '.ts';
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const compiledModule = { exports: {} };
    cache.set(absolute, compiledModule);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      fileName: absolute,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    }).outputText;
    function localRequire(name) {
      if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name];
      if (name === 'server-only') return {};
      if (name.startsWith('@/')) return load(name.slice(2));
      if (name.startsWith('.')) return load(path.resolve(path.dirname(absolute), name));
      return repoRequire(name);
    }
    const factory = vm.runInContext(`(function(require,module,exports,__filename,__dirname){\n${code}\n})`, context, { filename: absolute });
    factory(localRequire, compiledModule, compiledModule.exports, absolute, path.dirname(absolute));
    return compiledModule.exports;
  }
  return load;
}

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const bookingId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const validBooking = (overrides = {}) => ({
  id: bookingId, booking_reference: 'TLC-2099-ABC123', full_name: 'Test Client',
  phone: '03001234567', email: 'client@example.test', case_category: 'Not sure yet',
  preferred_date: '2099-01-15', preferred_time: 'Morning (9 am–12 pm)',
  preferred_contact_method: 'Office Visit', message: 'General consultation request',
  whatsapp_opt_in: true, status: 'Pending', internal_notes: '',
  appointment_date: '2099-01-16', appointment_time: '10:30', appointment_location: 'Office',
  admin_whatsapp_status: 'sent', client_whatsapp_status: 'not_requested', ...overrides
});
const publicValues = (overrides = {}) => {
  const row = validBooking(overrides);
  return Object.fromEntries(['full_name', 'phone', 'email', 'case_category', 'preferred_date', 'preferred_time', 'preferred_contact_method', 'message', 'whatsapp_opt_in'].map((key) => [key, row[key]]));
};
const jsonRequest = (body, method = 'PATCH') => new Request('https://example.test/api/admin/consultations', {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});
const formRequest = (values) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== null) form.set(key, String(value));
  return new Request('https://example.test/api/consultations', { method: 'POST', body: form });
};

// Minimal behavioral database mock. Conditions are checked at mutation time,
// so the concurrency test catches a missing compare-and-set status condition.
function database({ rows = [validBooking()], insertError = null, statusWriteError = null, synchronizeReads = false } = {}) {
  const tables = { consultations: clone(rows), services: [], consultation_documents: [] };
  const mutations = [];
  let readCount = 0;
  let releaseRead;
  const bothRead = synchronizeReads ? new Promise((resolve) => { releaseRead = resolve; }) : null;
  class Query {
    constructor(table) { this.table = table; this.action = 'select'; this.filters = []; this.payload = null; this.executed = null; }
    select() { return this; }
    order() { return this; }
    limit() { return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    is(key, value) { this.filters.push([key, value]); return this; }
    update(payload) { this.action = 'update'; this.payload = payload; return this; }
    insert(payload) { this.action = 'insert'; this.payload = payload; return this; }
    delete() { this.action = 'delete'; return this; }
    single() { return this.execute('single'); }
    maybeSingle() { return this.execute('maybeSingle'); }
    then(resolve, reject) { return this.execute().then(resolve, reject); }
    execute(mode) {
      if (this.executed) return this.executed;
      this.executed = this.run(mode);
      return this.executed;
    }
    async run(mode) {
      const list = tables[this.table] || [];
      const matches = (row) => this.filters.every(([key, value]) => row[key] === value);
      let selected = list.filter(matches);
      if (this.action === 'select') {
        const snapshot = clone(selected);
        if (bothRead && this.table === 'consultations' && mode && this.filters.some(([key]) => key === 'id')) {
          readCount += 1;
          if (readCount >= 2) releaseRead();
          await bothRead;
        }
        return { data: mode ? snapshot[0] || null : snapshot, error: null };
      }
      if (this.action === 'insert') {
        mutations.push({ table: this.table, action: this.action, payload: clone(this.payload) });
        if (insertError && this.table === 'consultations') return { data: null, error: insertError };
        const incoming = Array.isArray(this.payload) ? this.payload : [this.payload];
        const created = incoming.map((row) => ({
          id: bookingId, created_at: '2099-01-01T00:00:00Z',
          appointment_date: null, appointment_time: null, appointment_location: null,
          admin_whatsapp_status: 'not_configured', client_whatsapp_status: 'not_requested', ...clone(row)
        }));
        list.push(...created);
        return { data: mode ? clone(created[0]) : clone(created), error: null };
      }
      if (statusWriteError && Object.keys(this.payload || {}).some((key) => key.endsWith('_whatsapp_status'))) return { data: null, error: statusWriteError };
      mutations.push({ table: this.table, action: this.action, payload: clone(this.payload), filters: clone(this.filters) });
      if (this.action === 'update') for (const row of selected) Object.assign(row, clone(this.payload));
      if (this.action === 'delete') tables[this.table] = list.filter((row) => !matches(row));
      const error = mode === 'single' && selected.length !== 1 ? { code: 'PGRST116', message: 'No matching row' } : null;
      return { data: mode ? clone(selected[0]) || null : clone(selected), error };
    }
  }
  return {
    tables, mutations,
    client: {
      from: (table) => new Query(table),
      storage: { from: () => ({ upload: async () => ({ error: null }), remove: async () => ({ error: null }) }) }
    }
  };
}

function notificationMocks({ result = 'sent', onSend } = {}) {
  const calls = [];
  const send = (kind) => async (booking) => { calls.push({ kind, booking: clone(booking) }); return onSend ? onSend(kind, booking, calls.length) : { status: result }; };
  return { calls, exports: { ...sourceLoader()('lib/whatsapp.ts'),
    sendAdminBookingNotification: send('admin'), sendClientConfirmation: send('confirmation'), sendClientCancellation: send('cancellation')
  } };
}
function adminHarness({ rows, result, onSend, authResponse, ...dbOptions } = {}) {
  const db = database({ rows, ...dbOptions });
  const notifications = notificationMocks({ result, onSend });
  const load = sourceLoader({ mocks: {
    '@/lib/admin-auth': { requireAdminApi: async () => authResponse ? { response: authResponse } : { supabase: db.client, user: { id: 'admin' } } },
    '@/lib/whatsapp': notifications.exports
  } });
  return { route: load('app/api/admin/consultations/route.ts'), db, calls: notifications.calls };
}
function publicHarness({ result = 'sent', ...dbOptions } = {}) {
  const db = database({ rows: [], ...dbOptions });
  const notifications = notificationMocks({ result });
  const load = sourceLoader({ mocks: {
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => db.client },
    '@/lib/rate-limit': { allowSubmission: () => true },
    '@/lib/notify': { sendAdminEmail: async () => ({ sent: true }) },
    '@/lib/whatsapp': notifications.exports
  } });
  return { route: load('app/api/consultations/route.ts'), db, calls: notifications.calls };
}

test('phone normalization accepts common Pakistan and explicit international formats', () => {
  const { normalizePakistaniPhoneNumber: normalize } = sourceLoader()('lib/phone.ts');
  for (const input of ['03001234567', '3001234567', '+92 300 1234567', '0092-300-1234567', '923001234567']) assert.equal(normalize(input), '923001234567', input);
  assert.equal(normalize('+1 (202) 555-0123'), '12025550123');
});
test('phone normalization rejects malformed consent recipients', () => {
  const { normalizePakistaniPhoneNumber: normalize } = sourceLoader()('lib/phone.ts');
  for (const input of ['', '0300123', '+92 300 12345', '0300ABC1234567', '+1', '123456789', '+0123456789']) assert.equal(normalize(input), null, input);
});
test('WhatsApp exports the shared phone normalizer', () => {
  const load = sourceLoader();
  assert.equal(load('lib/whatsapp.ts').normalizePakistaniPhoneNumber, load('lib/phone.ts').normalizePakistaniPhoneNumber);
});
test('public consent omission remains distinguishable from explicit opt-out and checked HTML consent', () => {
  const { consultationSchema } = sourceLoader()('lib/validation.ts');
  const absent = publicValues({ whatsapp_opt_in: undefined });
  delete absent.whatsapp_opt_in;
  assert.equal(consultationSchema.parse(absent).whatsapp_opt_in, undefined);
  assert.equal(consultationSchema.parse(publicValues({ whatsapp_opt_in: 'on' })).whatsapp_opt_in, true);
});
test('consent false stays false; invalid WhatsApp phone is rejected only for opted-in updates', () => {
  const { consultationSchema } = sourceLoader()('lib/validation.ts');
  assert.equal(consultationSchema.parse(publicValues({ whatsapp_opt_in: 'false' })).whatsapp_opt_in, false);
  assert.equal(consultationSchema.safeParse(publicValues({ phone: 'not a phone', whatsapp_opt_in: true })).success, false);
  assert.equal(consultationSchema.safeParse(publicValues({ phone: 'not a phone', whatsapp_opt_in: false })).success, true);
});

const metaEnv = {
  WHATSAPP_ACCESS_TOKEN: 'dummy-offline-token', WHATSAPP_PHONE_NUMBER_ID: '123456', WHATSAPP_GRAPH_API_VERSION: 'v99.0',
  ADMIN_WHATSAPP: '03001234567', WHATSAPP_TEMPLATE_LANGUAGE: 'en_US', WHATSAPP_TEMPLATE_ADMIN_BOOKING: 'admin_booking',
  WHATSAPP_TEMPLATE_CLIENT_CONFIRMATION: 'client_confirmation', WHATSAPP_TEMPLATE_CLIENT_CANCELLATION: 'client_cancellation'
};
function whatsappHarness({ env = metaEnv, response, reject } = {}) {
  const calls = [], logs = [];
  const load = sourceLoader({ env, logs, fetch: async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    if (reject) throw reject;
    return response || Response.json({ messages: [{ id: 'offline-message-id' }] });
  } });
  return { whatsapp: load('lib/whatsapp.ts'), calls, logs };
}
test('office notification sends approved template to normalized office recipient in the documented order', async () => {
  const h = whatsappHarness();
  const result = await h.whatsapp.sendAdminBookingNotification(validBooking());
  assert.equal(result.status, 'sent');
  assert.equal(h.calls.length, 1);
  const request = h.calls[0];
  assert.equal(request.url, 'https://graph.facebook.com/v99.0/123456/messages');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.body.to, '923001234567');
  assert.equal(request.body.type, 'template');
  assert.equal(request.body.template.name, 'admin_booking');
  assert.equal(request.body.template.language.code, 'en_US');
  assert.deepEqual(request.body.template.components[0].parameters.map((p) => p.text), [
    'TLC-2099-ABC123', 'Test Client', '03001234567', 'client@example.test', 'Not sure yet',
    '2099-01-15', 'Morning (9 am–12 pm)', 'Office Visit', 'General consultation request'
  ]);
});
test('client confirmation uses the actual appointment while retaining the five-parameter template', async () => {
  const h = whatsappHarness();
  await h.whatsapp.sendClientConfirmation(validBooking());
  const template = h.calls[0].body.template;
  assert.equal(template.name, 'client_confirmation');
  const parameters = template.components[0].parameters.map((p) => p.text);
  assert.equal(parameters.length, 5);
  assert.deepEqual(parameters.slice(0, 4), ['TLC-2099-ABC123', 'Confirmed', '2099-01-16', '10:30 PKT']);
  assert.match(parameters[4], /The Law Consulate \(SKB\)/);
  assert.match(parameters[4], /Office Visit/);
  assert.match(parameters[4], /Office/);
});
test('legacy client template falls back to requested date/time when appointment details are absent', async () => {
  const h = whatsappHarness();
  await h.whatsapp.sendClientConfirmation(validBooking({ appointment_date: null, appointment_time: null }));
  const parameters = h.calls[0].body.template.components[0].parameters.map((p) => p.text);
  assert.equal(parameters[2], '2099-01-15');
  assert.equal(parameters[3], 'Morning (9 am–12 pm)');
});
test('missing template or credentials marks notification not configured without fetch', async () => {
  for (const missing of ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_GRAPH_API_VERSION', 'WHATSAPP_TEMPLATE_ADMIN_BOOKING']) {
    const env = { ...metaEnv }; delete env[missing];
    const h = whatsappHarness({ env });
    assert.equal((await h.whatsapp.sendAdminBookingNotification(validBooking())).status, 'not_configured', missing);
    assert.equal(h.calls.length, 0, missing);
  }
});
test('invalid Meta configuration or recipient fails without an outgoing request', async () => {
  for (const options of [
    { env: { ...metaEnv, WHATSAPP_GRAPH_API_VERSION: 'latest' } },
    { env: { ...metaEnv, WHATSAPP_PHONE_NUMBER_ID: 'invalid-id' } },
    { recipient: '+92 300 12345' }
  ]) {
    const h = whatsappHarness(options);
    assert.equal((await h.whatsapp.sendClientConfirmation(validBooking({ phone: options.recipient || '03001234567' }))).status, 'failed');
    assert.equal(h.calls.length, 0);
  }
});
test('Meta rejection or timeout produces failed and sanitized logs', async () => {
  for (const options of [
    { response: Response.json({ error: { code: 131000, message: 'DO NOT LOG client@example.test dummy-offline-token' } }, { status: 400 }) },
    { reject: Object.assign(new Error('DO NOT LOG client@example.test dummy-offline-token'), { name: 'TimeoutError' }) }
  ]) {
    const h = whatsappHarness(options);
    assert.equal((await h.whatsapp.sendClientConfirmation(validBooking())).status, 'failed');
    const logs = JSON.stringify(h.logs);
    assert.ok(!logs.includes('dummy-offline-token'));
    assert.ok(!logs.includes('client@example.test'));
    assert.ok(!logs.includes('DO NOT LOG'));
  }
});

test('public booking persists consent and alerts the office without premature client confirmation', async () => {
  const h = publicHarness();
  const response = await h.route.POST(formRequest(publicValues()));
  assert.equal(response.status, 201);
  assert.equal(h.db.tables.consultations.length, 1);
  assert.equal(h.db.tables.consultations[0].whatsapp_opt_in, true);
  assert.equal(h.db.tables.consultations[0].status, 'Pending');
  assert.deepEqual(h.calls.map((call) => call.kind), ['admin']);
  assert.equal(h.db.tables.consultations[0].admin_whatsapp_status, 'sent');
});
test('a failed public booking insert sends no notification', async () => {
  const h = publicHarness({ insertError: { code: 'TEST_FAILURE', message: 'offline insert failed' } });
  const response = await h.route.POST(formRequest(publicValues()));
  assert.equal(response.status, 500);
  assert.equal(h.calls.length, 0);
});
test('new and cached public forms preserve explicit opt-out and store omitted modern consent as false', async () => {
  for (const [method, consent, expected] of [
    ['Office Visit', undefined, false], ['WhatsApp', undefined, true], ['WhatsApp', false, false]
  ]) {
    const h = publicHarness();
    const values = publicValues({ preferred_contact_method: method, whatsapp_opt_in: consent });
    if (consent === undefined) delete values.whatsapp_opt_in;
    const response = await h.route.POST(formRequest(values));
    assert.equal(response.status, 201);
    assert.equal(h.db.tables.consultations[0].whatsapp_opt_in, expected);
    assert.deepEqual(h.calls.map((call) => call.kind), ['admin']);
  }
});
test('failed office notification leaves a public booking saved with a failed status', async () => {
  const h = publicHarness({ result: 'failed' });
  const response = await h.route.POST(formRequest(publicValues()));
  assert.equal(response.status, 201);
  assert.equal(h.db.tables.consultations[0].status, 'Pending');
  assert.equal(h.db.tables.consultations[0].admin_whatsapp_status, 'failed');
});
test('an opted-in client booking with invalid recipient is rejected before database writes', async () => {
  const h = publicHarness();
  const response = await h.route.POST(formRequest(publicValues({ phone: '+92 300 12345' })));
  assert.equal(response.status, 400);
  assert.equal(h.db.mutations.length, 0);
  assert.equal(h.calls.length, 0);
});
test('admin confirmation sends exactly once to an opted-in Office Visit client and records status', async () => {
  const h = adminHarness();
  const response = await h.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' }));
  assert.equal(response.status, 200);
  assert.equal(h.db.tables.consultations[0].status, 'Confirmed');
  assert.equal(h.db.tables.consultations[0].client_whatsapp_status, 'sent');
  assert.deepEqual(h.calls.map((call) => call.kind), ['confirmation']);
});
test('confirmation without a booked date and exact time is rejected without notifications', async () => {
  const h = adminHarness({ rows: [validBooking({ appointment_date: null, appointment_time: null })] });
  const response = await h.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' }));
  assert.equal(response.status, 400);
  assert.equal(h.db.tables.consultations[0].status, 'Pending');
  assert.equal(h.calls.length, 0);
});
test('admin can set actual appointment details as part of confirmation', async () => {
  const h = adminHarness({ rows: [validBooking({ appointment_date: null, appointment_time: null })] });
  const response = await h.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed', appointment_date: '2099-02-20', appointment_time: '14:45', appointment_location: 'Office' }));
  assert.equal(response.status, 200);
  assert.equal(h.calls[0].booking.appointment_date, '2099-02-20');
  assert.equal(h.calls[0].booking.appointment_time, '14:45');
});
test('client without consent is not contacted, while legacy WhatsApp consent remains eligible', async () => {
  const without = adminHarness({ rows: [validBooking({ whatsapp_opt_in: false })] });
  const response = await without.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' }));
  assert.equal(response.status, 200);
  assert.equal(without.calls.length, 0);
  assert.equal(without.db.tables.consultations[0].client_whatsapp_status, 'not_requested');
  const legacy = adminHarness({ rows: [validBooking({ whatsapp_opt_in: undefined, preferred_contact_method: 'WhatsApp' })] });
  assert.equal((await legacy.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' }))).status, 200);
  assert.equal(legacy.calls.length, 1);
});
test('explicit opt-out overrides a legacy WhatsApp preference', async () => {
  const h = adminHarness({ rows: [validBooking({ whatsapp_opt_in: false, preferred_contact_method: 'WhatsApp' })] });
  assert.equal((await h.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' }))).status, 200);
  assert.equal(h.calls.length, 0);
  assert.equal(h.db.tables.consultations[0].client_whatsapp_status, 'not_requested');
});
test('notes-only and repeated Confirmed updates do not send another client message', async () => {
  const h = adminHarness({ rows: [validBooking({ status: 'Confirmed', client_whatsapp_status: 'sent' })] });
  assert.equal((await h.route.PATCH(jsonRequest({ id: bookingId, internal_notes: 'Reviewed by office' }))).status, 200);
  assert.equal((await h.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' }))).status, 200);
  assert.equal(h.calls.length, 0);
  assert.equal(h.db.tables.consultations[0].internal_notes, 'Reviewed by office');
});
test('rescheduling a confirmed appointment sends the new agreed date and time', async () => {
  const h = adminHarness({ rows: [validBooking({ status: 'Confirmed', client_whatsapp_status: 'sent' })] });
  const response = await h.route.PATCH(jsonRequest({ id: bookingId, appointment_date: '2099-03-10', appointment_time: '15:00' }));
  assert.equal(response.status, 200);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].booking.appointment_date, '2099-03-10');
  assert.equal(h.calls[0].booking.appointment_time, '15:00');
});
test('late confirmation results preserve the notification result of a newer appointment', async () => {
  let finishFirst;
  let signalStarted;
  const firstResult = new Promise((resolve) => { finishFirst = resolve; });
  const started = new Promise((resolve) => { signalStarted = resolve; });
  const h = adminHarness({ onSend: (kind, booking, count) => {
    assert.equal(kind, 'confirmation');
    if (count === 1) { signalStarted(); return firstResult; }
    return { status: 'failed' };
  } });
  const first = h.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' }));
  await started;
  assert.equal((await h.route.PATCH(jsonRequest({ id: bookingId, appointment_date: '2099-03-10', appointment_time: '15:00' }))).status, 200);
  finishFirst({ status: 'sent' });
  assert.equal((await first).status, 200);
  assert.equal(h.db.tables.consultations[0].appointment_date, '2099-03-10');
  assert.equal(h.db.tables.consultations[0].appointment_time, '15:00');
  assert.equal(h.db.tables.consultations[0].client_whatsapp_status, 'failed');
});
test('late confirmation results preserve a subsequent WhatsApp opt-out', async () => {
  let finishFirst;
  let signalStarted;
  const firstResult = new Promise((resolve) => { finishFirst = resolve; });
  const started = new Promise((resolve) => { signalStarted = resolve; });
  const h = adminHarness({ onSend: () => { signalStarted(); return firstResult; } });
  const first = h.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' }));
  await started;
  assert.equal((await h.route.PATCH(jsonRequest({ id: bookingId, whatsapp_opt_in: false }))).status, 200);
  finishFirst({ status: 'sent' });
  assert.equal((await first).status, 200);
  assert.equal(h.db.tables.consultations[0].whatsapp_opt_in, false);
  assert.equal(h.db.tables.consultations[0].client_whatsapp_status, 'not_requested');
});
test('withdrawing WhatsApp consent saves the opt-out without sending a message', async () => {
  const h = adminHarness({ rows: [validBooking({ status: 'Confirmed', client_whatsapp_status: 'sent', whatsapp_opt_in_at: '2099-01-01T00:00:00Z' })] });
  const response = await h.route.PATCH(jsonRequest({ id: bookingId, whatsapp_opt_in: false }));
  assert.equal(response.status, 200);
  assert.equal(h.calls.length, 0);
  assert.equal(h.db.tables.consultations[0].whatsapp_opt_in, false);
  assert.equal(h.db.tables.consultations[0].whatsapp_opt_in_at, null);
  assert.equal(h.db.tables.consultations[0].client_whatsapp_status, 'not_requested');
});
test('concurrent confirmations have one winner and send one client message', async () => {
  const h = adminHarness({ synchronizeReads: true });
  const responses = await Promise.all([
    h.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' })),
    h.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' }))
  ]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
  assert.equal(h.calls.length, 1);
});
test('Meta failure preserves the confirmed appointment and its failed notification status', async () => {
  const h = adminHarness({ result: 'failed' });
  const response = await h.route.PATCH(jsonRequest({ id: bookingId, status: 'Confirmed' }));
  assert.equal(response.status, 200);
  assert.equal(h.db.tables.consultations[0].status, 'Confirmed');
  assert.equal(h.db.tables.consultations[0].client_whatsapp_status, 'failed');
});
test('client retry sends a failed confirmation without changing the appointment status', async () => {
  const h = adminHarness({ rows: [validBooking({ status: 'Confirmed', client_whatsapp_status: 'failed' })] });
  const response = await h.route.PATCH(jsonRequest({ id: bookingId, retry_whatsapp: 'client' }));
  assert.equal(response.status, 200);
  assert.equal(h.db.tables.consultations[0].status, 'Confirmed');
  assert.equal(h.db.tables.consultations[0].client_whatsapp_status, 'sent');
  assert.deepEqual(h.calls.map((call) => call.kind), ['confirmation']);
});
test('office retry resends a failed booking alert without client notification', async () => {
  const h = adminHarness({ rows: [validBooking({ admin_whatsapp_status: 'failed' })] });
  const response = await h.route.PATCH(jsonRequest({ id: bookingId, retry_whatsapp: 'admin' }));
  assert.equal(response.status, 200);
  assert.equal(h.db.tables.consultations[0].status, 'Pending');
  assert.equal(h.db.tables.consultations[0].admin_whatsapp_status, 'sent');
  assert.deepEqual(h.calls.map((call) => call.kind), ['admin']);
});
test('two simultaneous client retries claim a failed notification once', async () => {
  const h = adminHarness({ rows: [validBooking({ status: 'Confirmed', client_whatsapp_status: 'failed' })], synchronizeReads: true });
  const responses = await Promise.all([
    h.route.PATCH(jsonRequest({ id: bookingId, retry_whatsapp: 'client' })),
    h.route.PATCH(jsonRequest({ id: bookingId, retry_whatsapp: 'client' }))
  ]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
  assert.equal(h.calls.length, 1);
});
test('sent and pending notifications cannot be explicitly resent', async () => {
  for (const clientStatus of ['sent', 'pending']) {
    const h = adminHarness({ rows: [validBooking({ status: 'Confirmed', client_whatsapp_status: clientStatus })] });
    const response = await h.route.PATCH(jsonRequest({ id: bookingId, retry_whatsapp: 'client' }));
    assert.equal(response.status, 409, clientStatus);
    assert.equal(h.calls.length, 0, clientStatus);
  }
});
test('client retry respects lack of consent', async () => {
  const h = adminHarness({ rows: [validBooking({ status: 'Confirmed', whatsapp_opt_in: false, client_whatsapp_status: 'not_requested' })] });
  const response = await h.route.PATCH(jsonRequest({ id: bookingId, retry_whatsapp: 'client' }));
  assert.ok(response.status === 200 || response.status === 400);
  assert.equal(h.calls.length, 0);
  assert.equal(h.db.tables.consultations[0].client_whatsapp_status, 'not_requested');
});
test('explicit retry cannot be mixed with appointment changes', async () => {
  const h = adminHarness({ rows: [validBooking({ client_whatsapp_status: 'failed' })] });
  const response = await h.route.PATCH(jsonRequest({ id: bookingId, retry_whatsapp: 'client', status: 'Confirmed' }));
  assert.equal(response.status, 400);
  assert.equal(h.calls.length, 0);
  assert.equal(h.db.tables.consultations[0].status, 'Pending');
});
test('cancellation notifies an opted-in client once', async () => {
  const h = adminHarness({ rows: [validBooking({ status: 'Confirmed' })] });
  assert.equal((await h.route.PATCH(jsonRequest({ id: bookingId, status: 'Cancelled' }))).status, 200);
  assert.deepEqual(h.calls.map((call) => call.kind), ['cancellation']);
});
test('admin-created appointment is confirmed and notifies an opted-in client', async () => {
  const h = adminHarness({ rows: [] });
  const response = await h.route.POST(jsonRequest({ ...publicValues(), appointment_date: '2099-01-16', appointment_time: '10:30', appointment_location: 'Office' }, 'POST'));
  assert.equal(response.status, 201);
  assert.equal(h.db.tables.consultations.length, 1);
  assert.equal(h.db.tables.consultations[0].status, 'Confirmed');
  assert.equal(h.db.tables.consultations[0].appointment_time, '10:30');
  assert.equal(h.calls.filter((call) => call.kind === 'confirmation').length, 1);
});
test('admin-created appointment without consent is saved without client notification', async () => {
  const h = adminHarness({ rows: [] });
  const response = await h.route.POST(jsonRequest({ ...publicValues({ whatsapp_opt_in: false }), appointment_date: '2099-01-16', appointment_time: '10:30', appointment_location: 'Office' }, 'POST'));
  assert.equal(response.status, 201);
  assert.equal(h.db.tables.consultations[0].status, 'Confirmed');
  assert.equal(h.calls.filter((call) => call.kind === 'confirmation').length, 0);
});
test('admin creation rejects malformed appointment and does not notify', async () => {
  const h = adminHarness({ rows: [] });
  const response = await h.route.POST(jsonRequest({ ...publicValues(), appointment_date: '2099-02-30', appointment_time: '27:99' }, 'POST'));
  assert.equal(response.status, 400);
  assert.equal(h.db.mutations.length, 0);
  assert.equal(h.calls.length, 0);
});
test('admin creation preserves explicit opt-out even with a legacy WhatsApp preference', async () => {
  const h = adminHarness({ rows: [] });
  const response = await h.route.POST(jsonRequest({ ...publicValues({ whatsapp_opt_in: false, preferred_contact_method: 'WhatsApp' }), appointment_date: '2099-01-16', appointment_time: '10:30' }, 'POST'));
  assert.equal(response.status, 201);
  assert.equal(h.db.tables.consultations[0].whatsapp_opt_in, false);
  assert.equal(h.calls.length, 0);
});
test('failed admin-created appointment insert sends no notification', async () => {
  const h = adminHarness({ rows: [], insertError: { code: 'TEST_FAILURE', message: 'offline insert failed' } });
  const response = await h.route.POST(jsonRequest({ ...publicValues(), appointment_date: '2099-01-16', appointment_time: '10:30' }, 'POST'));
  assert.equal(response.status, 500);
  assert.equal(h.calls.length, 0);
});
test('admin creation and retry require authentication before database work', async () => {
  for (const method of ['POST', 'PATCH']) {
    const h = adminHarness({ authResponse: Response.json({ error: 'Sign in' }, { status: 401 }) });
    const response = await h.route[method](jsonRequest({ id: bookingId, retry_whatsapp: 'admin' }, method));
    assert.equal(response.status, 401);
    assert.equal(h.db.mutations.length, 0);
    assert.equal(h.calls.length, 0);
  }
});
